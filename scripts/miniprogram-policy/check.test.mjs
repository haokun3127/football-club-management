import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { formatReport, runPolicyCheck } from "./check.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const rulesPath = path.join(scriptDir, "rules.json");
const specRoot = path.join(repoRoot, ".trellis/spec/miniprogram/frontend");

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "miniprogram-policy-"));
  writeJson(path.join(root, "project.config.json"), {
    appid: "fixture",
    projectname: "fixture",
    compileType: "miniprogram",
    libVersion: "3.17.3",
    miniprogramRoot: "./",
    setting: { urlCheck: false },
    packOptions: { ignore: [], include: [] }
  });
  writeJson(path.join(root, "app.json"), {
    pages: ["pages/demo/index"],
    window: {},
    sitemapLocation: "sitemap.json"
  });
  writeJson(path.join(root, "sitemap.json"), { rules: [] });
  writeJson(path.join(root, "pages/demo/index.json"), {});
  fs.writeFileSync(path.join(root, "pages/demo/index.ts"), [
    "Page({",
    "  onLoad() {",
    "    wx.getSystemInfoSync();",
    "    wx.chooseMedia({ count: 1 });",
    "  }",
    "});",
    ""
  ].join("\n"));
  fs.writeFileSync(path.join(root, "pages/demo/index.wxml"), "<view>fixture</view>\n");
  fs.writeFileSync(path.join(root, "pages/demo/index.wxss"), ".fixture {}\n");
  fs.writeFileSync(path.join(root, "sample.test.mjs"), "export const fixture = true;\n");
  return root;
}

test("当前工作区报告模式 exit 0 且已修复配置与废弃 API 不回归", () => {
  const run = spawnSync(process.execPath, [path.join(scriptDir, "check.mjs")], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.doesNotMatch(run.stdout, /\[发现\] MP-CONF-002 /);
  assert.doesNotMatch(run.stdout, /\[发现\] MP-PERF-001 /);
  assert.doesNotMatch(run.stdout, /\[发现\] MP-PKG-001 /);
  assert.match(run.stdout, /汇总：发现 \d+ 项；按规则：/);
});

test("合成违规可检出并报告 file:line", (t) => {
  const fixture = createFixture();
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const result = runPolicyCheck({ repoRoot, projectRoot: fixture, rulesPath });
  const report = formatReport(result);
  assert.equal(result.findings.length, 4, report);
  assert.match(report, /MP-CONF-002 project\.config\.json:\d+/);
  assert.match(report, /MP-PERF-001 pages\/demo\/index\.ts:3/);
  assert.match(report, /MP-PRIV-001 pages\/demo\/index\.ts:4/);
  assert.match(report, /MP-PKG-001 sample\.test\.mjs:1/);
  assert.match(report, /汇总：发现 4 项；按规则：MP-CONF-002=1，MP-PERF-001=1，MP-PKG-001=1，MP-PRIV-001=1/);
  t.diagnostic(report);
});

test("rules.json 与 spec 规则编号及自动化 ID 一致", () => {
  const { rules, snapshot } = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
  const ruleIds = rules.map((rule) => rule.id);
  assert.equal(new Set(ruleIds).size, ruleIds.length, "rules.json 不得有重复 id");

  const specFiles = fs.readdirSync(specRoot)
    .filter((name) => name.endsWith(".md") && name !== "index.md")
    .map((name) => path.join(specRoot, name));
  const specRuleIds = [];
  const specAutomationIds = [];
  for (const file of specFiles) {
    const text = fs.readFileSync(file, "utf8");
    specRuleIds.push(...[...text.matchAll(/^### (MP-[A-Z]+-\d{3}) \[(?:硬门禁|建议)\]$/gm)].map((match) => match[1]));
    specAutomationIds.push(...[...text.matchAll(/^- \*\*自动化检查 ID\*\*：(MP-[A-Z]+-\d{3})$/gm)].map((match) => match[1]));
    const sections = text.split(/(?=^### MP-[A-Z]+-\d{3} \[(?:硬门禁|建议)\]$)/gm).slice(1);
    for (const section of sections) {
      const id = section.match(/^### (MP-[A-Z]+-\d{3})/)?.[1];
      for (const label of ["规则正文", "依据", "判定方式", "违反时处理", "Owner", "最后复核日期", "自动化检查 ID"]) {
        assert.match(section, new RegExp(`^- \\*\\*${label}\\*\\*：`, "m"), `${id} 缺少 ${label}`);
      }
      assert.match(section, /^- \*\*Owner\*\*：TBD$/m, `${id} 的 Owner 应保持 TBD`);
      const reviewedAt = rules.find((rule) => rule.id === id)?.reviewedAt ?? snapshot.capturedAt;
      assert.match(reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${id} 的复核日期格式不正确`);
      assert.ok(section.split("\n").includes(`- **最后复核日期**：${reviewedAt}`), `${id} 的复核日期不一致`);
      assert.match(section, /本地留档抓取于 2026-09-18，对应基础库 3\.17\.3。/, `${id} 缺少快照说明`);
      const citations = [...section.matchAll(/`(docs\/reference\/wechat-miniprogram\/pages\/([^`:]+\.md)):(\d+)(?:-(\d+))?`/g)];
      assert.ok(citations.length > 0, `${id} 至少需要一处 pages/ 行号依据`);
      for (const citation of citations) {
        const source = path.join(repoRoot, citation[1]);
        assert.ok(fs.existsSync(source), `${id} 引用了不存在的文件 ${citation[1]}`);
        const lineCount = fs.readFileSync(source, "utf8").split("\n").length;
        assert.ok(Number(citation[4] ?? citation[3]) <= lineCount, `${id} 的依据行号超出 ${citation[1]}`);
      }
    }
  }
  assert.deepEqual([...new Set(specRuleIds)].sort(), [...ruleIds].sort());
  assert.deepEqual(
    [...new Set(specAutomationIds)].sort(),
    rules.filter((rule) => rule.checker).map((rule) => rule.id).sort()
  );
});

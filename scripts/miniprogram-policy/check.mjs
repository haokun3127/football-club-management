#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDir, "../..");
const textExtensions = new Set([".ts", ".js", ".wxml", ".json"]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function readJson(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return { text, value: JSON.parse(text) };
}

function lineAt(text, index) {
  return text.slice(0, Math.max(0, index)).split("\n").length;
}

function lineForKey(text, key) {
  const index = text.indexOf(`"${key}"`);
  return index < 0 ? 1 : lineAt(text, index);
}

function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], value);
}

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function compareVersions(left, right) {
  const a = String(left).split(".").map((part) => Number.parseInt(part, 10));
  const b = String(right).split(".").map((part) => Number.parseInt(part, 10));
  if ([...a, ...b].some(Number.isNaN)) return null;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function walkFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  };
  if (fs.existsSync(root)) visit(root);
  return files;
}

function globRegex(glob) {
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*" && glob[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
  }
  return new RegExp(`^${source}$`, "i");
}

function matchesPackRule(relativePath, rule) {
  const candidate = relativePath.toLowerCase();
  const value = String(rule?.value ?? "").replace(/^\.\//, "").split(path.sep).join("/");
  const lowerValue = value.toLowerCase();
  const basename = path.posix.basename(candidate);
  try {
    switch (rule?.type) {
      case "file": return candidate === lowerValue;
      case "folder": return candidate === lowerValue || candidate.startsWith(`${lowerValue}/`) || candidate.includes(`/${lowerValue}/`);
      case "suffix": return candidate.endsWith(lowerValue);
      case "prefix": return candidate.startsWith(lowerValue) || basename.startsWith(lowerValue);
      case "regexp": return new RegExp(value, "i").test(relativePath);
      case "glob": return globRegex(value).test(relativePath);
      default: return false;
    }
  } catch {
    return false;
  }
}

function isPacked(relativePath, projectConfig) {
  const options = projectConfig.packOptions ?? {};
  if ((options.include ?? []).some((rule) => matchesPackRule(relativePath, rule))) return true;
  return !(options.ignore ?? []).some((rule) => matchesPackRule(relativePath, rule));
}

function isRuntimeFile(relativePath) {
  if (!textExtensions.has(path.extname(relativePath))) return false;
  if (/(^|\/)scripts\//.test(relativePath)) return false;
  if (/\.(test|spec)\.[^.]+$/.test(relativePath)) return false;
  if (relativePath === "project.private.config.json") return false;
  return true;
}

function displayPath(absolutePath, repoRoot, projectRoot) {
  const fromRepo = path.relative(repoRoot, absolutePath);
  if (fromRepo && !fromRepo.startsWith("..") && !path.isAbsolute(fromRepo)) return toPosix(fromRepo);
  return toPosix(path.relative(projectRoot, absolutePath)) || path.basename(absolutePath);
}

function finding(rule, file, line, match, message) {
  return { ruleId: rule.id, level: rule.level, file, line, match, message };
}

function parseJsonForRule(rule, absolute, repoRoot, projectRoot, findings) {
  try {
    return readJson(absolute);
  } catch (error) {
    findings.push(finding(rule, displayPath(absolute, repoRoot, projectRoot), 1, "invalid-json", `JSON 无法解析：${error.message}`));
    return null;
  }
}

function checkJsonRequired(rule, context) {
  const results = [];
  for (const fileSpec of rule.params.files) {
    const absolute = path.join(context.projectRoot, fileSpec.path);
    if (!fs.existsSync(absolute)) {
      results.push(finding(rule, context.show(absolute), 1, "missing-file", "缺少必需配置文件"));
      continue;
    }
    const parsed = parseJsonForRule(rule, absolute, context.repoRoot, context.projectRoot, results);
    if (!parsed) continue;
    for (const requirement of fileSpec.required) {
      const actual = getPath(parsed.value, requirement.path);
      const leaf = requirement.path.split(".").at(-1);
      const line = lineForKey(parsed.text, leaf);
      if (valueType(actual) !== requirement.type) {
        results.push(finding(rule, context.show(absolute), line, requirement.path, `${requirement.path} 应为 ${requirement.type}`));
      } else if (Object.hasOwn(requirement, "equals") && actual !== requirement.equals) {
        results.push(finding(rule, context.show(absolute), line, `${requirement.path}=${JSON.stringify(actual)}`, `${requirement.path} 应为 ${JSON.stringify(requirement.equals)}`));
      } else if (requirement.nonEmpty && actual.length === 0) {
        results.push(finding(rule, context.show(absolute), line, `${requirement.path}=empty`, `${requirement.path} 不得为空`));
      }
    }
  }
  return results;
}

function checkJsonValue(rule, context) {
  const results = [];
  const absolute = path.join(context.projectRoot, rule.params.file);
  const parsed = parseJsonForRule(rule, absolute, context.repoRoot, context.projectRoot, results);
  if (!parsed) return results;
  const actual = getPath(parsed.value, rule.params.path);
  if (actual !== rule.params.equals) {
    const leaf = rule.params.path.split(".").at(-1);
    results.push(finding(rule, context.show(absolute), lineForKey(parsed.text, leaf), `${rule.params.path}=${JSON.stringify(actual)}`, `${rule.params.path} 必须为 ${JSON.stringify(rule.params.equals)}`));
  }
  return results;
}

function checkMinimumVersion(rule, context) {
  const results = [];
  const absolute = path.join(context.projectRoot, rule.params.file);
  const parsed = parseJsonForRule(rule, absolute, context.repoRoot, context.projectRoot, results);
  if (!parsed) return results;
  const actual = getPath(parsed.value, rule.params.path);
  const comparison = compareVersions(actual, rule.params.minimum);
  if (comparison === null || comparison < 0) {
    const leaf = rule.params.path.split(".").at(-1);
    results.push(finding(rule, context.show(absolute), lineForKey(parsed.text, leaf), `${rule.params.path}=${actual}`, `${rule.params.path} ${actual ?? "缺失"} 低于批准版本 ${rule.params.minimum}`));
  }
  return results;
}

function registeredRoutes(app) {
  const routes = [];
  for (const page of app.pages ?? []) routes.push(page);
  for (const subpackage of app.subPackages ?? app.subpackages ?? []) {
    for (const page of subpackage.pages ?? []) routes.push(`${subpackage.root}/${page}`.replace(/\/+/g, "/"));
  }
  return routes;
}

function checkRoutes(rule, context) {
  const results = [];
  const appPath = path.join(context.projectRoot, rule.params.appConfig);
  const parsed = parseJsonForRule(rule, appPath, context.repoRoot, context.projectRoot, results);
  if (!parsed) return results;
  const routes = registeredRoutes(parsed.value);
  const routeSet = new Set(routes.map((route) => `/${route}`));
  const seen = new Set();
  for (const route of routes) {
    const routeIndex = parsed.text.indexOf(`"${route}"`);
    const routeLine = routeIndex < 0 ? 1 : lineAt(parsed.text, routeIndex);
    if (seen.has(route)) results.push(finding(rule, context.show(appPath), routeLine, route, `页面路由重复注册：${route}`));
    seen.add(route);
    const base = path.join(context.projectRoot, route);
    if (!rule.params.logicExtensions.some((extension) => fs.existsSync(`${base}${extension}`))) {
      results.push(finding(rule, context.show(appPath), routeLine, route, `页面缺少逻辑文件（${rule.params.logicExtensions.join("/")}）：${route}`));
    }
    for (const extension of rule.params.requiredExtensions) {
      if (!fs.existsSync(`${base}${extension}`)) results.push(finding(rule, context.show(appPath), routeLine, `${route}${extension}`, `页面缺少 ${extension} 文件：${route}`));
    }
  }
  const sitemap = parsed.value.sitemapLocation;
  if (typeof sitemap === "string" && !fs.existsSync(path.join(context.projectRoot, sitemap))) {
    results.push(finding(rule, context.show(appPath), lineForKey(parsed.text, "sitemapLocation"), sitemap, `sitemapLocation 指向的文件不存在：${sitemap}`));
  }
  const routePattern = /["'`](\/(?:pages|packages)\/[^"'`?${}]+)(?:\?[^"'`]*)?["'`]/g;
  for (const absolute of context.files) {
    const relative = toPosix(path.relative(context.projectRoot, absolute));
    if (!isRuntimeFile(relative) || absolute === appPath) continue;
    const text = fs.readFileSync(absolute, "utf8");
    for (const match of text.matchAll(routePattern)) {
      if (!routeSet.has(match[1])) results.push(finding(rule, context.show(absolute), lineAt(text, match.index), match[1], `静态页面路径未在 app.json 注册：${match[1]}`));
    }
  }
  return results;
}

function loadProjectConfig(rule, context, results) {
  const file = rule.params.projectConfig ?? "project.config.json";
  const absolute = path.join(context.projectRoot, file);
  const parsed = parseJsonForRule(rule, absolute, context.repoRoot, context.projectRoot, results);
  return parsed?.value;
}

function checkPackIgnore(rule, context) {
  const results = [];
  const projectConfig = loadProjectConfig(rule, context, results);
  if (!projectConfig) return results;
  const patterns = rule.params.forbiddenPathPatterns.map((source) => new RegExp(source, "i"));
  for (const absolute of context.files) {
    const relative = toPosix(path.relative(context.projectRoot, absolute));
    if (!patterns.some((pattern) => pattern.test(relative))) continue;
    if (isPacked(relative, projectConfig)) results.push(finding(rule, context.show(absolute), 1, relative, "非产品文件未被 packOptions.ignore 排除"));
  }
  return results;
}

function checkRawSizeBudget(rule, context) {
  const results = [];
  const projectConfig = loadProjectConfig(rule, context, results);
  if (!projectConfig) return results;
  let bytes = 0;
  let fileCount = 0;
  for (const absolute of context.files) {
    const relative = toPosix(path.relative(context.projectRoot, absolute));
    if (!isPacked(relative, projectConfig)) continue;
    bytes += fs.statSync(absolute).size;
    fileCount += 1;
  }
  context.metrics.rawSize = { bytes, fileCount, warningBytes: rule.params.warningBytes };
  if (bytes > rule.params.warningBytes) {
    results.push(finding(rule, context.show(context.projectRoot), 1, `raw-bytes=${bytes}`, `原始文件预算 ${formatMiB(bytes)} 超过预警线 ${formatMiB(rule.params.warningBytes)}`));
  }
  return results;
}

function scanPatterns(rule, context, patterns) {
  const results = [];
  for (const absolute of context.files) {
    const relative = toPosix(path.relative(context.projectRoot, absolute));
    if (!isRuntimeFile(relative)) continue;
    const text = fs.readFileSync(absolute, "utf8");
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex, "g");
      for (const match of text.matchAll(regex)) {
        results.push(finding(rule, context.show(absolute), lineAt(text, match.index), match[0], `${pattern.name}：${match[0]}`));
      }
    }
  }
  return results;
}

function checkPrivacyCapabilities(rule, context) {
  return scanPatterns(rule, context, rule.params.capabilities.filter((capability) => !capability.approved));
}

const checkers = {
  "json-required": checkJsonRequired,
  "json-value": checkJsonValue,
  "minimum-version": checkMinimumVersion,
  routes: checkRoutes,
  "pack-ignore": checkPackIgnore,
  "raw-size-budget": checkRawSizeBudget,
  "forbidden-patterns": (rule, context) => scanPatterns(rule, context, rule.params.patterns),
  "privacy-capabilities": checkPrivacyCapabilities
};

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

export function runPolicyCheck(options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? defaultRepoRoot);
  const rulesPath = path.resolve(options.rulesPath ?? path.join(scriptDir, "rules.json"));
  const rulesDocument = readJson(rulesPath).value;
  const projectRoot = path.resolve(options.projectRoot ?? path.join(repoRoot, rulesDocument.projectPath));
  const files = walkFiles(projectRoot);
  const context = {
    repoRoot,
    projectRoot,
    files,
    metrics: {},
    show: (absolute) => displayPath(absolute, repoRoot, projectRoot)
  };
  const findings = [];
  for (const rule of rulesDocument.rules) {
    if (!rule.checker) continue;
    const checker = checkers[rule.checker];
    if (!checker) throw new Error(`未知检查器：${rule.checker} (${rule.id})`);
    findings.push(...checker(rule, context));
  }
  findings.sort((left, right) => left.ruleId.localeCompare(right.ruleId) || left.file.localeCompare(right.file) || left.line - right.line || left.match.localeCompare(right.match));
  return {
    rulesDocument,
    projectRoot,
    findings,
    metrics: context.metrics
  };
}

export function formatReport(result) {
  const automated = result.rulesDocument.rules.filter((rule) => rule.checker).length;
  const lines = [
    "微信小程序规则检查（报告模式）",
    `规则：${automated} 条自动检查 / ${result.rulesDocument.rules.length} 条总规则`
  ];
  for (const item of result.findings) lines.push(`[发现] ${item.ruleId} ${item.file}:${item.line} ${item.message}`);
  if (result.metrics.rawSize) {
    const metric = result.metrics.rawSize;
    lines.push(`[原始文件预算] ${metric.fileCount} 个文件，${formatMiB(metric.bytes)}；仅为未压缩原始文件预算，不是微信开发者工具/官方上传构建的官方 2M 结论。`);
  }
  const counts = new Map();
  for (const item of result.findings) counts.set(item.ruleId, (counts.get(item.ruleId) ?? 0) + 1);
  const groupedCounts = [...counts.entries()].map(([ruleId, count]) => `${ruleId}=${count}`).join("，") || "无";
  lines.push(`汇总：发现 ${result.findings.length} 项；按规则：${groupedCounts}`);
  lines.push("提示：检查结果是“报告”，是否修由人/评审决定；报告本身不阻断后续命令。");
  return lines.join("\n");
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--project-root") options.projectRoot = argv[++index];
    else if (argument === "--rules") options.rulesPath = argv[++index];
    else if (argument === "--json") options.json = true;
    else throw new Error(`未知参数：${argument}`);
  }
  return options;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = runPolicyCheck(options);
    process.stdout.write(`${options.json ? JSON.stringify(result, null, 2) : formatReport(result)}\n`);
  } catch (error) {
    process.stderr.write(`[检查器错误] ${error.stack ?? error.message}\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();

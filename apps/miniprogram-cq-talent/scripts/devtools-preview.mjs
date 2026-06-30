#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const cliPath = process.env.WECHAT_DEVTOOLS_CLI ?? "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const projectPath = process.env.PROJECT_PATH ?? resolve(import.meta.dirname, "..");
const port = process.env.DEVTOOLS_PORT ?? "9420";

function main() {
  if (!existsSync(cliPath)) {
    throw new Error(`WeChat DevTools CLI not found: ${cliPath}`);
  }

  run(["islogin", "--port", port], "check DevTools login");
  run(["open", "--project", projectPath, "--port", port], "open mini-program project");
  run(["preview", "--project", projectPath, "--port", port], "preview mini-program");

  console.log("");
  console.log("CQ Talent DevTools preview passed");
  console.log(`project=${projectPath}`);
  console.log(`port=${port}`);
}

function run(args, label) {
  console.log(`\n> ${label}`);
  const result = spawnSync(cliPath, args, {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

main();

#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const defaultCliPath = process.platform === "win32"
  ? "D:\\微信web开发者工具\\cli.bat"
  : "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const cliPath = process.env.WECHAT_DEVTOOLS_CLI ?? defaultCliPath;
const projectPath = process.env.PROJECT_PATH ?? resolve(import.meta.dirname, "..");
const port = process.env.DEVTOOLS_PORT;

function main() {
  if (!existsSync(cliPath)) {
    throw new Error(`WeChat DevTools CLI not found: ${cliPath}`);
  }

  const login = run(withPort(["islogin"]), "check DevTools login");
  if (/"login"\s*:\s*false/.test(login)) {
    throw new Error("WeChat DevTools is not logged in. Log in to the IDE, then rerun this command.");
  }
  run(withPort(["open", "--project", projectPath]), "open mini-program project");
  run(withPort(["preview", "--project", projectPath]), "preview mini-program");

  console.log("");
  console.log("CQ Talent DevTools preview passed");
  console.log(`project=${projectPath}`);
  console.log(`port=${port ?? "existing IDE port"}`);
}

function withPort(args) {
  return port ? [...args, "--port", port] : args;
}

function run(args, label) {
  console.log(`\n> ${label}`);
  const result = spawnSync(cliPath, args, {
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(cliPath),
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

main();

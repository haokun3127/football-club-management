"use strict";

const { existsSync, readFileSync, readdirSync, statSync, writeFileSync } = require("node:fs");
const { homedir } = require("node:os");
const { join, resolve } = require("node:path");
const net = require("node:net");

const REPO_ROOT = resolve(__dirname, "../..");
const DEFAULT_STATE_PATH = resolve(REPO_ROOT, "tmp/devtools-automation-session.json");
const AUTOMATION_PORT_RANGE = Object.freeze({ start: 9420, end: 9440 });

function parsePort(value, label = "automation port") {
  if (!/^\d+$/.test(String(value))) throw new Error(`${label} must be an integer`);
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${label} must be between 1 and 65535`);
  }
  return port;
}

function sessionPath(statePath = process.env.MP_AUTOMATION_STATE_FILE || DEFAULT_STATE_PATH) {
  return resolve(statePath);
}

function readAutomationSession(statePath = sessionPath()) {
  const file = sessionPath(statePath);
  if (!existsSync(file)) return null;
  let state;
  try {
    state = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Invalid DevTools automation session file ${file}: ${error.message}`);
  }
  if (!state || state.version !== 1) throw new Error(`Unsupported DevTools automation session file ${file}`);
  return {
    ...state,
    automationPort: parsePort(state.automationPort),
    projectPath: String(state.projectPath || ""),
  };
}

function resolveAutomationPort({ explicitPort, statePath, env = process.env } = {}) {
  const state = readAutomationSession(statePath);
  const candidate = explicitPort ?? env.MP_AUTO_PORT ?? env.DEVTOOLS_AUTOMATOR_PORT ?? state?.automationPort;
  if (candidate === undefined || candidate === null || candidate === "") {
    throw new Error(
      "No active WeChat DevTools Automator session is known. Run `pnpm devtools:automator:open` " +
      "or pass MP_AUTO_PORT after enabling automation; the IDE HTTP port is not an Automator port.",
    );
  }
  return parsePort(candidate);
}

function buildCliArgs({ projectPath, automationPort, ideHttpPort }) {
  const args = ["auto", "--project", projectPath, "--auto-port", String(parsePort(automationPort))];
  if (ideHttpPort !== undefined && ideHttpPort !== null && ideHttpPort !== "") {
    args.push("--port", String(parsePort(ideHttpPort, "IDE HTTP port")));
  }
  args.push("--lang", "zh");
  return args;
}

function writeAutomationSession(state, statePath) {
  const file = sessionPath(statePath);
  writeFileSync(file, `${JSON.stringify({
    version: 1,
    automationPort: parsePort(state.automationPort),
    projectPath: String(state.projectPath || ""),
    ideHttpPort: state.ideHttpPort ? parsePort(state.ideHttpPort, "IDE HTTP port") : undefined,
    cliPath: state.cliPath ? String(state.cliPath) : undefined,
    createdAt: state.createdAt || new Date().toISOString(),
  }, null, 2)}\n`, "utf8");
  return file;
}

function readIdeHttpPort({ env = process.env } = {}) {
  const explicit = env.MP_IDE_HTTP_PORT || env.WECHAT_DEVTOOLS_HTTP_PORT;
  if (explicit) return parsePort(explicit, "IDE HTTP port");

  if (process.platform !== "win32") return undefined;
  const userData = env.MP_DEVTOOLS_IDE_USER_DATA || join(env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "微信开发者工具", "User Data");
  if (!existsSync(userData)) return undefined;

  const candidates = [];
  for (const profile of readdirSync(userData, { withFileTypes: true })) {
    if (!profile.isDirectory()) continue;
    const file = join(userData, profile.name, "Default", ".ide");
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8").trim();
    if (!/^\d+$/.test(content)) continue;
    candidates.push({ file, port: parsePort(content, "IDE HTTP port"), modified: statSync(file).mtimeMs });
  }
  candidates.sort((left, right) => right.modified - left.modified);
  return candidates[0]?.port;
}

function listenOnce(port) {
  return new Promise((resolvePromise, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port }, () => server.close(() => resolvePromise(true)));
  });
}

async function findFreeAutomationPort({ start = AUTOMATION_PORT_RANGE.start, end = AUTOMATION_PORT_RANGE.end } = {}) {
  for (let port = start; port <= end; port += 1) {
    try {
      await listenOnce(port);
      return port;
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error(`No free Automator port in ${start}-${end}`);
}

function isTcpPortOpen({ port, host = "127.0.0.1", timeoutMs = 250 } = {}) {
  return new Promise((resolvePromise) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(open);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}

module.exports = {
  AUTOMATION_PORT_RANGE,
  DEFAULT_STATE_PATH,
  buildCliArgs,
  findFreeAutomationPort,
  isTcpPortOpen,
  parsePort,
  readAutomationSession,
  readIdeHttpPort,
  resolveAutomationPort,
  sessionPath,
  writeAutomationSession,
};

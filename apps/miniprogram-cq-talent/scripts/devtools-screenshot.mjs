#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve, win32 } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const automator = require("miniprogram-automator");

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const DEFAULT_PORT = 9421;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_DELAY_MS = 500;
const REQUIRED_VIEWPORT = Object.freeze({ width: 375, height: 812 });
const DEFAULT_CLI_PATH = process.platform === "win32"
  ? "D:\\微信web开发者工具\\cli.bat"
  : "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const DEFAULT_PROJECT_PATH = resolve(import.meta.dirname, "..");
const WINDOWS_SIMULATOR_CAPTURE_HELPER = resolve(import.meta.dirname, "devtools-simulator-capture.py");
const USAGE = "Usage: devtools:screenshot -- --output C:\\temp\\shot.png --expect-route-prefix /pages/parent/ [--port 9421]";

export function parseArgs(argv) {
  const args = [...argv];
  if (args[0] === "--") args.shift();
  if (args.includes("--")) throw new Error("only one leading pnpm separator is supported");
  if (args.length === 1 && args[0] === "--help") return { help: true };

  const options = { output: "", expectRoutePrefix: "", port: DEFAULT_PORT };
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) throw new Error(`unknown argument: ${key}`);
    if (key === "--help") throw new Error("--help cannot be combined with other options");
    if (!["--output", "--expect-route-prefix", "--port"].includes(key)) throw new Error(`unknown option: ${key}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${key} requires a value`);
    index += 1;
    if (key === "--output") {
      if (options.output) throw new Error("duplicate --output option");
      options.output = value;
    }
    if (key === "--expect-route-prefix") {
      if (options.expectRoutePrefix) throw new Error("duplicate --expect-route-prefix option");
      options.expectRoutePrefix = value;
    }
    if (key === "--port") {
      if (options.port !== DEFAULT_PORT) throw new Error("duplicate --port option");
      options.port = parsePort(value);
    }
  }

  if (!options.output) throw new Error("--output is required");
  if (!options.expectRoutePrefix.startsWith("/")) throw new Error("--expect-route-prefix must start with /");
  return options;
}

function parsePort(value) {
  if (!/^\d+$/.test(value)) throw new Error("--port must be an integer");
  const port = Number(value);
  if (port < 1 || port > 65_535) throw new Error("--port must be between 1 and 65535");
  return port;
}

export function validateOutputPath(output, repoRoot = REPO_ROOT) {
  if (!win32.isAbsolute(output)) throw new Error("--output must be an absolute Windows path");
  if (output.startsWith("\\\\")) throw new Error("UNC output paths are not supported");
  const normalized = win32.normalize(output);
  if (win32.parse(normalized).base.includes(":")) throw new Error("ADS output paths are not supported");
  if (win32.extname(normalized).toLowerCase() !== ".png") throw new Error("--output must end in .png");

  const repo = win32.resolve(repoRoot).toLowerCase();
  const target = normalized.toLowerCase();
  if (target === repo || target.startsWith(`${repo}\\`)) throw new Error("--output must be outside the repository");
  const parent = dirname(normalized);
  if (!existsSync(parent)) throw new Error("--output parent directory does not exist");
  const sidecar = `${normalized}.json`;
  if (existsSync(normalized) || existsSync(sidecar)) throw new Error("PNG output or sidecar already exists");
  return { output: normalized, sidecar, parent };
}

function routeOf(page) {
  const path = String(page?.path ?? page?.route ?? "");
  return path ? (path.startsWith("/") ? path : `/${path}`) : "";
}

function routesOf(pageStack) {
  return pageStack.map(routeOf).filter(Boolean);
}

function readPngMetadata(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) throw new Error("Automator did not create a PNG file");
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") throw new Error("PNG is missing an IHDR header");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertExpectedViewport(systemInfo) {
  const width = Number(systemInfo?.windowWidth);
  const height = Number(systemInfo?.windowHeight);
  const devicePixelRatio = Number(systemInfo?.pixelRatio);
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) {
    throw new Error("Automator system info must provide finite windowWidth, windowHeight, and positive pixelRatio");
  }
  if (width !== REQUIRED_VIEWPORT.width || height !== REQUIRED_VIEWPORT.height) {
    throw new Error(`capture requires a ${REQUIRED_VIEWPORT.width}x${REQUIRED_VIEWPORT.height} logical viewport; received ${width}x${height}`);
  }
  return { width, height, devicePixelRatio };
}

function assertExpectedDimensions(bytes, viewport) {
  const { width, height } = readPngMetadata(bytes);
  const rasterScale = { width: width / viewport.width, height: height / viewport.height };
  const roundingTolerance = (0.5 / viewport.width) + (0.5 / viewport.height);
  if (rasterScale.width < 1 || rasterScale.height < 1 || Math.abs(rasterScale.width - rasterScale.height) > roundingTolerance) {
    throw new Error(`capture PNG is not a uniformly scaled full ${viewport.width}x${viewport.height} logical viewport; received ${width}x${height}`);
  }
  return { width, height, rasterScale };
}

function writeCaptureAtomically({ targets, bytes, sidecar }) {
  const token = `${process.pid}-${randomUUID()}`;
  const pngTemp = win32.join(targets.parent, `.${basename(targets.output)}.${token}.tmp`);
  const sidecarTemp = win32.join(targets.parent, `.${basename(targets.sidecar)}.${token}.tmp`);
  let pngRenamed = false;
  try {
    writeFileSync(pngTemp, bytes, { flag: "wx" });
    writeFileSync(sidecarTemp, `${JSON.stringify(sidecar, null, 2)}\n`, { flag: "wx" });
    renameSync(pngTemp, targets.output);
    pngRenamed = true;
    renameSync(sidecarTemp, targets.sidecar);
  } catch (error) {
    if (pngRenamed && existsSync(targets.output)) {
      try { unlinkSync(targets.output); } catch {}
    }
    throw error;
  } finally {
    for (const temp of [pngTemp, sidecarTemp]) {
      if (existsSync(temp)) {
        try { unlinkSync(temp); } catch {}
      }
    }
  }
}

function safeDisconnect(miniProgram) {
  try { miniProgram?.disconnect?.(); } catch {}
}

async function captureWindowsSimulator({
  output,
  viewport,
  simulatorTitle = process.env.WECHAT_DEVTOOLS_SIMULATOR_TITLE ?? "",
  pythonPath = process.env.WECHAT_DEVTOOLS_PYTHON ?? "python",
  spawnImpl = spawn,
} = {}) {
  if (!existsSync(WINDOWS_SIMULATOR_CAPTURE_HELPER)) throw new Error(`Windows simulator capture helper not found: ${WINDOWS_SIMULATOR_CAPTURE_HELPER}`);
  const args = [
    WINDOWS_SIMULATOR_CAPTURE_HELPER,
    "--output",
    output,
    "--logical-width",
    String(viewport.width),
    "--logical-height",
    String(viewport.height),
  ];
  if (simulatorTitle) args.push("--simulator-title", simulatorTitle);

  const child = spawnImpl(pythonPath, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false });
  let stdout = "";
  let stderr = "";
  child.stdout?.setEncoding?.("utf8");
  child.stderr?.setEncoding?.("utf8");
  child.stdout?.on?.("data", (chunk) => { stdout += chunk; });
  child.stderr?.on?.("data", (chunk) => { stderr += chunk; });

  await new Promise((resolveCapture, rejectCapture) => {
    child.once?.("error", rejectCapture);
    child.once?.("close", (code) => {
      if (code === 0) resolveCapture();
      else rejectCapture(new Error(`Python simulator capture failed${stderr.trim() ? `: ${stderr.trim()}` : ` with exit code ${code}`}`));
    });
  });

  try {
    return JSON.parse(stdout.trim());
  } catch {
    throw new Error(`Python simulator capture returned invalid metadata${stdout.trim() ? `: ${stdout.trim()}` : ""}`);
  }
}

function buildWindowsBatchCommand(cliPath, projectPath, port) {
  for (const [label, value] of [["CLI path", cliPath], ["project path", projectPath]]) {
    if (/[\"%&|<>()^!\r\n]/.test(value)) throw new Error(`Windows ${label} contains unsupported cmd metacharacters`);
  }
  return `\"\"${cliPath}\" auto --project \"${projectPath}\" --auto-port ${port} --lang zh\"`;
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

function withOperationTimeout(operation, label, timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error("operation timeout must be a positive finite number");
  let timeout;
  return new Promise((resolveOperation, rejectOperation) => {
    timeout = setTimeout(() => rejectOperation(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    Promise.resolve(operation).then(resolveOperation, rejectOperation).finally(() => clearTimeout(timeout));
  });
}

async function connectAfterLaunch({ automatorImpl, endpoint, timeoutMs, retryDelayMs, sleepImpl }) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  do {
    try {
      return await automatorImpl.connect({ wsEndpoint: endpoint });
    } catch (error) {
      lastError = error;
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await sleepImpl(Math.min(retryDelayMs, remaining));
    }
  } while (Date.now() < deadline);
  throw new Error(`automation endpoint did not become available at ${endpoint}: ${lastError?.message ?? "unknown connection error"}`);
}

export async function openAutomation({
  automatorImpl = automator,
  cliPath = process.env.WECHAT_DEVTOOLS_CLI ?? DEFAULT_CLI_PATH,
  projectPath = process.env.PROJECT_PATH ?? DEFAULT_PROJECT_PATH,
  port = Number(process.env.DEVTOOLS_AUTOMATOR_PORT ?? DEFAULT_PORT),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  sleepImpl = sleep,
  isWindows = process.platform === "win32",
  commandShell = process.env.ComSpec ?? "cmd.exe",
  spawnImpl = spawn,
} = {}) {
  if (!existsSync(cliPath)) throw new Error(`WeChat DevTools CLI not found: ${cliPath}`);
  const automationPort = parsePort(String(port));
  const endpoint = `ws://127.0.0.1:${automationPort}`;
  const cliArgs = ["auto", "--project", projectPath, "--auto-port", String(automationPort), "--lang", "zh"];
  const isWindowsBatch = isWindows && /\.(bat|cmd)$/i.test(cliPath);
  const child = isWindowsBatch
    ? spawnImpl(commandShell, ["/d", "/s", "/c", buildWindowsBatchCommand(cliPath, projectPath, automationPort)], {
      stdio: "ignore",
      windowsHide: true,
      shell: false,
    })
    : spawnImpl(cliPath, cliArgs, {
      stdio: "ignore",
      windowsHide: true,
      shell: false,
    });
  child?.unref?.();
  const miniProgram = await connectAfterLaunch({ automatorImpl, endpoint, timeoutMs, retryDelayMs, sleepImpl });
  try {
    return { port: automationPort, route: routeOf(await miniProgram.currentPage()) };
  } finally {
    safeDisconnect(miniProgram);
  }
}

export async function runCli({
  argv,
  automatorImpl = automator,
  repoRoot = REPO_ROOT,
  now = () => new Date(),
  operationTimeoutMs = DEFAULT_TIMEOUT_MS,
  platform = process.platform,
  captureWindowsSimulatorImpl = captureWindowsSimulator,
} = {}) {
  const options = parseArgs(argv ?? []);
  if (options.help) return { help: true, usage: USAGE };
  const targets = validateOutputPath(options.output, repoRoot);
  const endpoint = `ws://127.0.0.1:${options.port}`;
  const captureTemp = win32.join(targets.parent, `.${basename(targets.output)}.${process.pid}-${randomUUID()}.capture`);

  try {
    const captureProgram = await automatorImpl.connect({ wsEndpoint: endpoint });
    let route;
    let pageStackRoutes;
    let bytes;
    let simulatorWindow;
    try {
      route = routeOf(await captureProgram.currentPage());
      pageStackRoutes = routesOf(await captureProgram.pageStack());
      if (!route.startsWith(options.expectRoutePrefix)) throw new Error(`current page does not match route prefix: ${route || "(none)"}`);
      if (platform !== "win32") {
        await withOperationTimeout(captureProgram.screenshot({ path: captureTemp }), "screenshot", operationTimeoutMs);
        bytes = readFileSync(captureTemp);
      }
    } finally {
      safeDisconnect(captureProgram);
    }

    if (platform === "win32") {
      simulatorWindow = await captureWindowsSimulatorImpl({ output: captureTemp, viewport: REQUIRED_VIEWPORT });
      bytes = readFileSync(captureTemp);
    }

    const inspectionProgram = await automatorImpl.connect({ wsEndpoint: endpoint });
    let viewport;
    try {
      const inspectionRoute = routeOf(await inspectionProgram.currentPage());
      if (inspectionRoute !== route) throw new Error(`current page changed during capture: ${route || "(none)"} -> ${inspectionRoute || "(none)"}`);
      viewport = assertExpectedViewport(await withOperationTimeout(inspectionProgram.systemInfo(), "systemInfo", operationTimeoutMs));
    } finally {
      safeDisconnect(inspectionProgram);
    }

    const { width, height, rasterScale } = assertExpectedDimensions(bytes, viewport);
    const sidecar = {
      capturedAt: now().toISOString(),
      automationEndpoint: endpoint,
      route,
      pageStackRoutes,
      png: {
        path: targets.output,
        bytes: bytes.length,
        width,
        height,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      viewport: { ...viewport, rasterScale },
      captureMethod: simulatorWindow ? "Windows PrintWindow DevTools simulator capture" : "miniprogram-automator MiniProgram.screenshot",
      ...(simulatorWindow ? { simulatorWindow } : {}),
    };
    writeCaptureAtomically({ targets, bytes, sidecar });
    return { ...sidecar, sidecarPath: targets.sidecar };
  } finally {
    if (existsSync(captureTemp)) {
      try { unlinkSync(captureTemp); } catch {}
    }
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isMain) {
  runCli({ argv: process.argv.slice(2) })
    .then((result) => {
      if (result.help) console.log(result.usage);
      else console.log(JSON.stringify({ output: result.png.path, sidecar: result.sidecarPath, route: result.route, width: result.png.width, height: result.png.height, viewport: result.viewport, sha256: result.png.sha256 }));
    })
    .catch((error) => {
      console.error(`devtools:screenshot failed: ${error.message}`);
      process.exitCode = 1;
    });
}

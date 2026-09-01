#!/usr/bin/env node

const { createHash, randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} = require('node:fs');
const { basename, dirname, resolve, win32 } = require('node:path');
const { assertVisualEvidenceDirectory, createDefaultVisualEvidencePath } = require('./visual-evidence-path.cjs');

const REPO_ROOT = resolve(__dirname, '..', '..');
const PROJECT_PATH = resolve(REPO_ROOT, 'apps', 'miniprogram-cq-talent');
const DEFAULT_MCP_COMMAND = 'D:\\微信web开发者工具\\wechatide.cmd';
const NORMALIZER = resolve(__dirname, 'wechatide-mcp-normalize.py');
const MCP_PROTOCOL_VERSION = '2025-06-18';
const WECHATIDE_SKILL_VERSION = '0.3.9';
const REQUIRED_VIEWPORT = Object.freeze({ width: 375, height: 812 });
const MAX_ASPECT_RATIO_ERROR = 0.005;
const DEFAULT_TIMEOUT_MS = 30_000;
const SCREENSHOT_FILE_TIMEOUT_MS = 5_000;

function parseArgs(argv) {
  const args = [...argv];
  if (args[0] === '--') args.shift();
  const options = { route: '', output: '' };
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!['--route', '--query', '--output'].includes(key)) throw new Error(`unknown option: ${key}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${key} requires a value`);
    index += 1;
    if (key === '--route') {
      if (options.route) throw new Error('duplicate --route option');
      options.route = value;
    } else if (key === '--query') {
      if (options.query) throw new Error('duplicate --query option');
      options.query = value;
    } else {
      if (options.output) throw new Error('duplicate --output option');
      options.output = value;
    }
  }
  if (!options.route.startsWith('/') || options.route.length < 2 || options.route.includes('?')) {
    throw new Error('--route must be an exact route beginning with /');
  }
  if (options.query && (/^[?#]/.test(options.query) || /[\r\n#]/.test(options.query))) {
    throw new Error('--query must be a query string without ?, #, or newlines');
  }
  if (!options.output) options.output = createDefaultVisualEvidencePath('wechatide-mcp');
  if (!win32.isAbsolute(options.output) || win32.extname(options.output).toLowerCase() !== '.png') {
    throw new Error('--output must be an absolute Windows .png path');
  }
  assertVisualEvidenceDirectory(dirname(options.output));
  return options;
}

function validateOutput(output) {
  const normalized = win32.normalize(output);
  const parent = dirname(normalized);
  if (!existsSync(parent)) throw new Error(`--output parent directory does not exist: ${parent}`);
  if (existsSync(normalized) || existsSync(`${normalized}.json`)) {
    throw new Error('PNG output or sidecar already exists');
  }
  return { output: normalized, sidecar: `${normalized}.json`, parent };
}

function readPngDimensions(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) {
    throw new Error('capture is not a PNG');
  }
  if (bytes.subarray(12, 16).toString('ascii') !== 'IHDR') throw new Error('PNG is missing an IHDR header');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertRawCapture({ width, height }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('capture dimensions must be positive integers');
  }
  const scaleX = width / REQUIRED_VIEWPORT.width;
  const scaleY = height / REQUIRED_VIEWPORT.height;
  const aspectRatioError = Math.abs((width / height) / (REQUIRED_VIEWPORT.width / REQUIRED_VIEWPORT.height) - 1);
  if (aspectRatioError > MAX_ASPECT_RATIO_ERROR) {
    throw new Error(`capture is outside the 375x812 viewport aspect ratio tolerance: ${width}x${height}`);
  }
  return { width, height, scaleX, scaleY };
}

function payloadOf(result) {
  if (result && result.structuredContent && typeof result.structuredContent === 'object') return result.structuredContent;
  const text = result?.content?.find((item) => item?.type === 'text')?.text;
  if (typeof text === 'string') {
    try { return JSON.parse(text); } catch {}
  }
  if (result && typeof result === 'object') return result;
  throw new Error('MCP tool returned no structured payload');
}

function exactRoute(payload) {
  const candidates = [
    payload?.path,
    payload?.route,
    payload?.currentPage?.path,
    payload?.currentPage?.route,
    payload?.data?.path,
    payload?.data?.route,
  ];
  const route = candidates.find((value) => typeof value === 'string' && value.length > 0);
  return route ? (route.startsWith('/') ? route : `/${route}`) : '';
}

function viewportOf(payload) {
  const nested = payload?.systemInfo && typeof payload.systemInfo === 'object' ? payload.systemInfo : null;
  const source = nested?.result && typeof nested.result === 'object' ? nested.result : (nested || payload);
  return {
    width: Number(source?.windowWidth ?? source?.width),
    height: Number(source?.windowHeight ?? source?.height),
    screenWidth: Number(source?.screenWidth ?? source?.windowWidth ?? source?.width),
    screenHeight: Number(source?.screenHeight ?? source?.windowHeight ?? source?.height),
    devicePixelRatio: Number(source?.pixelRatio ?? source?.devicePixelRatio),
  };
}

function assertLogicalViewport(payload) {
  const viewport = viewportOf(payload);
  const screenMatches = viewport.screenWidth === REQUIRED_VIEWPORT.width && viewport.screenHeight === REQUIRED_VIEWPORT.height;
  const windowMatches = viewport.width === REQUIRED_VIEWPORT.width && viewport.height === REQUIRED_VIEWPORT.height;
  if (!screenMatches && !windowMatches) {
    throw new Error(`runtime screen/window viewport must include 375x812; received screen ${viewport.screenWidth}x${viewport.screenHeight}, window ${viewport.width}x${viewport.height}`);
  }
  if (viewport.width !== REQUIRED_VIEWPORT.width || viewport.height < 1 || viewport.height > viewport.screenHeight) {
    throw new Error(`runtime window viewport is invalid: received ${viewport.width}x${viewport.height} within screen ${viewport.screenWidth}x${viewport.screenHeight}`);
  }
  return viewport;
}

async function waitForLogicalViewport({
  readRuntime,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  sleepImpl = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)),
} = {}) {
  if (typeof readRuntime !== 'function') throw new TypeError('readRuntime must be a function');
  const deadline = Date.now() + timeoutMs;
  let lastError;
  do {
    const payload = await readRuntime();
    try {
      return assertLogicalViewport(payload);
    } catch (error) {
      lastError = error;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleepImpl(Math.min(250, remaining));
  } while (Date.now() < deadline);
  throw lastError || new Error('runtime viewport was not available');
}

async function waitForExactRoute({ client, projectPath, expectedRoute, timeoutMs = DEFAULT_TIMEOUT_MS, sleepImpl = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)) }) {
  const deadline = Date.now() + timeoutMs;
  let received = '';
  do {
    const current = payloadOf(await client.callTool('automation_runtime_info', { project: projectPath, action: 'currentPage' }));
    received = exactRoute(current);
    if (received === expectedRoute) return received;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleepImpl(Math.min(250, remaining));
  } while (Date.now() < deadline);
  throw new Error(`verified route mismatch: expected ${expectedRoute}, received ${received || '<unknown>'}`);
}

async function waitForScreenshotFile({ path, timeoutMs = SCREENSHOT_FILE_TIMEOUT_MS, sleepImpl = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)) }) {
  const deadline = Date.now() + timeoutMs;
  do {
    try {
      if (existsSync(path) && statSync(path).size > 0) return;
    } catch {
      // The simulator may still be replacing its just-reported PNG path.
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleepImpl(Math.min(100, remaining));
  } while (Date.now() < deadline);
  throw new Error(`MCP screenshot path does not exist: ${path}`);
}

function powershellEncodedInvocation(command) {
  if (!win32.isAbsolute(command) || !command.toLowerCase().endsWith('.cmd') || /[\r\n]/.test(command)) {
    throw new Error('WECHATIDE_MCP_COMMAND must be an absolute .cmd path without newlines');
  }
  const escaped = command.replace(/'/g, "''");
  return Buffer.from(`& '${escaped}' mcp`, 'utf16le').toString('base64');
}

function createMcpClient({
  command = process.env.WECHATIDE_MCP_COMMAND || DEFAULT_MCP_COMMAND,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  spawnImpl = spawn,
} = {}) {
  const child = spawnImpl('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', powershellEncodedInvocation(command),
  ], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false });
  let buffer = '';
  let nextId = 1;
  let closed = false;
  const pending = new Map();

  const rejectAll = (error) => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
  };

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', () => {});
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line || !line.startsWith('{')) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (!Object.prototype.hasOwnProperty.call(message, 'id')) continue;
      const entry = pending.get(message.id);
      if (!entry) continue;
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message || 'MCP request failed'));
      else entry.resolve(message.result);
    }
  });
  child.once('error', (error) => rejectAll(error));
  child.once('exit', (code) => {
    if (!closed) rejectAll(new Error(`wechatide MCP bridge exited with code ${code}`));
  });

  const request = (method, params) => {
    if (closed) return Promise.reject(new Error('wechatide MCP client is closed'));
    const id = nextId++;
    return new Promise((resolveRequest, rejectRequest) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectRequest(new Error(`MCP ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      pending.set(id, { resolve: resolveRequest, reject: rejectRequest, timer });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  };

  const initialize = async () => {
    await request('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'Codex', version: '26.810.52044' },
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
    const tools = await request('tools/list', {});
    const names = new Set((tools?.tools || []).map((tool) => tool.name));
    for (const required of ['check_wechatide_status', 'open_project_window', 'simulator_open_page', 'simulator_refresh', 'automation_navigate', 'automation_runtime_info', 'simulator_screenshot']) {
      if (!names.has(required)) throw new Error(`MCP tool is unavailable: ${required}`);
    }
  };

  return {
    async callTool(name, args) {
      const result = await request('tools/call', { name, arguments: args });
      if (result?.isError) throw new Error(payloadOf(result)?.message || `MCP tool failed: ${name}`);
      return result;
    },
    async close() {
      closed = true;
      rejectAll(new Error('wechatide MCP client closed'));
      child.stdin.end();
    },
    ready: initialize(),
  };
}

function runProcess(command, args, { spawnImpl = spawn } = {}) {
  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawnImpl(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', rejectProcess);
    child.once('close', (code) => code === 0 ? resolveProcess() : rejectProcess(new Error(stderr.trim() || `${command} exited with code ${code}`)));
  });
}

async function normalizeWithPython({ input, output, width, height, spawnImpl = spawn }) {
  await runProcess(process.env.WECHATIDE_PYTHON || 'python', [NORMALIZER, '--input', input, '--output', output, '--width', String(width), '--height', String(height)], { spawnImpl });
}

function writeEvidenceAtomically({ output, sidecar, normalizedBytes, metadata }) {
  const token = `${process.pid}-${randomUUID()}`;
  const pngTemp = win32.join(dirname(output), `.${basename(output)}.${token}.tmp`);
  const sidecarTemp = win32.join(dirname(sidecar), `.${basename(sidecar)}.${token}.tmp`);
  let publishedPng = false;
  try {
    writeFileSync(pngTemp, normalizedBytes, { flag: 'wx' });
    writeFileSync(sidecarTemp, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
    renameSync(pngTemp, output);
    publishedPng = true;
    renameSync(sidecarTemp, sidecar);
  } catch (error) {
    if (publishedPng) rmSync(output, { force: true });
    throw error;
  } finally {
    rmSync(pngTemp, { force: true });
    rmSync(sidecarTemp, { force: true });
  }
}

async function runCapture({
  argv,
  projectPath = PROJECT_PATH,
  createClient: createClientImpl = createMcpClient,
  normalizeImage = normalizeWithPython,
  now = () => new Date(),
  routePollTimeoutMs = DEFAULT_TIMEOUT_MS,
  screenshotFileTimeoutMs = SCREENSHOT_FILE_TIMEOUT_MS,
  sleepImpl,
} = {}) {
  const options = parseArgs(argv || process.argv.slice(2));
  const targets = validateOutput(options.output);
  const token = `${process.pid}-${randomUUID()}`;
  const rawPath = win32.join(targets.parent, `.${basename(targets.output)}.${token}.raw.png`);
  const normalizedPath = win32.join(targets.parent, `.${basename(targets.output)}.${token}.normalized.png`);
  let client;
  try {
    client = await createClientImpl();
    if (client.ready) await client.ready;
    const status = payloadOf(await client.callTool('check_wechatide_status', { 'skill-version': WECHATIDE_SKILL_VERSION }));
    if (status.loginExpired === true) throw new Error('WeChatIDE login is expired');
    await client.callTool('open_project_window', { project: projectPath });
    const openPageArgs = { project: projectPath, page: options.route.slice(1) };
    if (options.query) openPageArgs.query = options.query;
    await client.callTool('simulator_refresh', { project: projectPath });
    await client.callTool('simulator_open_page', openPageArgs);
    const navigationUrl = options.query ? `${options.route}?${options.query}` : options.route;
    await client.callTool('automation_navigate', {
      project: projectPath,
      action: 'reLaunch',
      url: navigationUrl,
      wait: 1,
    });
    await waitForExactRoute({ client, projectPath, expectedRoute: options.route, timeoutMs: routePollTimeoutMs, sleepImpl });
    const runtime = await waitForLogicalViewport({
      readRuntime: async () => payloadOf(await client.callTool('automation_runtime_info', { project: projectPath, action: 'systemInfo' })),
      timeoutMs: routePollTimeoutMs,
      sleepImpl,
    });
    const screenshot = payloadOf(await client.callTool('simulator_screenshot', {
      project: projectPath,
      path: rawPath,
      optimize: false,
      waitForSelector: 'view',
    }));
    const sourcePath = screenshot.path || rawPath;
    await waitForScreenshotFile({ path: sourcePath, timeoutMs: screenshotFileTimeoutMs, sleepImpl });
    const rawBytes = readFileSync(sourcePath);
    const rawPng = readPngDimensions(rawBytes);
    const rawGeometry = assertRawCapture(rawPng);
    await normalizeImage({ input: sourcePath, output: normalizedPath, width: REQUIRED_VIEWPORT.width, height: REQUIRED_VIEWPORT.height });
    const normalizedBytes = readFileSync(normalizedPath);
    const normalizedPng = readPngDimensions(normalizedBytes);
    if (normalizedPng.width !== REQUIRED_VIEWPORT.width || normalizedPng.height !== REQUIRED_VIEWPORT.height) {
      throw new Error(`normalizer did not produce 375x812 PNG: ${normalizedPng.width}x${normalizedPng.height}`);
    }
    const metadata = {
      capturedAt: now().toISOString(),
      route: options.route,
      viewport: { ...REQUIRED_VIEWPORT, devicePixelRatio: runtime.devicePixelRatio },
      rawPng: rawGeometry,
      png: {
        width: normalizedPng.width,
        height: normalizedPng.height,
        bytes: normalizedBytes.length,
        sha256: createHash('sha256').update(normalizedBytes).digest('hex'),
      },
      captureMethod: 'wechatide-mcp simulator_screenshot',
    };
    writeEvidenceAtomically({ output: targets.output, sidecar: targets.sidecar, normalizedBytes, metadata });
    return { output: targets.output, sidecar: targets.sidecar, route: options.route, rawPng: rawGeometry, png: normalizedPng };
  } finally {
    if (client) await client.close();
    rmSync(rawPath, { force: true });
    rmSync(normalizedPath, { force: true });
  }
}

if (require.main === module) {
  runCapture({ argv: process.argv.slice(2) })
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => { process.stderr.write(`[wechatide-mcp-capture] ${error.message}\n`); process.exitCode = 1; });
}

module.exports = {
  assertRawCapture,
  assertLogicalViewport,
  createMcpClient,
  parseArgs,
  readPngDimensions,
  runCapture,
  waitForLogicalViewport,
  waitForScreenshotFile,
  writeEvidenceAtomically,
};

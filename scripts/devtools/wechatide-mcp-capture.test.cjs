const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { PassThrough } = require('node:stream');
const { EventEmitter } = require('node:events');
const test = require('node:test');

const {
  parseArgs,
  assertRawCapture,
  assertLogicalViewport,
  waitForLogicalViewport,
  runCapture,
  createMcpClient,
} = require('./wechatide-mcp-capture.cjs');

function pngHeader(width, height) {
  const bytes = Buffer.alloc(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

function tempOutput() {
  const directory = mkdtempSync(join(tmpdir(), 'cq-talent-wechatide-mcp-'));
  return { directory, output: join(directory, 'capture.png') };
}

function toolResult(payload) {
  return { structuredContent: payload };
}

function fakeClient(calls, { route = '/pages/coach/schedule/index', currentRoutes = [route], rawPath, deferRawFileMs = 0 } = {}) {
  let currentRouteIndex = 0;
  return {
    async callTool(name, args) {
      calls.push({ name, args });
      if (name === 'check_wechatide_status') return toolResult({ loginExpired: false, tokenRequired: false });
      if (name === 'open_project_window') return toolResult({ windowId: 's0' });
      if (name === 'simulator_open_page') return toolResult({ route });
      if (name === 'simulator_refresh') return toolResult({ success: true });
      if (name === 'automation_navigate') return toolResult({ success: true });
      if (name === 'automation_runtime_info') {
        if (args.action === 'currentPage') {
          const currentRoute = currentRoutes[Math.min(currentRouteIndex, currentRoutes.length - 1)];
          currentRouteIndex += 1;
          return toolResult({ path: currentRoute });
        }
        if (args.action === 'systemInfo') return toolResult({ success: true, systemInfo: { result: { windowWidth: 375, windowHeight: 812, pixelRatio: 3 } } });
      }
      if (name === 'simulator_screenshot') {
        if (deferRawFileMs > 0) setTimeout(() => writeFileSync(rawPath, pngHeader(546, 1179)), deferRawFileMs);
        return toolResult({ path: rawPath, imageWidth: 546, imageHeight: 1179 });
      }
      throw new Error(`unexpected fake tool: ${name}`);
    },
    async close() {},
  };
}

test('requires an absolute PNG output and an exact route', () => {
  const parsed = parseArgs([
    '--route', '/pages/coach/schedule/index',
    '--output', 'C:\\temp\\coach-schedule.png',
  ]);
  assert.deepEqual(parsed, {
    route: '/pages/coach/schedule/index',
    output: 'C:\\temp\\coach-schedule.png',
  });
  assert.throws(() => parseArgs(['--route', 'pages/coach/schedule/index', '--output', 'C:\\temp\\shot.png']), /route/i);
  assert.throws(() => parseArgs(['--route', '/pages/coach/schedule/index', '--output', 'shot.jpg']), /PNG/i);
  assert.throws(() => parseArgs(['--route', '/pages/coach/schedule/index', '--output', 'C:\\Users\\ASUS\\Desktop\\shot.png']), /desktop/i);
  assert.throws(() => parseArgs(['--route', '/pages/coach/schedule/index', '--output', 'C:\\Users\\ASUS\\Desktop\\football-club-management-codex-windows-2026-08-02\\tmp\\shot.png']), /repository|worktree/i);
});

test('defaults screenshot output to the isolated system evidence directory', () => {
  const parsed = parseArgs(['--route', '/pages/coach/schedule/index']);
  assert.match(parsed.output, /AppData[\\/]Local[\\/]Temp[\\/]cq-talent-visual-evidence[\\/].+\.png$/i);
});

test('passes an event query separately while preserving an exact evidence route', async () => {
  const { directory, output } = tempOutput();
  const rawPath = join(directory, 'raw.png');
  writeFileSync(rawPath, pngHeader(546, 1179));
  const calls = [];
  const projectPath = 'C:\\workspace\\apps\\miniprogram-cq-talent';

  try {
    const parsed = parseArgs([
      '--route', '/pages/coach/attendance/index',
      '--query', 'id=event-cq-talent-demo-training-upcoming',
      '--output', output,
    ]);
    assert.deepEqual(parsed, {
      route: '/pages/coach/attendance/index',
      query: 'id=event-cq-talent-demo-training-upcoming',
      output,
    });

    await runCapture({
      argv: [
        '--route', '/pages/coach/attendance/index',
        '--query', 'id=event-cq-talent-demo-training-upcoming',
        '--output', output,
      ],
      projectPath,
      createClient: async () => fakeClient(calls, {
        route: '/pages/coach/attendance/index',
        rawPath,
      }),
      normalizeImage: async ({ output: normalizedOutput }) => writeFileSync(normalizedOutput, pngHeader(375, 812)),
    });

    assert.deepEqual(calls.find(({ name }) => name === 'simulator_open_page').args, {
      project: projectPath,
      page: 'pages/coach/attendance/index',
      query: 'id=event-cq-talent-demo-training-upcoming',
    });
    const sidecar = readFileSync(`${output}.json`, 'utf8');
    assert.doesNotMatch(sidecar, /event-cq-talent-demo-training-upcoming/);
    assert.doesNotMatch(sidecar, /\"query\"/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('accepts the observed WeChatIDE raw raster and rejects a non-viewport raster', () => {
  assert.deepEqual(assertRawCapture({ width: 546, height: 1179 }), {
    width: 546,
    height: 1179,
    scaleX: 546 / 375,
    scaleY: 1179 / 812,
  });
  assert.throws(() => assertRawCapture({ width: 546, height: 900 }), /viewport aspect ratio/i);
});

test('accepts iPhone X screen dimensions when WeChat window excludes system chrome', () => {
  assert.deepEqual(assertLogicalViewport({
    systemInfo: {
      result: {
        screenWidth: 375,
        screenHeight: 812,
        windowWidth: 375,
        windowHeight: 724,
        pixelRatio: 3,
      },
    },
  }), {
    width: 375,
    height: 724,
    screenWidth: 375,
    screenHeight: 812,
    devicePixelRatio: 3,
  });
});

test('waits for a populated runtime viewport after a refresh', async () => {
  const payloads = [
    { success: true, systemInfo: { result: {} } },
    { success: true, systemInfo: { result: { screenWidth: 375, screenHeight: 812, windowWidth: 375, windowHeight: 724, pixelRatio: 3 } } },
  ];
  let calls = 0;
  const result = await waitForLogicalViewport({
    readRuntime: async () => payloads[Math.min(calls++, payloads.length - 1)],
    timeoutMs: 20,
    sleepImpl: async () => {},
  });
  assert.equal(calls, 2);
  assert.deepEqual(result, {
    width: 375,
    height: 724,
    screenWidth: 375,
    screenHeight: 812,
    devicePixelRatio: 3,
  });
});

test('publishes a normalized PNG and non-sensitive sidecar only after every check', async () => {
  const { directory, output } = tempOutput();
  const rawPath = join(directory, 'raw.png');
  writeFileSync(rawPath, pngHeader(546, 1179));
  const calls = [];
  const projectPath = 'C:\\Users\\ASUS\\Desktop\\football-club-management-codex-windows-2026-08-02\\apps\\miniprogram-cq-talent';

  try {
    const result = await runCapture({
      argv: ['--route', '/pages/coach/schedule/index', '--output', output],
      projectPath,
      createClient: async () => fakeClient(calls, { rawPath }),
      normalizeImage: async ({ output: normalizedOutput }) => writeFileSync(normalizedOutput, pngHeader(375, 812)),
      now: () => new Date('2026-08-18T06:00:00.000Z'),
    });

    assert.equal(result.route, '/pages/coach/schedule/index');
    assert.deepEqual(calls.map(({ name }) => name), [
      'check_wechatide_status',
      'open_project_window',
      'simulator_refresh',
      'simulator_open_page',
      'automation_navigate',
      'automation_runtime_info',
      'automation_runtime_info',
      'simulator_screenshot',
    ]);
    assert.equal(calls.at(-1).args.project, projectPath);
    assert.equal(calls.at(-1).args.optimize, false);
    assert.equal(calls.at(-1).args.waitForSelector, 'view');
    assert.equal(readFileSync(output).readUInt32BE(16), 375);
    assert.equal(readFileSync(output).readUInt32BE(20), 812);
    const sidecar = JSON.parse(readFileSync(`${output}.json`, 'utf8'));
    assert.equal(sidecar.captureMethod, 'wechatide-mcp simulator_screenshot');
    assert.deepEqual(sidecar.route, '/pages/coach/schedule/index');
    assert.deepEqual(sidecar.png, {
      width: 375,
      height: 812,
      bytes: 33,
      sha256: 'f3bb92deb9d984dfb65c74e0bb42aa25e8152ae2a6d0dbee98302033a6f6ea28',
    });
    assert.deepEqual(sidecar.rawPng, {
      width: 546,
      height: 1179,
      scaleX: 546 / 375,
      scaleY: 1179 / 812,
    });
    assert.equal(sidecar.projectPath, undefined);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('waits for a WeChatIDE screenshot file that is reported before it reaches disk', async () => {
  const { directory, output } = tempOutput();
  const rawPath = join(directory, 'delayed-raw.png');

  try {
    await runCapture({
      argv: ['--route', '/pages/coach/schedule/index', '--output', output],
      projectPath: 'C:\\workspace\\apps\\miniprogram-cq-talent',
      createClient: async () => fakeClient([], { rawPath, deferRawFileMs: 25 }),
      normalizeImage: async ({ output: normalizedOutput }) => writeFileSync(normalizedOutput, pngHeader(375, 812)),
      screenshotFileTimeoutMs: 500,
    });
    assert.equal(existsSync(output), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('does not publish evidence when the verified route is wrong', async () => {
  const { directory, output } = tempOutput();
  const rawPath = join(directory, 'raw.png');
  writeFileSync(rawPath, pngHeader(546, 1179));
  try {
    await assert.rejects(() => runCapture({
      argv: ['--route', '/pages/coach/schedule/index', '--output', output],
      projectPath: 'C:\\workspace\\apps\\miniprogram-cq-talent',
      createClient: async () => fakeClient([], { route: '/pages/login/index', rawPath }),
      normalizeImage: async ({ output: normalizedOutput }) => writeFileSync(normalizedOutput, pngHeader(375, 812)),
      routePollTimeoutMs: 1,
      sleepImpl: async () => {},
    }), /route/i);
    assert.equal(existsSync(output), false);
    assert.equal(existsSync(`${output}.json`), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('waits for simulator_open_page to replace the previous route before capturing', async () => {
  const { directory, output } = tempOutput();
  const rawPath = join(directory, 'raw.png');
  writeFileSync(rawPath, pngHeader(546, 1179));
  const calls = [];
  try {
    await runCapture({
      argv: ['--route', '/pages/coach/attendance/index', '--output', output],
      projectPath: 'C:\\workspace\\apps\\miniprogram-cq-talent',
      createClient: async () => fakeClient(calls, {
        route: '/pages/coach/attendance/index',
        currentRoutes: ['/pages/coach/schedule/index', '/pages/coach/attendance/index'],
        rawPath,
      }),
      normalizeImage: async ({ output: normalizedOutput }) => writeFileSync(normalizedOutput, pngHeader(375, 812)),
      routePollTimeoutMs: 10,
      sleepImpl: async () => {},
    });
    assert.equal(calls.filter(({ name }) => name === 'automation_runtime_info').length, 3);
    assert.equal(existsSync(output), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fakeMcpSpawn({ toolNames = ['check_wechatide_status', 'open_project_window', 'simulator_open_page', 'simulator_refresh', 'automation_navigate', 'automation_runtime_info', 'simulator_screenshot'] } = {}) {
  const calls = [];
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  const child = new EventEmitter();
  child.stdout = stdout;
  child.stderr = stderr;
  child.stdin = stdin;
  child.stdin.write = (chunk) => {
    const message = JSON.parse(String(chunk).trim());
    calls.push(message);
    if (message.method === 'initialize') {
      stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'wechatide' } } })}\n`);
    } else if (message.method === 'tools/list') {
      stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { tools: toolNames.map((name) => ({ name })) } })}\n`);
    } else if (message.method === 'tools/call') {
      stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { structuredContent: { ok: true, tool: message.params.name } } })}\n`);
    }
    return true;
  };
  child.stdin.end = () => { child.emit('exit', 0); };
  return { child, calls };
}

test('initializes MCP once, lists tools, and correlates tool calls', async () => {
  const fake = fakeMcpSpawn();
  const client = createMcpClient({
    command: 'C:\\Program Files\\WechatIDE\\wechatide.cmd',
    spawnImpl: () => fake.child,
  });
  try {
    await client.ready;
    const result = await client.callTool('simulator_screenshot', { optimize: false });
    assert.deepEqual(result.structuredContent, { ok: true, tool: 'simulator_screenshot' });
    assert.deepEqual(fake.calls.map(({ method }) => method), ['initialize', 'notifications/initialized', 'tools/list', 'tools/call']);
  } finally {
    await client.close();
  }
});

test('rejects a connection when a required MCP tool is unavailable', async () => {
  const fake = fakeMcpSpawn({ toolNames: ['check_wechatide_status'] });
  const client = createMcpClient({ spawnImpl: () => fake.child });
  await assert.rejects(() => client.ready, /MCP tool is unavailable: open_project_window/);
  await client.close();
});

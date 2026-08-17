const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');

const {
  buildCliArgs,
  readIdeHttpPort,
  readAutomationSession,
  resolveAutomationPort,
} = require('./automation-session.cjs');

test('resolves the automation port from the single session state file', () => {
  const root = mkdtempSync(join(tmpdir(), 'cq-devtools-'));
  try {
    const statePath = join(root, 'session.json');
    writeFileSync(statePath, JSON.stringify({
      version: 1,
      automationPort: 9432,
      projectPath: 'C:\\workspace\\mini-program',
      createdAt: '2026-08-17T00:00:00.000Z',
    }));

    assert.equal(resolveAutomationPort({ statePath, env: {} }), 9432);
    assert.equal(readAutomationSession(statePath).automationPort, 9432);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a screenshot when no active automation session is known', () => {
  assert.throws(
    () => resolveAutomationPort({ statePath: join(tmpdir(), 'missing-cq-session.json'), env: {} }),
    /No active WeChat DevTools Automator session/,
  );
});

test('passes the active IDE HTTP port separately from the Automator WebSocket port', () => {
  assert.deepEqual(
    buildCliArgs({
      projectPath: 'C:\\workspace\\mini-program',
      automationPort: 9432,
      ideHttpPort: 14535,
    }),
    [
      'auto',
      '--project',
      'C:\\workspace\\mini-program',
      '--auto-port',
      '9432',
      '--port',
      '14535',
      '--lang',
      'zh',
    ],
  );
});

test('uses an explicit IDE HTTP port only for CLI registration', () => {
  assert.equal(readIdeHttpPort({ env: { MP_IDE_HTTP_PORT: '14535' } }), 14535);
});

test('all tracked Automator helpers use the shared session resolver instead of a private fallback port', () => {
  const helpers = [
    'apps/miniprogram-cq-talent/scripts/devtools-screenshot.mjs',
    'scripts/devtools/mp-route-shot.cjs',
    'scripts/devtools/mp-route-shot-bottom.cjs',
    'scripts/devtools/mp-batch-shot.cjs',
    'scripts/devtools/mp-smoke.cjs',
    'scripts/devtools/mp-eval.cjs',
    'scripts/devtools/mp-plant-session.cjs',
    'scripts/devtools/mp-snap.cjs',
    'scripts/devtools/mp-page-data.cjs',
    'scripts/devtools/page-data.cjs',
    'scripts/devtools/mp-console-listen.cjs',
    'scripts/devtools/mp-tap-auth.cjs',
    'scripts/devtools/mp-tap-authorize.cjs',
  ];
  for (const relativePath of helpers) {
    const source = readFileSync(join(__dirname, '..', '..', relativePath), 'utf8');
    assert.match(source, /resolveAutomationPort/, relativePath);
  }
});

/** Read-only baseline diagnostics. Run from repository root; no network calls. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

async function main() {
  const root = process.cwd();
  const mp = path.join(root, 'apps/miniprogram-cq-talent');
  const source = fs.readFileSync(path.join(mp, 'utils/request.ts'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  let current = { token: 'session-A' };
  let redirects = 0;
  const pending = [];
  const mocks = {
    './config': {
      assertRuntimeApiConfigured: () => 'https://example.invalid',
      RUNTIME_ENV: 'develop', DEV_MODE: false,
    },
    './idempotency': { createRequestId: () => 'probe', createIdempotencyKey: () => 'probe-key' },
    './store': {
      getAppContext: () => null, getSession: () => current,
      clearSession: () => { current = null; },
    },
  };
  const sandbox = {
    exports: {}, require: (name) => mocks[name],
    wx: { request: (options) => pending.push(options), reLaunch: () => redirects++ },
  };
  vm.runInNewContext(code, sandbox, { filename: 'request-probe.js' });
  const request = sandbox.exports.request;
  const old = request({ path: '/read' }).catch((error) => error);
  current = { token: 'session-B' };
  pending.shift().success({ statusCode: 401, data: { error: { code: 'expired' } } });
  await old;
  const stale401 = { sessionAfter: current, redirects };
  current = { token: 'session-C' };
  redirects = 0;
  const concurrent = [1, 2, 3].map(() => request({ path: '/read' }).catch((error) => error));
  pending.splice(0).forEach((options) => options.success({ statusCode: 401, data: { error: { code: 'expired' } } }));
  await Promise.all(concurrent);
  const concurrent401 = { requests: 3, redirects };

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-technology-type-probe-'));
  let typeProbe;
  try {
    const file = path.join(temp, 'probe.ts');
    fs.writeFileSync(file, 'Page<{ count: number }>({ data: { count: "wrong-type" }, onLoad: "not-a-function" });\nComponent({ methods: 123 });\n');
    const program = ts.createProgram([path.join(mp, 'types/wechat.d.ts'), file], {
      strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022,
      lib: ['lib.es2022.d.ts'], types: [],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    typeProbe = {
      diagnosticCount: diagnostics.length,
      messages: diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, ' ')),
    };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ stale401, concurrent401, typeProbe }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

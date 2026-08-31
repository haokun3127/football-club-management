// 只截当前页，不导航。用法: node scripts/devtools/mp-snap.cjs "<输出绝对路径>.png"
const automator = require("miniprogram-automator");
const { resolveAutomationPort } = require("./automation-session.cjs");
const { createDefaultVisualEvidencePath } = require("./visual-evidence-path.cjs");

const out = process.argv[2] || createDefaultVisualEvidencePath("current-page");
const port = String(resolveAutomationPort());

(async () => {
  const mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` });
  const page = await mp.currentPage();
  console.log("route:", page.path, JSON.stringify(page.query));
  const deadline = Date.now() + 60_000;
  let ok = false;
  let lastErr;
  while (Date.now() < deadline) {
    try { await mp.screenshot({ path: out }); ok = true; break; } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 4000)); }
  }
  await mp.disconnect();
  if (!ok) { console.error("FAIL timeout:screenshot", lastErr?.message || lastErr); process.exit(1); }
  console.log("shot ok:", out);
})().catch(async (e) => { console.error("FAIL", e.message || e); process.exit(1); });

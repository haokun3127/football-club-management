// 点登录页的授权按钮（WXML button，automator 可点）
const path = require("path");
const automator = require(path.resolve(__dirname, "../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator"));
(async () => {
  const port = process.env.MP_AUTO_PORT || "9432";
  const mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` });
  const page = await mp.currentPage();
  console.log("route:", page.path);
  const btn = await page.$(".login-cta");
  if (!btn) { console.error("FAIL: .login-cta not found"); process.exit(1); }
  await btn.tap();
  console.log("tapped .login-cta");
  await new Promise((r) => setTimeout(r, 2500));
  await mp.disconnect();
})().catch((e) => { console.error("FAIL", e.message || e); process.exit(1); });

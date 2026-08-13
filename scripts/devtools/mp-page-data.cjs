const path = require("path");
const automator = require(path.resolve(__dirname, "../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator"));
(async () => {
  const mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${process.env.MP_AUTO_PORT || "9432"}` });
  const page = await mp.currentPage();
  console.log("route:", page.path);
  const data = await page.data();
  console.log(JSON.stringify({ state: data.state, message: data.message, submitting: data.submitting, authorizationLocked: data.authorizationLocked }));
  await mp.disconnect();
})().catch((e) => { console.error("FAIL", e.message || e); process.exit(1); });

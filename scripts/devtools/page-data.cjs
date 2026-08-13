const path = require("path");
const automator = require(path.resolve(__dirname, "../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator"));
function race(p, ms, label) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout:" + label)), ms))]); }
// Dump a page's data: node page-data.cjs <route> [jsonPath]
(async () => {
  const port = process.env.MP_AUTO_PORT || "9430";
  const mp = await race(automator.connect({ wsEndpoint: "ws://127.0.0.1:" + port }), 10000, "connect");
  const route = process.argv[2];
  let page = await race(mp.currentPage(), 8000, "currentPage");
  if (route && (!page || page.path !== route.split("?")[0])) {
    try { await race(mp.callWxMethod("reLaunch", { url: "/" + route }), 9000, "wx-reLaunch"); } catch (e) {}
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      page = await race(mp.currentPage(), 8000, "poll");
      if (page && page.path === route.split("?")[0]) break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  const key = process.argv[3];
  const data = await race(page.data(key || undefined), 15000, "data");
  console.log(JSON.stringify(data, null, 1).slice(0, 12000));
  await mp.disconnect();
})().catch((e) => { console.log("FAIL", e.message); process.exit(0); });

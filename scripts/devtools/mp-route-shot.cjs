// 微信开发者工具模拟器：路由跳转 + 375x812 截图
// 用法: node scripts/devtools/mp-route-shot.cjs "<route><?query>" "<输出绝对路径>.png" [force]
// 端口: 默认 9429，可用环境变量 MP_AUTO_PORT 覆盖（会话失效就换端口并重新 cli auto 注册）
const path = require("path");
const automator = require(path.resolve(__dirname, "../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator"));
const PORT = process.env.MP_AUTO_PORT || "9429";
function race(p, ms, label) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout:" + label)), ms))]); }
(async () => {
  const mp = await race(automator.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT }), 10000, "connect");
  const route = process.argv[2]; // e.g. pages/parent/schedule/index?id=xxx
  const out = process.argv[3];
  let page = await race(mp.currentPage(), 8000, "currentPage-1");
  console.log("route-before:", page && page.path);
  const force = process.argv[4] === "force";
  if (force || !page || page.path !== route.split("?")[0]) {
    const target = "/" + route;
    // 关键: automator 的 reLaunch/navigateTo promise 会挂起报空错，必须走 callWxMethod 通道
    try { await race(mp.callWxMethod("reLaunch", { url: target }), 9000, "wx-reLaunch"); } catch (e) { console.log("wx-reLaunch-race:", e.message); }
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      page = await race(mp.currentPage(), 8000, "currentPage-poll");
      if (page && page.path === route.split("?")[0]) break;
    }
    console.log("route-after:", page && page.path);
  }
  await new Promise((r) => setTimeout(r, 1500));
  await race(mp.screenshot({ path: out }), 60000, "screenshot");
  console.log("shot ok", out);
  await mp.disconnect();
})().catch((e) => { console.log("FAIL", e.message); process.exit(0); });

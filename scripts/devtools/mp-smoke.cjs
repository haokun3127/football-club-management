const path = require("path");
const automator = require(path.resolve(__dirname, "../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator"));
function race(p, ms, label) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout:" + label)), ms))]); }
// Smoke-check page states in ONE connection: node mp-smoke.cjs <routes.json>
// routes.json: ["pages/...?id=x", ...] — logs route | state | message
(async () => {
  const port = process.env.MP_AUTO_PORT || "9430";
  const routes = require(path.resolve(process.argv[2]));
  const mp = await race(automator.connect({ wsEndpoint: "ws://127.0.0.1:" + port }), 10000, "connect");
  const readTop = () => race(mp.evaluate(new Function("return (function(){var p=getCurrentPages();var t=p[p.length-1];if(!t)return null;var d=t.data||{};return {route:t.route,state:d.state===undefined?'(none)':d.state,message:d.message||''};})()")), 8000, "evaluate");
  for (const route of routes) {
    try {
      try { await race(mp.callWxMethod("reLaunch", { url: "/" + route }), 9000, "reLaunch"); } catch (e) {}
      const base = route.split("?")[0];
      let top = null;
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 400));
        top = await readTop();
        if (top && top.route === base && top.state !== "loading") break;
      }
      if (!top || top.route !== base) {
        console.log("REDIR", route, "->", top ? top.route : "none");
        continue;
      }
      console.log(top.state === "error" ? "ERROR" : "OK", route, "|", top.state, "|", top.message);
    } catch (e) {
      console.log("FAIL", route, e.message);
    }
  }
  await mp.disconnect();
})().catch((e) => { console.log("FAIL", e.message); process.exit(0); });

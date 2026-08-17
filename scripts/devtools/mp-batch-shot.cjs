const path = require("path");
const automator = require(path.resolve(__dirname, "../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator"));
const { resolveAutomationPort } = require("./automation-session.cjs");
function race(p, ms, label) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout:" + label)), ms))]); }
// Batch screenshots in ONE connection: node mp-batch-shot.cjs <manifest.json>
// manifest: [{ "route": "pages/...?id=x", "out": "abs path.png", "settleMs": 800 }, ...]
(async () => {
  const port = String(resolveAutomationPort());
  const manifest = require(path.resolve(process.argv[2]));
  const mp = await race(automator.connect({ wsEndpoint: "ws://127.0.0.1:" + port }), 10000, "connect");
  for (const item of manifest) {
    const t0 = Date.now();
    try {
      if (!item.skipNav) {
        try { await race(mp.callWxMethod("reLaunch", { url: "/" + item.route }), 9000, "reLaunch"); } catch (e) {}
        const base = item.route.split("?")[0];
        for (let i = 0; i < 24; i++) {
          const page = await race(mp.currentPage(), 8000, "poll");
          if (page && page.path === base) break;
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      await new Promise((r) => setTimeout(r, item.settleMs || 900));
      // path-variant screenshot can hang in DevTools; base64 variant is reliable
      const b64 = await race(mp.screenshot(), 30000, "screenshot");
      require("fs").writeFileSync(item.out, Buffer.from(b64, "base64"));
      console.log("OK", item.route, path.basename(item.out), (Date.now() - t0) + "ms");
    } catch (e) {
      console.log("FAIL", item.route, e.message);
    }
  }
  await mp.disconnect();
})().catch((e) => { console.log("FATAL", e.message); process.exit(0); });

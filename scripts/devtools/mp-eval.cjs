const path = require("path");
const automator = require(path.resolve(__dirname, "../../apps/miniprogram-cq-talent/node_modules/miniprogram-automator"));
function race(p, ms, label) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout:" + label)), ms))]); }
// Evaluate JS in app context: node mp-eval.cjs "<expression returning JSON-serializable>"
(async () => {
  const port = process.env.MP_AUTO_PORT || "9430";
  const mp = await race(automator.connect({ wsEndpoint: "ws://127.0.0.1:" + port }), 10000, "connect");
  const expr = process.argv[2];
  const result = await race(mp.evaluate(new Function("return (" + expr + ")")), 20000, "evaluate");
  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 1).slice(0, 15000));
  await mp.disconnect();
})().catch((e) => { console.log("FAIL", e.message); process.exit(0); });

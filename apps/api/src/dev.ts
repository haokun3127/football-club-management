import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (process.env.FCM_RUNTIME_ENV && process.env.FCM_RUNTIME_ENV !== "develop") {
  throw new Error("The local dev entrypoint only supports develop");
}
if (process.env.HOST && process.env.HOST !== "127.0.0.1") {
  throw new Error("Debug identity is restricted to the localhost dev entrypoint");
}
process.env.FCM_RUNTIME_ENV = "develop";
process.env.NODE_ENV = "development";
process.env.HOST = "127.0.0.1";
process.env.WECHAT_MINIPROGRAM_APP_ID ??= "wx4c588cd106e520e0";
process.env.DATABASE_URL ??= join(realpathSync(tmpdir()), "cq-talent-develop", "api.sqlite");
await import("./index.js");

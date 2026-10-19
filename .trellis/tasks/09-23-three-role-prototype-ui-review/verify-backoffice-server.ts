// Local synthetic browser fixture. Never connects to remote databases or the WeChat API.
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createPlatformPersistence } from "../../../apps/api/src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../../../apps/api/src/store.js";
import { createProductionMembershipResolver } from "../../../apps/api/src/auth/context.js";
import { hashBackofficePassword } from "../../../apps/api/src/auth/backoffice.js";
import { readBackofficeConfig } from "../../../apps/api/src/runtime/backoffice.js";
import { buildServer } from "../../../apps/api/src/server.js";
const directory = mkdtempSync(join(tmpdir(), "cq-backoffice-browser-"));
const p = await createPlatformPersistence({ databasePath: join(directory, "api.sqlite") });
await p.repositories.backofficeAuth.provision({ clubId: "club-chongqing-talent", userId: "user-admin-1", username: "reviewer", passwordHash: await hashBackofficePassword("synthetic-browser-password") });
const backoffice = readBackofficeConfig("develop", "http://127.0.0.1:3991/__env/develop/backoffice")!;
const app = buildServer(new PersistentApiStore(p.repositories), { logger: false, runtimeConfig: { environment: "develop", databasePath: join(directory, "api.sqlite"), wechatAppId: "wx4c588cd106e520e0", backoffice }, membershipResolver: createProductionMembershipResolver(p.repositories.users, p.repositories.memberships) });
await app.ready();
const server = createServer(async (request, response) => {
  // Same fixed prefix stripping as the deployed proxy; no production fallback.
  if (!request.url?.startsWith("/__env/develop/backoffice")) { response.writeHead(404).end(); return; }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) { chunks.push(Buffer.from(chunk)); if (chunks.reduce((n, c) => n + c.length, 0) > 8192) throw new Error("oversized fixture request"); }
    const result = await app.inject({ method: request.method as "GET" | "POST", url: request.url.slice("/__env/develop".length), headers: request.headers, ...(chunks.length ? { payload: Buffer.concat(chunks) } : {}) });
    response.writeHead(result.statusCode, result.headers); response.end(result.rawPayload);
  } catch { response.writeHead(500).end(); }
});
server.listen(3991, "127.0.0.1", () => process.stdout.write("Synthetic backoffice browser fixture: http://127.0.0.1:3991/__env/develop/backoffice/\n"));
const stop = async () => { server.close(); await app.close(); p.database.close(); rmSync(directory, { recursive: true, force: true }); process.exit(0); };
process.on("SIGTERM", () => void stop()); process.on("SIGINT", () => void stop());

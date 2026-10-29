import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createPlatformPersistence } from "../../apps/api/src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../../apps/api/src/auth/context.js";
import { hashBackofficePassword } from "../../apps/api/src/auth/backoffice.js";
import { PersistentApiStore } from "../../apps/api/src/store.js";
import { buildServer } from "../../apps/api/src/server.js";
import { readBackofficeConfig } from "../../apps/api/src/runtime/backoffice.js";

// Disposable synthetic data only. This fixture never accepts an existing database path.
const directory = mkdtempSync(join(tmpdir(), "fcm-backoffice-browser-"));
const databasePath = join(directory, "api.sqlite");
const persistence = await createPlatformPersistence({
  databasePath,
  identityKeyring: {
    activeVersion: "fixture",
    keys: [
      {
        version: "fixture",
        digestKey: randomBytes(32).toString("hex"),
        encryptionKey: randomBytes(32).toString("hex"),
      },
    ],
  },
});
const username = "local-reviewer",
  password = randomBytes(24).toString("base64url");
await persistence.repositories.backofficeAuth.provision({
  clubId: "club-chongqing-talent",
  userId: "user-admin-1",
  username,
  passwordHash: await hashBackofficePassword(password),
});
persistence.repositories.backofficeManagement.replaceGrants(
  "club-chongqing-talent",
  "user-admin-1",
  [
    "sensitive",
    "export",
    "assessment",
    "assessment_entry",
    "service",
    "finance",
  ],
);
// Teaching authority exists only in this disposable synthetic fixture.
process.env.FCM_ASSESSMENT_PUBLICATION_CLUBS = "club-chongqing-talent";
const now = new Date().toISOString();
await persistence.repositories.coaches.save({
  id: "fixture-admin-coach",
  clubId: "club-chongqing-talent",
  userId: "user-admin-1",
  name: "本地合成教学身份",
  specialties: [],
  status: "active",
  createdAt: now,
  updatedAt: now,
});
await persistence.repositories.coachAssignments.save({
  id: "fixture-admin-assignment",
  clubId: "club-chongqing-talent",
  teamId: "team-u10-dev",
  coachId: "fixture-admin-coach",
  role: "assistant_coach",
  createdAt: now,
  updatedAt: now,
});
let app: ReturnType<typeof buildServer>;
const listener = createServer((request, response) => {
  if (!request.url?.startsWith("/__env/develop/backoffice") && request.url?.split("?")[0] !== "/__env/develop/health") {
    response.writeHead(404);
    response.end();
    return;
  }
  request.url = request.url.slice("/__env/develop".length);
  app.routing(request, response);
});
await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
const address = listener.address();
if (!address || typeof address === "string")
  throw new Error("Missing fixture address");
const url = `http://127.0.0.1:${address.port}/__env/develop/backoffice`;
app = buildServer(new PersistentApiStore(persistence.repositories), {
  logger: false,
  membershipResolver: createProductionMembershipResolver(
    persistence.repositories.users,
    persistence.repositories.memberships,
  ),
  runtimeConfig: {
    environment: "develop",
    databasePath,
    wechatAppId: "wx4c588cd106e520e0",
    backoffice: readBackofficeConfig("develop", url),
  },
});
await app.ready();
writeFileSync(
  join(directory, "credentials.json"),
  JSON.stringify({ username, password }),
  { mode: 0o600 },
);
console.log(JSON.stringify({ url: `${url}/`, directory }));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  await app.close();
  persistence.database.close();
  rmSync(directory, { recursive: true, force: true });
}
process.once("SIGTERM", () => void stop());
process.once("SIGINT", () => void stop());

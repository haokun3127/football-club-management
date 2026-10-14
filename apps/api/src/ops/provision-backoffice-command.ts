import { existsSync } from "node:fs";
import { readRuntimeConfig } from "../runtime/environment.js";
import { openRuntimeDatabase } from "../persistence/runtime-database.js";
import { createPlatformRepositories } from "../persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../auth/context.js";
import { backofficeAdmin, hashBackofficePassword } from "../auth/backoffice.js";

// Private JSON on stdin only: {clubId,userId,username,password}. No passwords in argv/logs.
const config = readRuntimeConfig();
if (config.environment === "release" || !process.argv.includes("--apply") || process.env.FCM_IDENTITY_BACKUP_ATTESTED !== "1" || !config.backoffice || !existsSync(config.databasePath)) {
  throw new Error("Provisioning requires an existing backed-up develop/trial database, configured backoffice URL and --apply");
}
let input = "";
for await (const chunk of process.stdin) { input += String(chunk); if (Buffer.byteLength(input) > 4096) throw new Error("Credential input too large"); }
let value: { clubId: string; userId: string; username: string; password: string };
try { value = JSON.parse(input); } catch { throw new Error("Expected private credential JSON on stdin"); }
input = "";
if (!value || typeof value.clubId !== "string" || typeof value.userId !== "string" || !value.clubId || !value.userId || typeof value.username !== "string" || !/^[a-z0-9._-]{3,64}$/.test(value.username) || typeof value.password !== "string") throw new Error("Invalid credential fields");
const database = openRuntimeDatabase(config);
try {
  // Operational provisioning never migrates, seeds, creates memberships or expands roles.
  const repositories = createPlatformRepositories(database);
  const memberships = createProductionMembershipResolver(repositories.users, repositories.memberships);
  if (!backofficeAdmin(await memberships.resolveByUserId!(value.clubId, value.userId))) throw new Error("Existing active administrative membership required");
  if (repositories.backofficeAuth.credential(value.clubId, value.username) && !process.argv.includes("--rotate")) throw new Error("Account already configured; explicit --rotate is required to replace its password");
  const passwordHash = await hashBackofficePassword(value.password); value.password = "";
  await repositories.backofficeAuth.provision({ clubId: value.clubId, userId: value.userId, username: value.username, passwordHash });
  process.stdout.write(JSON.stringify({ status: "configured", environment: config.environment }) + "\n");
} finally { database.close(); }

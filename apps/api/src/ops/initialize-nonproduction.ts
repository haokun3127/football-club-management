import { readRuntimeConfig } from "../runtime/environment.js";
import { createPlatformPersistence, seedPlatformData } from "../persistence/platform-persistence.js";

const config = readRuntimeConfig();
if (config.environment === "release") throw new Error("Synthetic initialization is forbidden for release");
if (!process.argv.includes("--synthetic")) throw new Error("Pass --synthetic to initialize a fresh nonproduction database");
const persistence = await createPlatformPersistence({ runtimeConfig: config, seed: false });
try {
  const users = persistence.database.prepare("SELECT COUNT(*) AS count FROM user_accounts").get();
  if (Number(users?.count) !== 0) throw new Error("Database already contains users; refusing to overwrite its identities or business data");
  persistence.database.exec("BEGIN");
  try {
    await seedPlatformData(persistence.repositories);
    persistence.database.exec("COMMIT");
  } catch (error) { persistence.database.exec("ROLLBACK"); throw error; }
  console.log(JSON.stringify({ environment: config.environment, initialized: true, data: "synthetic" }));
} finally { persistence.database.close(); }

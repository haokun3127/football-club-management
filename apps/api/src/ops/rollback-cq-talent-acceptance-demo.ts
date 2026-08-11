import { openSqliteDatabase, migrate } from "../persistence/sqlite.js";
import { rollbackCqTalentAcceptanceDemo } from "./cq-talent-acceptance-demo.js";

if (!process.argv.includes("--confirm-cq-talent-acceptance-demo")) {
  throw new Error("Refusing rollback without --confirm-cq-talent-acceptance-demo.");
}

const databasePath = process.env.DATABASE_URL;
if (!databasePath) {
  throw new Error("DATABASE_URL is required for acceptance demo rollback.");
}

const database = openSqliteDatabase(databasePath);
try {
  migrate(database);
  const result = rollbackCqTalentAcceptanceDemo(database);
  console.log(JSON.stringify({ status: "rolled_back", ...result }));
} finally {
  database.close();
}

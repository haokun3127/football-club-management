import { migrate, openSqliteDatabase } from "./persistence/sqlite.js";

const databasePath = process.env.DATABASE_URL ?? "apps/api/data/dev.sqlite";
const database = openSqliteDatabase(databasePath);
const result = migrate(database);

console.log(JSON.stringify({ databasePath, ...result }, null, 2));
database.close();

import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

export function openSqliteDatabase(path = process.env.DATABASE_URL ?? ":memory:"): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const database = new DatabaseSync(path);
  database.exec("PRAGMA foreign_keys = ON;");
  return database;
}

function migrationsDirectory(): string {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));

  return join(currentDirectory, "../../db/migrations");
}

export function migrate(database: DatabaseSync, directory = migrationsDirectory()): MigrationResult {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = database.prepare("SELECT version FROM schema_migrations").all() as Array<{ version: string }>;
  const appliedVersions = new Set(appliedRows.map((row) => row.version));
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const result: MigrationResult = {
    applied: [],
    skipped: [],
  };

  for (const file of files) {
    if (appliedVersions.has(file)) {
      result.skipped.push(file);
      continue;
    }

    const sql = readFileSync(join(directory, file), "utf8");
    database.exec("BEGIN;");

    try {
      database.exec(sql);
      database.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        file,
        new Date().toISOString(),
      );
      database.exec("COMMIT;");
      result.applied.push(file);
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }

  return result;
}

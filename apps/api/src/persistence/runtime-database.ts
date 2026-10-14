import { existsSync, lstatSync } from "node:fs";
import { basename, dirname, isAbsolute, normalize, parse } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { RuntimeConfig } from "../runtime/environment.js";
import { openSqliteDatabase } from "./sqlite.js";

/** Validate before creating directories, opening writable SQLite, migrating or seeding. */
export function openRuntimeDatabase(config: RuntimeConfig): DatabaseSync {
  const path = config.databasePath;
  if (!isAbsolute(path) || normalize(path) !== path) {
    throw new Error("DATABASE_URL must be a normalized absolute SQLite file path");
  }
  if (config.environment !== "release"
    && (basename(dirname(path)) !== `cq-talent-${config.environment}` || basename(path) !== "api.sqlite")) {
    throw new Error("Non-release database must use its dedicated cq-talent-<environment>/api.sqlite path");
  }
  // Include sidecars so a linked WAL cannot redirect writes outside this environment.
  for (const target of [path, `${path}-wal`, `${path}-shm`, `${path}-journal`]) {
    for (let part = target; part !== parse(part).root; part = dirname(part)) {
      let stat;
      try { stat = lstatSync(part); } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) {
        throw new Error("Runtime database paths must not contain symbolic or hard links");
      }
    }
  }
  if (existsSync(path)) {
    const probe = new DatabaseSync(path, { readOnly: true });
    try {
      const hasMarker = probe.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'runtime_environment'").get();
      const marker = hasMarker
        ? probe.prepare("SELECT environment FROM runtime_environment WHERE id = 1").get()
        : undefined;
      if (marker ? marker.environment !== config.environment : config.environment !== "release") {
        throw new Error("Database environment is missing or mismatched; refusing migration/seed");
      }
    } finally {
      probe.close();
    }
  }
  const database = openSqliteDatabase(path);
  try {
    database.exec("CREATE TABLE IF NOT EXISTS runtime_environment (id INTEGER PRIMARY KEY CHECK (id = 1), environment TEXT NOT NULL CHECK (environment IN ('develop', 'trial', 'release')))");
    database.prepare("INSERT OR IGNORE INTO runtime_environment (id, environment) VALUES (1, ?)").run(config.environment);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

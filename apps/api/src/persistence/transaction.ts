import type { DatabaseSync } from "node:sqlite";
import { SerialOperation } from "../application/serial-operation.js";

const queues = new WeakMap<DatabaseSync, SerialOperation>();

/** Async transactions sharing one SQLite connection must not overlap. */
export function transaction<T>(database: DatabaseSync, operation: () => Promise<T>): Promise<T> {
  let queue = queues.get(database);
  if (!queue) { queue = new SerialOperation(); queues.set(database, queue); }
  return queue.run(async () => {
    database.exec("BEGIN;");
    try {
      const result = await operation();
      database.exec("COMMIT;");
      return result;
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  });
}

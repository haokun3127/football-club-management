import { readRuntimeConfig } from "./runtime/environment.js";
import { openRuntimeDatabase } from "./persistence/runtime-database.js";
import { migrate } from "./persistence/sqlite.js";

const config = readRuntimeConfig();
const database = openRuntimeDatabase(config);
try {
  console.log(JSON.stringify({ environment: config.environment, ...migrate(database) }, null, 2));
} finally {
  database.close();
}

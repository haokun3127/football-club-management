#!/usr/bin/env node
// Local-only verification of the built operational entrypoints. No deployment credentials.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = realpathSync(mkdtempSync(join(tmpdir(), "fcm-runtime-verify-")));
const appId = "wx4c588cd106e520e0";
const runtimeEnv = (environment, databasePath) => ({
  NODE_ENV: "production", FCM_RUNTIME_ENV: environment, DATABASE_URL: databasePath,
  WECHAT_MINIPROGRAM_APP_ID: appId, HOST: "127.0.0.1", PORT: "0",
});
const entry = join(root, "apps/api/dist/index.js");

async function verifyServer(environment) {
  const databasePath = join(directory, `cq-talent-${environment}`, "api.sqlite");
  const child = spawn(process.execPath, [entry], { cwd: root, env: runtimeEnv(environment, databasePath), stdio: ["ignore", "pipe", "pipe"] });
  const closed = new Promise((resolve) => child.once("close", resolve));
  try {
    const address = await new Promise((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => reject(new Error("Local API startup timed out")), 10_000);
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Local API exited: ${code}`)); });
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        const match = /Server listening at (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
      child.stderr.on("data", () => {});
    });
    const health = await fetch(`${address}/health`, { redirect: "error" });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("x-fcm-environment"), environment);
    const blocked = await fetch(`${address}/app-clients/resolve`, {
      method: "POST", redirect: "error", headers: { "x-miniprogram-env": environment === "release" ? "trial" : "release" },
    });
    assert.equal(blocked.status, 403);
    assert.equal((await blocked.json()).error.code, "environment_mismatch");
  } finally {
    child.kill("SIGTERM");
    await closed;
  }
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    assert.equal(database.prepare("SELECT environment FROM runtime_environment").get().environment, environment);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM user_accounts").get().count, 0);
  } finally { database.close(); }
}

try {
  assert.ok(existsSync(entry), "Run pnpm build before startup verification");
  for (const environment of ["develop", "trial", "release"]) await verifyServer(environment);
  const initialize = join(root, "apps/api/dist/ops/initialize-nonproduction.js");
  const syntheticPath = join(directory, "synthetic", "cq-talent-trial", "api.sqlite");
  const seedEnv = runtimeEnv("trial", syntheticPath);
  const missingFlag = spawnSync(process.execPath, [initialize], { cwd: root, env: seedEnv, encoding: "utf8", timeout: 10_000 });
  assert.equal(missingFlag.status, 1);
  assert.equal(existsSync(syntheticPath), false);
  const seeded = spawnSync(process.execPath, [initialize, "--synthetic"], { cwd: root, env: seedEnv, encoding: "utf8", timeout: 10_000 });
  assert.equal(seeded.status, 0, seeded.stderr);
  const seedDb = new DatabaseSync(syntheticPath, { readOnly: true });
  const userCount = seedDb.prepare("SELECT COUNT(*) AS count FROM user_accounts").get().count;
  assert.ok(userCount > 0);
  seedDb.close();
  const repeated = spawnSync(process.execPath, [initialize, "--synthetic"], { cwd: root, env: seedEnv, encoding: "utf8", timeout: 10_000 });
  assert.equal(repeated.status, 1);
  assert.match(repeated.stderr, /refusing to overwrite/);
  const releaseSeedPath = join(directory, "forbidden-release", "api.sqlite");
  const forbiddenSeed = spawnSync(process.execPath, [initialize, "--synthetic"], { cwd: root, env: runtimeEnv("release", releaseSeedPath), encoding: "utf8", timeout: 10_000 });
  assert.equal(forbiddenSeed.status, 1);
  assert.equal(existsSync(releaseSeedPath), false);
  const unknownPath = join(directory, "must-not-exist.sqlite");
  const missing = spawnSync(process.execPath, [entry], { cwd: root, env: { NODE_ENV: "production", DATABASE_URL: unknownPath }, timeout: 10_000, encoding: "utf8" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /FCM_RUNTIME_ENV/);
  assert.equal(existsSync(unknownPath), false);

  const legacyPath = join(directory, "legacy", "cq-talent-trial", "api.sqlite");
  mkdirSync(dirname(legacyPath), { recursive: true });
  const legacy = new DatabaseSync(legacyPath);
  legacy.exec("CREATE TABLE sentinel (value TEXT); INSERT INTO sentinel VALUES ('synthetic')");
  legacy.close();
  const before = readFileSync(legacyPath);
  for (const command of [entry, join(root, "apps/api/dist/migrate.js")]) {
    const refused = spawnSync(process.execPath, [command], { cwd: root, env: runtimeEnv("trial", legacyPath), timeout: 10_000, encoding: "utf8" });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /missing or mismatched/);
    assert.deepEqual(readFileSync(legacyPath), before);
  }
  console.log("PASS: 3 local runtime entrypoints start without seed; explicit synthetic initialization is repeat-safe and rejects release; missing config creates no DB; startup/migrate refuse legacy DB unchanged.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}

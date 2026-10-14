import { afterEach, describe, expect, it, vi } from "vitest";
import { copyFileSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { readRuntimeConfig, type RuntimeConfig, type RuntimeEnvironment } from "../src/runtime/environment.js";
import { openRuntimeDatabase } from "../src/persistence/runtime-database.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

const appId = "wx4c588cd106e520e0";
const ref = (version: string) => `https://servicewechat.com/${appId}/${version}/page-frame.html`;
const dirs: string[] = [];
function directory() {
  const path = realpathSync(mkdtempSync(join(tmpdir(), "fcm-isolation-")));
  dirs.push(path);
  return path;
}
function config(environment: RuntimeEnvironment, root = directory()): RuntimeConfig {
  return { environment, databasePath: join(root, `cq-talent-${environment}`, "api.sqlite"), wechatAppId: appId };
}
afterEach(() => { for (const path of dirs.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe("runtime bootstrap", () => {
  it("requires an explicit environment, database and AppID and disables shared debug identity", () => {
    const base = { NODE_ENV: "production", DATABASE_URL: "/var/lib/cq-talent/api.sqlite", WECHAT_MINIPROGRAM_APP_ID: appId };
    for (const value of [undefined, "", "production", "typo"]) {
      expect(() => readRuntimeConfig({ ...base, FCM_RUNTIME_ENV: value })).toThrow("FCM_RUNTIME_ENV");
    }
    expect(() => readRuntimeConfig({ ...base, FCM_RUNTIME_ENV: "trial", DATABASE_URL: "" })).toThrow("DATABASE_URL");
    expect(() => readRuntimeConfig({ ...base, FCM_RUNTIME_ENV: "release", WECHAT_MINIPROGRAM_APP_ID: "" })).toThrow("APP_ID");
    expect(() => readRuntimeConfig({ ...base, FCM_RUNTIME_ENV: "release", NODE_ENV: "development" })).toThrow("NODE_ENV");
    expect(() => readRuntimeConfig({ ...base, FCM_RUNTIME_ENV: "develop", NODE_ENV: "development", HOST: "0.0.0.0" })).toThrow("localhost");
    expect(readRuntimeConfig({ ...base, FCM_RUNTIME_ENV: "trial" }).environment).toBe("trial");
  });

  it("migrates and reopens three independent owned files", async () => {
    const root = directory();
    for (const env of ["develop", "trial", "release"] as const) {
      const runtimeConfig = config(env, root);
      const first = await createPlatformPersistence({ runtimeConfig, seed: false });
      first.database.exec("CREATE TABLE isolation_probe (value TEXT)");
      first.database.prepare("INSERT INTO isolation_probe VALUES (?)").run(env);
      first.database.close();
      const second = await createPlatformPersistence({ runtimeConfig, seed: false });
      expect(second.database.prepare("SELECT value FROM isolation_probe").all()).toEqual([{ value: env }]);
      second.database.close();
    }
  });

  it.each(["release", "trial", "develop"] as const)("does not seed a %s runtime database by default", async (environment) => {
    const persistence = await createPlatformPersistence({ runtimeConfig: config(environment) });
    try {
      expect(persistence.database.prepare("SELECT COUNT(*) AS count FROM user_accounts").get()).toEqual({ count: 0 });
    } finally { persistence.database.close(); }
  });

  it("refuses a legacy or release database in a nonproduction path before any write", () => {
    const trial = config("trial");
    mkdirSync(dirname(trial.databasePath), { recursive: true });
    const legacy = new DatabaseSync(trial.databasePath);
    legacy.exec("CREATE TABLE production_sentinel (value TEXT); INSERT INTO production_sentinel VALUES ('untouched')");
    legacy.close();
    const before = readFileSync(trial.databasePath);
    expect(() => openRuntimeDatabase(trial)).toThrow("missing or mismatched");
    expect(readFileSync(trial.databasePath)).toEqual(before);
    // A release upgrade can mark an existing database, but never seed it implicitly.
    const release = openRuntimeDatabase({ ...trial, environment: "release" });
    release.close();
    const marked = readFileSync(trial.databasePath);
    expect(() => openRuntimeDatabase(trial)).toThrow("mismatched");
    expect(readFileSync(trial.databasePath)).toEqual(marked);
    const develop = config("develop");
    mkdirSync(dirname(develop.databasePath), { recursive: true });
    copyFileSync(trial.databasePath, develop.databasePath);
    expect(() => openRuntimeDatabase(develop)).toThrow("mismatched");
  });

  it("rejects shared paths and links, including SQLite sidecars", () => {
    const trial = config("trial");
    for (const databasePath of [":memory:", "relative.sqlite", "/var/lib/cq-talent/api.sqlite", config("develop").databasePath]) {
      expect(() => openRuntimeDatabase({ ...trial, databasePath })).toThrow();
    }
    const source = config("release");
    openRuntimeDatabase(source).close();
    mkdirSync(dirname(trial.databasePath), { recursive: true });
    symlinkSync(source.databasePath, trial.databasePath);
    expect(() => openRuntimeDatabase(trial)).toThrow("links");
    rmSync(trial.databasePath);
    linkSync(source.databasePath, trial.databasePath);
    expect(() => openRuntimeDatabase(trial)).toThrow("links");
    rmSync(trial.databasePath);
    symlinkSync(source.databasePath, `${trial.databasePath}-wal`);
    expect(() => openRuntimeDatabase(trial)).toThrow("links");
  });
});

describe("HTTP environment boundary", () => {
  it.each(["develop", "trial", "release"] as const)("isolates %s before handlers and idempotency writes", async (environment) => {
    const app = buildServer(undefined, { logger: false, runtimeConfig: config(environment) });
    let writes = 0;
    app.post("/isolation-probe", async () => { writes++; return { ok: true }; });
    try {
      for (const other of ["develop", "trial", "release"]) {
        const response = await app.inject({ method: "POST", url: "/isolation-probe", headers: {
          "x-miniprogram-env": other, referer: ref(other === "release" ? "123" : "0"), "idempotency-key": `probe-${other}`,
        } });
        expect(response.statusCode).toBe(other === environment ? 200 : 403);
      }
      expect(writes).toBe(1);
      const health = await app.inject("/health");
      expect(health.statusCode).toBe(200);
      expect(health.headers["x-fcm-environment"]).toBe(environment);
      expect((await app.inject({ method: "POST", url: "/isolation-probe" })).statusCode).toBe(403);
      for (const referer of [ref("devtools"), ref("0"), "https://example.com", ref("123") + "?spoof=1", ref("123").replace(appId, "wx0000000000000000")]) {
        const response = await app.inject({ method: "POST", url: "/isolation-probe", headers: { "x-miniprogram-env": environment, referer } });
        const allowed = environment !== "release" && (referer === ref("0") || referer === ref("devtools"));
        expect(response.statusCode).toBe(allowed ? 200 : 403);
      }
      expect((await app.inject({ url: "/__env/trial/health", headers: { "x-miniprogram-env": environment } })).statusCode).toBe(403);
      expect((await app.inject({ url: "/isolation-probe", headers: { "x-miniprogram-env": `${environment}, release` } })).statusCode).toBe(403);
    } finally { await app.close(); }
  });

  it("blocks legacy trial and spoofed release declarations with a valid session without changing SQLite", async () => {
    const runtimeConfig = config("release");
    // Synthetic seed in a temporary file only. Production entrypoint explicitly disables seed.
    const persistence = await createPlatformPersistence({ runtimeConfig, seed: true });
    const sessions = new SessionRegistry(persistence.repositories.appClientSessions);
    const membership = await persistence.repositories.memberships.findActiveByClubAndUser("club-chongqing-talent", "user-coach-1");
    const session = await sessions.create({ clubId: "club-chongqing-talent", appClientId: "app-client-cq-talent-wechat-main", userId: "user-coach-1", membershipId: membership!.id, activeRole: "coach" });
    const store = new PersistentApiStore(persistence.repositories);
    const prune = vi.spyOn(store, "pruneHttpIdempotencyRecords");
    const app = buildServer(store, { logger: false, runtimeConfig, sessionRegistry: sessions,
      membershipResolver: createProductionMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
    const url = "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/training-projects";
    const payload = { projectIds: ["drill-cq-talent-assessment-001"] };
    try {
      const baseline = persistence.database.prepare("SELECT total_changes() AS count").get();
      for (const headers of [
        { referer: ref("0") }, { referer: ref("devtools") },
        { referer: ref("0"), "x-miniprogram-env": "release" },
        { referer: ref("123"), "x-miniprogram-env": "trial" },
        { "x-miniprogram-env": "release" }, {},
      ]) {
        const rejected = await app.inject({ method: "PUT", url, payload, headers: { ...headers, authorization: `Bearer ${session.token}`, "idempotency-key": "must-not-write" } });
        expect(rejected.statusCode).toBe(403);
        expect(rejected.json().error.code).toBe("environment_mismatch");
      }
      expect(persistence.database.prepare("SELECT total_changes() AS count").get()).toEqual(baseline);
      expect(prune).not.toHaveBeenCalled();
      const unauthorized = await app.inject({ method: "PUT", url, payload, headers: { referer: ref("123"), "x-user-id": "user-coach-1" } });
      expect([401, 403]).toContain(unauthorized.statusCode);
      expect(unauthorized.json().error.code).not.toBe("environment_mismatch");
      // Environment-header compatibility remains: formal Referer needs no declaration.
      // The content editor independently requires the version it read.
      const current = await app.inject({method:"GET",url:url.replace("/training-projects","/workbench"),headers:{referer:ref("123"),authorization:`Bearer ${session.token}`}});
      const allowed = await app.inject({ method: "PUT", url, payload: { ...payload, expectedRevision: current.json().trainingContentRevision }, headers: { referer: ref("123"), authorization: `Bearer ${session.token}` } });
      expect(allowed.statusCode).toBe(200);
      expect(persistence.database.prepare("SELECT total_changes() AS count").get()).not.toEqual(baseline);
      const trialConfig = config("trial");
      const trial = await createPlatformPersistence({ runtimeConfig: trialConfig, seed: false });
      try { expect(await new SessionRegistry(trial.repositories.appClientSessions).resolve(session.token)).toBeNull(); }
      finally { trial.database.close(); }
    } finally { await app.close(); persistence.database.close(); }
  });
});

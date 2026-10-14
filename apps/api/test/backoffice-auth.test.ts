import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashBackofficePassword } from "../src/auth/backoffice.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { readBackofficeConfig } from "../src/runtime/backoffice.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
const clubId = "club-chongqing-talent", username = "reviewer", password = "synthetic-private-password-2026";
const encoded = hashBackofficePassword(password);
const runtime = (environment: "develop" | "trial" = "develop") => ({ environment, databasePath: ":memory:", wechatAppId: "wx4c588cd106e520e0", backoffice: readBackofficeConfig(environment, `https://club.example/__env/${environment}/backoffice`)! });
const headers = { "x-fcm-environment": "develop", origin: "https://club.example", referer: "https://club.example/__env/develop/backoffice/" };
async function fixture(databasePath = ":memory:") {
  const p = await createPlatformPersistence({ databasePath });
  const resolver = createProductionMembershipResolver(p.repositories.users, p.repositories.memberships);
  const store = new PersistentApiStore(p.repositories);
  const server = buildServer(store, { runtimeConfig: runtime(), membershipResolver: resolver, logger: false });
  const credential = { clubId, username, userId: "user-admin-1", passwordHash: await encoded };
  if (!p.repositories.backofficeAuth.credential(clubId, username)) await p.repositories.backofficeAuth.provision(credential);
  const login = (override = {}) => server.inject({ method: "POST", url: "/backoffice/api/login", headers, payload: { clubId, username, password, ...override } });
  return { p, server, store, resolver, login, credential };
}
describe("backoffice authentication boundary", () => {
  it("requires an explicit environment URL and isolates browser requests before writes", async () => {
    expect(readBackofficeConfig("develop")).toBeUndefined();
    for (const url of ["http://club.example/__env/develop/backoffice", "https://club.example/backoffice", "https://club.example/__env/trial/backoffice", "https://name:secret@club.example/__env/develop/backoffice"]) expect(() => readBackofficeConfig("develop", url)).toThrow();
    expect(readBackofficeConfig("develop", "http://127.0.0.1:3000/__env/develop/backoffice")?.secure).toBe(false);
    expect(() => readBackofficeConfig("trial", "http://127.0.0.1:3000/__env/trial/backoffice")).toThrow();
    const f = await fixture();
    try {
      const before = f.p.database.prepare("SELECT total_changes() AS count").get();
      for (const wrong of [{}, { ...headers, "x-fcm-environment": "trial" }, { ...headers, referer: "https://club.example/__env/trial/backoffice/" }, { ...headers, origin: "https://evil.example" }, { ...headers, referer: "https://club.example/__env/develop/backoffice-evil/" }, { ...headers, "x-miniprogram-env": "develop" }]) {
        const response = await f.server.inject({ method: "POST", url: "/backoffice/api/login", headers: wrong, payload: { clubId, username, password } });
        expect(response.statusCode).toBe(403);
      }
      expect(f.p.database.prepare("SELECT total_changes() AS count").get()).toEqual(before);
      expect((await f.server.inject({ method: "GET", url: "/clubs/club-chongqing-talent/config", headers })).statusCode).toBe(403);
    } finally { await f.server.close(); f.p.database.close(); }
  });

  it("stores opaque hashes, rejects identity headers and other environments, rechecks membership and revokes logout", async () => {
    const f = await fixture();
    try {
      const signed = await f.login(); expect(signed.statusCode).toBe(200);
      expect(signed.json()).toMatchObject({ environment: "develop", clubId, user: { roles: ["admin"] } });
      expect(signed.headers["cache-control"]).toBe("no-store"); expect(signed.headers.etag).toBeUndefined();
      const setCookie = String(signed.headers["set-cookie"]), cookie = setCookie.split(";")[0]!;
      expect(setCookie).toContain("HttpOnly; SameSite=Strict"); expect(setCookie).toContain("Path=/__env/develop/backoffice"); expect(setCookie).toContain("Secure");
      const rows = f.p.database.prepare("SELECT * FROM backoffice_sessions").all();
      expect(JSON.stringify(rows)).not.toContain(cookie.split("=")[1]); expect(rows).toHaveLength(1);
      const read = (extra = {}) => f.server.inject({ method: "GET", url: "/backoffice/api/session", headers: { ...headers, cookie, ...extra } });
      expect((await read()).statusCode).toBe(200);
      expect((await read({ authorization: "Bearer arbitrary", "x-user-id": "user-admin-1" })).statusCode).toBe(401);
      expect((await read({ cookie: `${cookie}; ${cookie}` })).statusCode).toBe(401);
      expect((await read({ cookie: "", "x-user-id": "user-admin-1" })).statusCode).toBe(401);
      expect((await read({ referer: "https://club.example/__env/trial/backoffice/", "x-fcm-environment": "trial" })).statusCode).toBe(403);
      const membership = (await f.p.repositories.memberships.findActiveByClubAndUser(clubId, "user-admin-1"))!;
      await f.p.repositories.memberships.save({ ...membership, roles: ["parent"] }); expect((await read()).statusCode).toBe(401);
      await f.p.repositories.memberships.save(membership);
      expect((await f.server.inject({ method: "POST", url: "/backoffice/api/logout", headers: { ...headers, cookie, "idempotency-key": "logout" } })).statusCode).toBe(200);
      expect((await read()).statusCode).toBe(401);
      expect(f.p.database.prepare("SELECT COUNT(*) AS count FROM http_idempotency_records").get()).toEqual({ count: 0 });
    } finally { await f.server.close(); f.p.database.close(); }
  });

  it("survives file reopen, expires, and revokes all sessions on password rotation", async () => {
    const root = mkdtempSync(join(tmpdir(), "backoffice-auth-")); const path = join(root, "api.sqlite");
    let f = await fixture(path);
    try {
      const first = await f.login(), cookie = String(first.headers["set-cookie"]).split(";")[0]!;
      await f.server.close(); f.p.database.close(); f = await fixture(path);
      const read = () => f.server.inject({ method: "GET", url: "/backoffice/api/session", headers: { ...headers, cookie } });
      expect((await read()).statusCode).toBe(200);
      await f.p.repositories.backofficeAuth.provision({ ...f.credential, passwordHash: await hashBackofficePassword("replacement-synthetic-password") });
      expect((await read()).statusCode).toBe(401); expect((await f.login()).statusCode).toBe(401);
      const next = await f.login({ password: "replacement-synthetic-password" }); expect(next.statusCode).toBe(200);
      f.p.database.prepare("UPDATE backoffice_sessions SET expires_at='2000-01-01T00:00:00Z'").run();
      expect((await f.server.inject({ method: "GET", url: "/backoffice/api/session", headers: { ...headers, cookie: String(next.headers["set-cookie"]).split(";")[0] } })).statusCode).toBe(401);
    } finally { await f.server.close(); f.p.database.close(); rmSync(root, { recursive: true, force: true }); }
  }, 15000);

  it("rejects non-admins, keeps failure text generic and enforces persistent attempt limits", async () => {
    const f = await fixture();
    try {
      const wrong = await f.login({ password: "wrong" }), unknown = await f.login({ username: "missing" });
      expect(wrong.statusCode).toBe(401); expect(unknown.json()).toEqual(wrong.json());
      await f.p.repositories.backofficeAuth.provision({ ...f.credential, username: "coach", userId: "user-coach-1" });
      expect((await f.login({ username: "coach" })).statusCode).toBe(401);
      for (let i = 0; i < 9; i++) expect((await f.login({ password: "wrong" })).statusCode).toBe(401);
      const limited = await f.login(); expect(limited.statusCode).toBe(429); expect(limited.headers["retry-after"]).toBe("900");
      expect(f.p.database.prepare("SELECT COUNT(*) AS count FROM backoffice_sessions").get()).toEqual({ count: 0 });
      expect(JSON.stringify(f.p.database.prepare("SELECT * FROM backoffice_login_attempts").all())).not.toContain(username);
    } finally { await f.server.close(); f.p.database.close(); }
  }, 15000);

  it("serves the real page and only explicit club-scoped catalog projections, without caching revoked access", async () => {
    const f = await fixture();
    try {
      const html = await f.server.inject({ method: "GET", url: "/backoffice/" });
      expect(html.statusCode).toBe(200); expect(html.body).toContain('data-environment="develop"'); expect(html.body).toContain("登录工作台");
      expect(html.headers["content-security-policy"]).toContain("frame-ancestors 'none'"); expect(html.headers["referrer-policy"]).toBe("same-origin");
      expect((await f.server.inject({ method: "GET", url: "/backoffice/assets/app.js" })).statusCode).toBe(200);
      expect((await f.server.inject({ method: "GET", url: "/backoffice/assets/package.json" })).statusCode).toBe(404);
      const cookie = String((await f.login()).headers["set-cookie"]).split(";")[0]!;
      const read = (query = "") => f.server.inject({ method: "GET", url: `/backoffice/api/catalog/students${query}`, headers: { ...headers, cookie } });
      const data = await read(); expect(data.statusCode).toBe(200); expect(data.headers["cache-control"]).toBe("no-store"); expect(data.headers.etag).toBeUndefined();
      expect(data.json().columns).toEqual(["姓名", "出生日期", "性别", "惯用脚"]); expect(data.body).not.toContain("primaryContact");
      expect((await read("?search=no-matching-synthetic-person")).json().rows).toEqual([]);
      expect((await read("?clubId=other-club")).statusCode).toBe(400);
      expect((await f.server.inject({ method: "GET", url: "/backoffice/api/catalog/user_accounts", headers: { ...headers, cookie } })).statusCode).toBe(400);
      await f.p.repositories.backofficeAuth.provision(f.credential);
      expect((await f.server.inject({ method: "GET", url: "/backoffice/api/catalog/students", headers: { ...headers, cookie, "if-none-match": '"old"' } })).statusCode).toBe(401);
      const document = (await f.server.inject({ method: "GET", url: "/openapi.json" })).json();
      expect(document.paths["/backoffice/api/catalog/{table}"].get).toBeDefined();
    } finally { await f.server.close(); f.p.database.close(); }
  });

  it("does not issue cookies or leak storage failures, and rolls back failed session creation", async () => {
    const f = await fixture();
    try {
      f.p.database.exec("CREATE TRIGGER fail_web_session BEFORE INSERT ON backoffice_sessions BEGIN SELECT RAISE(ABORT, 'private diagnostic sentinel'); END");
      const failed = await f.login(); expect(failed.statusCode).toBe(500); expect(failed.headers["set-cookie"]).toBeUndefined(); expect(failed.body).not.toContain("private diagnostic sentinel");
      expect(f.p.database.prepare("SELECT COUNT(*) AS count FROM backoffice_sessions").get()).toEqual({ count: 0 });
    } finally { await f.server.close(); f.p.database.close(); }
  });
});

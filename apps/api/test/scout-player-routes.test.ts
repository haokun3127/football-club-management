import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
const clubId = "club-chongqing-talent", appClientId = "app-client-cq-talent-wechat-main";
const url = `/clubs/${clubId}/app-clients/${appClientId}/coach/scout-players`;
const payload = { name: "标准示例人员", identityNumber: "11010519491231002X" };
describe("authenticated scout registration", () => {
  it("enforces role, client, session revocation, pagination and natural retry without exposing identity", async () => {
    const p = await createPlatformPersistence({ databasePath: ":memory:", identityKeyring: { activeVersion: "test", keys: [{ version: "test", digestKey: randomBytes(32).toString("hex"), encryptionKey: randomBytes(32).toString("hex") }] } });
    const store = new PersistentApiStore(p.repositories), sessions = new SessionRegistry(p.repositories.appClientSessions);
    const app = buildServer(store, { logger: false, sessionRegistry: sessions, membershipResolver: createProductionMembershipResolver(p.repositories.users, p.repositories.memberships) });
    async function login(role: "coach" | "parent", activeRole: typeof role | null = role) {
      const userId = `user-${role}-1`, membership = await p.repositories.memberships.findActiveByClubAndUser(clubId, userId);
      return sessions.create({ clubId, appClientId, userId, membershipId: membership!.id, activeRole });
    }
    try {
      const coach = await login("coach"), parent = await login("parent"), pending = await login("coach", null);
      const headers = { authorization: `Bearer ${coach.token}`, "idempotency-key": "scout-retry" };
      expect((await app.inject({ method: "POST", url, payload })).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url, payload, headers: { authorization: `Bearer ${parent.token}` } })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url, payload, headers: { authorization: `Bearer ${pending.token}` } })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url: url.replace(appClientId, "other-client"), payload, headers })).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url, payload: { ...payload, actorUserId: "spoofed" }, headers })).statusCode).toBe(400);
      p.database.exec("CREATE TRIGGER fail_scout_http BEFORE INSERT ON scout_profiles BEGIN SELECT RAISE(ABORT,'private SQL failure'); END;");
      const failed = await app.inject({ method: "POST", url, payload, headers });
      expect(failed.statusCode).toBe(500); expect(failed.body).not.toContain("SQL"); expect(store.listStudents(clubId).some(s => s.name === payload.name)).toBe(false);
      p.database.exec("DROP TRIGGER fail_scout_http");
      const first = await app.inject({ method: "POST", url, payload, headers });
      expect(first.statusCode).toBe(201); expect(first.body).not.toContain(payload.identityNumber); expect(first.body).not.toContain("personId");
      const retry = await app.inject({ method: "POST", url, payload, headers });
      expect(retry.statusCode).toBe(200); expect(retry.json()).toEqual({ created: false, player: first.json().player });
      expect(retry.headers["idempotency-status"]).toBeUndefined();
      expect((await app.inject({ url: `${url}/${first.json().player.id}`, headers })).json()).toEqual({ player: first.json().player, participations: [] });
      expect((await app.inject({ url: `${url}/unknown-player`, headers })).statusCode).toBe(404);
      const timestamp = new Date().toISOString();
      const coachId = store.listCoaches(clubId).find(c => c.userId === "user-coach-1")!.id;
      for (const [id, ownerCoachId] of [["scout-visible", coachId], ["scout-hidden", undefined]] as const) {
        await store.saveCalendarEvent({ id, clubId, type: "training", title: id, ownerCoachId, status: "scheduled", timeRange: { startsAt: "2026-10-07T00:00:00Z", endsAt: "2026-10-07T01:00:00Z" }, createdAt: timestamp, updatedAt: timestamp });
        store.saveEventParticipant({ id: `${id}-participant`, clubId, eventId: id, studentId: first.json().player.id, status: "invited", createdAt: timestamp, updatedAt: timestamp });
      }
      const detail = (await app.inject({ url: `${url}/${first.json().player.id}`, headers })).json();
      expect(detail.participations.map((event: { eventId: string }) => event.eventId)).toEqual(["scout-visible"]);
      expect(JSON.stringify(detail)).not.toContain("scout-hidden");
      expect((await app.inject({ url: `${url}?search=002x&limit=1`, headers })).json()).toMatchObject({ total: 1, nextOffset: null, canCreate: true });
      expect((await app.inject({ url: `${url}?search=missing`, headers })).json().players).toEqual([]);
      expect((await app.inject({ url: `${url}?limit=100`, headers })).statusCode).toBe(400);
      p.database.exec("UPDATE app_client_sessions SET revoked_at = '2026-01-01T00:00:00Z'");
      expect((await app.inject({ method: "POST", url, payload, headers })).statusCode).toBe(401);
      expect(p.database.prepare("SELECT count(*) n FROM scout_profiles").get()!.n).toBe(1);
    } finally { await app.close(); p.database.close(); }
  });
});

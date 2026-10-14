import { describe, expect, it, vi } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";

describe("training record BFF", () => {
  it("shares corrected facts across authorized parent/coach roles, rejects stale and foreign writes, and never changes balances", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const store = new PersistentApiStore(persistence.repositories);
    const sessions = new SessionRegistry(persistence.repositories.appClientSessions);
    const clubId = "club-chongqing-talent";
    const appClientId = "app-client-cq-talent-wechat-main";
    async function headers(role: "parent" | "coach" | null, userRole = role ?? "parent") {
      const userId = `user-${userRole}-1`;
      const membership = await persistence.repositories.memberships.findActiveByClubAndUser(clubId, userId);
      const session = await sessions.create({ clubId, appClientId, userId, membershipId: membership!.id, activeRole: role });
      return { authorization: `Bearer ${session.token}` };
    }
    const parent = await headers("parent");
    const coach = await headers("coach");
    const pending = await headers(null);
    const app = buildServer(store, { logger: false, sessionRegistry: sessions,
      membershipResolver: createProductionMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
    const base = `/clubs/${clubId}/app-clients/${appClientId}/students/student-1/training-records`;
    try {
      const balances = persistence.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all();
      expect((await app.inject({ url: base })).statusCode).toBe(403);
      expect((await app.inject({ url: base, headers: pending })).statusCode).toBe(401);
      expect((await app.inject({ url: base.replace("student-1", "student-other"), headers: parent })).statusCode).toBe(403);
      vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
      const earlyPayload = { expectedRevision: 0, counted: true, reason: "教练提前更正出勤" };
      expect((await app.inject({ method: "PATCH", url: `${base}/event-training-1`, headers: parent, payload: earlyPayload })).statusCode).toBe(409);
      const early = await app.inject({ method: "PATCH", url: `${base}/event-training-1`, headers: coach, payload: earlyPayload });
      expect(early.statusCode).toBe(200);
      expect(early.json().record.history[0]).toMatchObject({ actorUserId: "user-coach-1", previousCounted: null, counted: true });
      vi.useRealTimers();
      const initial = await app.inject({ url: base, headers: parent });
      expect(initial.statusCode).toBe(200);
      const record = initial.json().records.find((item: { eventId: string }) => item.eventId === "event-training-1");
      expect(record.counted).toBe(true);
      const corrected = await app.inject({ method: "PATCH", url: `${base}/${record.eventId}`, headers: parent,
        payload: { expectedRevision: record.revision, counted: false, reason: "当天未参加" } });
      expect(corrected.statusCode).toBe(200);
      expect(corrected.json().record.history.at(-1).actorUserId).toBe("user-parent-1");
      const coachRead = await app.inject({ url: base, headers: coach });
      expect(coachRead.json().records.find((item: { eventId: string }) => item.eventId === record.eventId).counted).toBe(false);
      const workbench = await app.inject({ url: `/clubs/${clubId}/app-clients/${appClientId}/coach/events/${record.eventId}/workbench`, headers: coach });
      expect(workbench.statusCode).toBe(200);
      expect(workbench.json().trainingRecords.find((item: { studentId: string }) => item.studentId === "student-1")).toMatchObject({ counted: false, revision: 2 });
      const parentGrowth = await app.inject({ url: `/clubs/${clubId}/app-clients/${appClientId}/parent/students/student-1/growth-summary`, headers: parent });
      expect(parentGrowth.statusCode).toBe(200);
      const facts = (await app.inject({ url: base, headers: parent })).json().records;
      expect(parentGrowth.json().trainingStats.totalTrainings).toBe(facts.filter((item: { counted: boolean }) => item.counted).length);
      const timelineRecord = parentGrowth.json().timeline.find((item: { eventId?: string }) => item.eventId === record.eventId);
      expect(timelineRecord.subtitle).toContain("不计次");
      expect(timelineRecord.subtitle).not.toContain("完成");
      const conflict = await app.inject({ method: "PATCH", url: `${base}/${record.eventId}`, headers: coach,
        payload: { expectedRevision: record.revision, counted: true, reason: "过期页面" } });
      expect(conflict.statusCode).toBe(409);
      expect(conflict.json().current.counted).toBe(false);
      expect((await app.inject({ method: "PATCH", url: `${base}/${record.eventId}`, headers: parent,
        payload: { expectedRevision: 2, counted: true, reason: "伪造操作人", actorUserId: "user-admin-1" } })).statusCode).toBe(400);
      await store.recordEventParticipants(clubId, "event-training-1", [{ studentId: "student-1", status: "present" }]);
      expect(persistence.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all()).toEqual(balances);
      const openapi = (await app.inject("/openapi.json")).json();
      expect(openapi.paths["/clubs/{clubId}/app-clients/{clientId}/students/{studentId}/training-records/{eventId}"].patch.responses["200"]).toBeDefined();
    } finally { vi.useRealTimers(); await app.close(); persistence.database.close(); }
  });
});

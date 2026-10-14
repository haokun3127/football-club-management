import { describe, expect, it } from "vitest";
import { createSeedData } from "../src/seed.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { buildServer } from "../src/server.js";

describe("versioned course content editing", () => {
  it("rejects missing/stale versions and rolls back both plan and session on failure", async () => {
    const seed = createSeedData(), clubId = "club-chongqing-talent", eventId = "event-training-1";
    const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData: seed });
    const store = new PersistentApiStore(persistence.repositories, seed);
    const app = buildServer(store, { logger: false, membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
    const base = `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/events/${eventId}`;
    const headers = { "x-user-id": "user-coach-1" };
    const read = async () => (await app.inject({ method: "GET", url: `${base}/workbench`, headers })).json();
    const write = (payload: object) => app.inject({ method: "PUT", url: `${base}/training-projects`, headers, payload });
    try {
      const first = await read();
      expect(first.trainingContentRevision).toMatch(/^[a-f0-9]{64}$/);
      const projectIds = ["drill-finishing-1"];
      expect((await write({ projectIds })).statusCode).toBe(428);
      expect((await read()).trainingContentRevision).toBe(first.trainingContentRevision);
      const payload = { projectIds, expectedRevision: first.trainingContentRevision, intensity: "high", note: "版本核对" };
      const saved = await write(payload);
      expect(saved.statusCode, saved.body).toBe(200);
      const second = await read();
      expect(second.trainingContentRevision).not.toBe(first.trainingContentRevision);
      expect(second.training.selectedProjectIds).toEqual(projectIds);
      expect((await write({ ...payload, projectIds: ["drill-cq-talent-assessment-001"] })).statusCode).toBe(409);
      expect((await read()).trainingContentRevision).toBe(second.trainingContentRevision);

      const planId = saved.json().sessionPlan.id;
      const plan = store.getSessionPlan(planId);
      const session = store.getTrainingSessionByEvent(clubId, eventId);
      persistence.database.exec("CREATE TRIGGER edit_failure BEFORE UPDATE ON training_sessions BEGIN SELECT RAISE(ABORT, 'private database details'); END");
      const failed = await write({ ...payload, projectIds: ["drill-cq-talent-assessment-001"], expectedRevision: second.trainingContentRevision });
      expect(failed.statusCode).toBe(500);
      expect(failed.body).not.toContain("private database details");
      expect(store.getSessionPlan(planId)).toEqual(plan);
      expect(persistence.repositories.sessionPlans.getById(clubId, planId)).toEqual(plan);
      expect(store.getTrainingSessionByEvent(clubId, eventId)).toEqual(session);
      expect(persistence.repositories.trainingSessions.getByEvent(clubId, eventId)).toEqual(session);
      persistence.database.exec("DROP TRIGGER edit_failure");
      const event = await store.getCalendarEvent(eventId);
      await store.saveCalendarEvent({ ...event!, status: "cancelled" });
      expect((await write({ ...payload, expectedRevision: second.trainingContentRevision })).statusCode).toBe(409);
      expect(store.getSessionPlan(planId)).toEqual(plan);
    } finally { await app.close(); persistence.database.close(); }
  });
});

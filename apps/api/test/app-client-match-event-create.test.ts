import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData } from "../src/seed.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

const clubId = "club-chongqing-talent";
const clientId = "app-client-cq-talent-wechat-main";
const basePath = `/clubs/${clubId}/app-clients/${clientId}/coach/events`;
const postPath = `${basePath}/event-match-1/match/events`;
const payload = { studentId: "student-1", type: "goal", minute: 45, note: "Recorded fact" };

async function createApp(databasePath = ":memory:", seedData = createSeedData()) {
  const persistence = await createPlatformPersistence({ databasePath, seedData });
  return {
    persistence,
    app: buildServer(new PersistentApiStore(persistence.repositories, seedData), {
      logger: false,
      membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
    }),
  };
}

describe("app-client coach match-event create", () => {
  it("creates once, replays the same key, rejects a changed key payload, and is visible through C6 GET", async () => {
    const { app, persistence } = await createApp();
    try {
      const headers = { "x-user-id": "user-coach-1", "idempotency-key": "match-event-key-0001" };
      const created = await app.inject({ method: "POST", url: postPath, headers, payload });
      expect(created.statusCode).toBe(201);
      const createdBody = created.json() as { event: { id: string; studentId: string; type: string; minute?: number } };
      expect(createdBody.event).toEqual(expect.objectContaining({ studentId: "student-1", type: "goal", minute: 45 }));

      const replay = await app.inject({ method: "POST", url: postPath, headers, payload });
      expect(replay.statusCode).toBe(201);
      expect((replay.json() as { event: { id: string } }).event.id).toBe(createdBody.event.id);

      const reorderedReplay = await app.inject({
        method: "POST",
        url: postPath,
        headers,
        payload: { note: "Recorded fact", minute: 45, type: "goal", studentId: "student-1" },
      });
      expect(reorderedReplay.statusCode).toBe(201);
      expect((reorderedReplay.json() as { event: { id: string } }).event.id).toBe(createdBody.event.id);

      const conflict = await app.inject({ method: "POST", url: postPath, headers, payload: { ...payload, minute: 46 } });
      expect(conflict.statusCode).toBe(409);

      const detail = await app.inject({ method: "GET", url: `${basePath}/event-match-1/match`, headers: { "x-user-id": "user-coach-1" } });
      expect(detail.statusCode).toBe(200);
      expect((detail.json() as { events: Array<{ id: string }> }).events).toContainEqual(expect.objectContaining({ id: createdBody.event.id }));
    } finally {
      await app.close();
      persistence.database.close();
    }
  });

  it("enforces safe write boundaries", async () => {
    const { app, persistence } = await createApp();
    try {
      const header = (key: string) => ({ "x-user-id": "user-coach-1", "idempotency-key": key });
      expect((await app.inject({ method: "POST", url: postPath, headers: { "x-user-id": "user-parent-1", "idempotency-key": "match-event-key-0002" }, payload })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url: postPath, headers: { "x-user-id": "user-parent-1", "idempotency-key": "match-event-key-parent-minute" }, payload: { ...payload, minute: "45" } })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url: postPath, headers: { "x-user-id": "user-coach-1" }, payload })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: `${basePath}/event-training-1/match/events`, headers: header("match-event-key-nonmatch"), payload })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: postPath, headers: header("match-event-key-student"), payload: { ...payload, studentId: "student-other" } })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: postPath, headers: header("match-event-key-type"), payload: { ...payload, type: "yellow_card" } })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: postPath, headers: header("match-event-key-minute"), payload: { ...payload, minute: 300.5 } })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: postPath, headers: header("match-event-key-minute-string"), payload: { ...payload, minute: "45" } })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: postPath, headers: header("match-event-key-note"), payload: { ...payload, note: "x".repeat(501) } })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: postPath, headers: header("match-event-key-actor"), payload: { ...payload, actorUserId: "user-coach-1" } })).statusCode).toBe(400);
    } finally {
      await app.close();
      persistence.database.close();
    }
  });

  it("rejects a calendar participant who is not in the real match roster", async () => {
    const seedData = createSeedData();
    seedData.matchRosters = [];
    const { app, persistence } = await createApp(":memory:", seedData);
    try {
      const response = await app.inject({
        method: "POST",
        url: postPath,
        headers: { "x-user-id": "user-coach-1", "idempotency-key": "match-event-key-no-roster" },
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: expect.objectContaining({ code: "invalid_match_event_student" }),
      });
    } finally {
      await app.close();
      persistence.database.close();
    }
  });

  it("keeps match-event writes atomic and reports unexpected persistence failures as 500", async () => {
    const { app, persistence } = await createApp();
    const saveMetricRecord = vi.spyOn(persistence.repositories.matches, "saveMetricRecord").mockImplementation(() => {
      throw new Error("SQLITE_CONSTRAINT_FOREIGNKEY: simulated");
    });
    try {
      const beforeEvents = persistence.database.prepare("SELECT COUNT(*) AS count FROM match_events WHERE match_id = ?").get("match-1") as { count: number };
      const beforeMetrics = persistence.database.prepare("SELECT COUNT(*) AS count FROM player_metric_records WHERE event_id = ? AND source = 'match_event'").get("event-match-1") as { count: number };
      const response = await app.inject({
        method: "POST",
        url: postPath,
        headers: { "x-user-id": "user-coach-1", "idempotency-key": "match-event-key-persistence" },
        payload,
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: { code: "internal_error", message: "Internal server error" },
      });
      const afterEvents = persistence.database.prepare("SELECT COUNT(*) AS count FROM match_events WHERE match_id = ?").get("match-1") as { count: number };
      const afterMetrics = persistence.database.prepare("SELECT COUNT(*) AS count FROM player_metric_records WHERE event_id = ? AND source = 'match_event'").get("event-match-1") as { count: number };
      expect(afterEvents.count).toBe(beforeEvents.count);
      expect(afterMetrics.count).toBe(beforeMetrics.count);
    } finally {
      saveMetricRecord.mockRestore();
      await app.close();
      persistence.database.close();
    }
  });

  it("retains the created event and metric record after reopening SQLite", async () => {
    const directory = mkdtempSync(join(tmpdir(), "football-match-event-"));
    const databasePath = join(directory, "club.sqlite");
    let first: Awaited<ReturnType<typeof createApp>> | undefined;
    let reopened: Awaited<ReturnType<typeof createApp>> | undefined;
    try {
      first = await createApp(databasePath);
      const created = await first.app.inject({
        method: "POST",
        url: postPath,
        headers: { "x-user-id": "user-coach-1", "idempotency-key": "match-event-key-restart" },
        payload,
      });
      expect(created.statusCode).toBe(201);
      const id = (created.json() as { event: { id: string } }).event.id;
      await first.app.close();
      first.persistence.database.close();
      first = undefined;

      reopened = await createApp(databasePath);
      const detail = await reopened.app.inject({ method: "GET", url: `${basePath}/event-match-1/match`, headers: { "x-user-id": "user-coach-1" } });
      expect(detail.statusCode).toBe(200);
      expect((detail.json() as { events: Array<{ id: string }> }).events).toContainEqual(expect.objectContaining({ id }));
      const count = reopened.persistence.database.prepare("SELECT COUNT(*) AS count FROM player_metric_records WHERE event_id = ? AND source = 'match_event'").get("event-match-1") as { count: number };
      expect(count.count).toBeGreaterThan(0);
    } finally {
      await reopened?.app.close();
      await first?.app.close();
      reopened?.persistence.database.close();
      first?.persistence.database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }, 10_000);
});

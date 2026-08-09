import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData } from "../src/seed.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

const clubId = "club-chongqing-talent";
const clientId = "app-client-cq-talent-wechat-main";
const eventId = "event-training-1";
const correctionPath = `/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/lesson-confirmation`;

function buildPersistentApp(persistence: Awaited<ReturnType<typeof createPlatformPersistence>>) {
  return buildServer(
    new PersistentApiStore(persistence.repositories),
    {
      logger: false,
      membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
    },
  );
}

function correctionPayload(overrides: Record<string, unknown> = {}) {
  return {
    studentId: "student-1",
    lessonDelta: 0.5,
    reason: "Manual attendance correction",
    ...overrides,
  };
}

function correctionHeaders(key?: string, userId = "user-coach-1") {
  return {
    "x-user-id": userId,
    ...(key ? { "idempotency-key": key } : {}),
  };
}

function countCorrections(database: Awaited<ReturnType<typeof createPlatformPersistence>>["database"], studentId = "student-1") {
  return (database.prepare(`
    SELECT COUNT(*) AS count FROM lesson_credit_ledger
    WHERE club_id = ? AND event_id = ? AND student_id = ? AND source = 'manual_adjustment'
  `).get(clubId, eventId, studentId) as { count: number }).count;
}

describe("app-client lesson correction", () => {
  it("requires authenticated coach membership, an event member, an exact half-lesson delta, and no client actor", async () => {
    const seedData = createSeedData();
    const referenceStudent = seedData.students[0]!;
    seedData.students.push({
      ...referenceStudent,
      id: "student-lesson-correction-outsider",
      name: "Correction outsider",
    });
    const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData });
    const app = buildPersistentApp(persistence);
    const outsider = persistence.database.prepare(`
      SELECT id FROM student_profiles
      WHERE club_id = ? AND id NOT IN (
        SELECT student_id FROM event_participants WHERE club_id = ? AND event_id = ?
      )
      LIMIT 1
    `).get(clubId, clubId, eventId) as { id: string };

    try {
      const missingKey = await app.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders(),
        payload: correctionPayload(),
      });
      expect(missingKey.statusCode).toBe(400);
      expect(countCorrections(persistence.database)).toBe(0);

      const invalidDelta = await app.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders("correction-invalid-delta"),
        payload: correctionPayload({ lessonDelta: 1 }),
      });
      expect(invalidDelta.statusCode).toBe(400);
      expect(countCorrections(persistence.database)).toBe(0);

      const clientActor = await app.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders("correction-client-actor"),
        payload: correctionPayload({ actorUserId: "user-admin-1" }),
      });
      expect(clientActor.statusCode).toBe(400);
      expect(countCorrections(persistence.database)).toBe(0);

      const outsiderResult = await app.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders("correction-outsider"),
        payload: correctionPayload({ studentId: outsider.id }),
      });
      expect(outsiderResult.statusCode).toBe(400);
      expect(countCorrections(persistence.database, outsider.id)).toBe(0);

      const parentResult = await app.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders("correction-parent", "user-parent-1"),
        payload: correctionPayload(),
      });
      expect(parentResult.statusCode).toBe(403);
      expect(countCorrections(persistence.database)).toBe(0);

      const accepted = await app.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders("correction-valid"),
        payload: correctionPayload(),
      });
      expect(accepted.statusCode).toBe(200);
      expect(countCorrections(persistence.database)).toBe(1);
      const ledger = persistence.database.prepare(`
        SELECT actor_user_id AS actorUserId, source_id AS sourceId FROM lesson_credit_ledger
        WHERE club_id = ? AND event_id = ? AND student_id = ? AND source = 'manual_adjustment'
      `).get(clubId, eventId, "student-1") as { actorUserId: string; sourceId: string };
      expect(ledger.actorUserId).toBe("user-coach-1");
      expect(ledger.sourceId).toMatch(/^app-client-lesson-correction-[A-Za-z0-9_-]{20,}$/);
    } finally {
      await app.close();
      persistence.database.close();
    }
  });

  it("replays one stable correction across a reopened SQLite database and rejects payload conflicts", async () => {
    const directory = mkdtempSync(join(tmpdir(), "football-lesson-correction-"));
    const databasePath = join(directory, "club.sqlite");
    const key = "correction-restart-safe";
    const payload = correctionPayload();
    let first: Awaited<ReturnType<typeof createPlatformPersistence>> | undefined;
    let reopened: Awaited<ReturnType<typeof createPlatformPersistence>> | undefined;
    let firstApp: ReturnType<typeof buildPersistentApp> | undefined;
    let reopenedApp: ReturnType<typeof buildPersistentApp> | undefined;

    try {
      first = await createPlatformPersistence({ databasePath });
      firstApp = buildPersistentApp(first);
      const initial = await firstApp.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders(key),
        payload,
      });
      const replay = await firstApp.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders(key),
        payload,
      });
      const conflict = await firstApp.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders(key),
        payload: correctionPayload({ reason: "Different payload" }),
      });

      expect(initial.statusCode).toBe(200);
      expect(replay.statusCode).toBe(200);
      expect(replay.headers["idempotency-status"]).toBe("replayed");
      expect(conflict.statusCode).toBe(409);
      expect(countCorrections(first.database)).toBe(1);
      await firstApp.close();
      firstApp = undefined;
      first.database.close();
      first = undefined;

      reopened = await createPlatformPersistence({ databasePath, seed: true });
      reopenedApp = buildPersistentApp(reopened);
      const replayAfterRestart = await reopenedApp.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders(key),
        payload,
      });

      expect(replayAfterRestart.statusCode).toBe(200);
      expect(replayAfterRestart.headers["idempotency-status"]).toBe("replayed");
      expect(countCorrections(reopened.database)).toBe(1);
    } finally {
      await reopenedApp?.close();
      reopened?.database.close();
      await firstApp?.close();
      first?.database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }, 30_000);

  it("rejects the correction route when no membership resolver is installed", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(new PersistentApiStore(persistence.repositories), { logger: false });

    try {
      const response = await app.inject({
        method: "PATCH",
        url: correctionPath,
        headers: correctionHeaders("correction-no-resolver"),
        payload: correctionPayload(),
      });
      expect(response.statusCode).toBe(401);
      expect(countCorrections(persistence.database)).toBe(0);
    } finally {
      await app.close();
      persistence.database.close();
    }
  });
});

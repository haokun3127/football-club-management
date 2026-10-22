import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeedData } from "../src/seed.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { migrate } from "../src/persistence/sqlite.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import {
  createTrainingGame,
  updateTrainingGame,
} from "../src/application/training-games.js";

const clubId = "club-chongqing-talent",
  eventId = "event-training-1",
  clientId = "app-client-cq-talent-wechat-main";
const base = `/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/training-games`;
const parent = `/clubs/${clubId}/app-clients/${clientId}/parent/events/${eventId}/training-games`;
const headers = { "x-user-id": "user-coach-1" };
let persistence: Awaited<ReturnType<typeof createPlatformPersistence>>,
  store: PersistentApiStore,
  app: ReturnType<typeof buildServer>;
function seedData() {
  const seed = createSeedData();
  seed.drills[0]!.recordingCapability = "friendly_match";
  if (!seed.students.some((item) => item.id === "student-2"))
    seed.students.push({
      ...seed.students.find((item) => item.id === "student-1")!,
      id: "student-2",
      name: "队友乙",
    });
  if (
    !seed.participants.some(
      (item) => item.eventId === eventId && item.studentId === "student-2",
    )
  )
    seed.participants.push({
      ...seed.participants.find((item) => item.eventId === eventId)!,
      id: "game-participant-two",
      studentId: "student-2",
    });
  return seed;
}
function preparePlan(
  seed: ReturnType<typeof seedData>,
  target: PersistentApiStore,
) {
  const event = seed.events.find((item) => item.id === eventId)!;
  const plan = {
    id: "game-plan",
    catalogScope: { scope: "club" as const, clubId },
    name: "课内分组对抗",
    objectiveIds: [],
    metricIds: [],
    blocks: [
      {
        id: "game-block",
        drillId: seed.drills[0]!.id,
        order: 1,
        plannedMinutes: 20,
      },
    ],
    estimatedMinutes: 20,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
  target.saveSessionPlan(plan);
  target.ensureTrainingSessionForEvent(clubId, eventId, {
    sessionPlanId: plan.id,
  });
}
const creation = (requestId = "create-one") => ({
  contentBlockId: "game-block",
  sideAName: "红队",
  sideBName: "蓝队",
  requestId,
});
const content = (expectedRevision = 1, requestId = "save-one") => ({
  sideAName: "红队",
  sideBName: "蓝队",
  scoreA: 4,
  scoreB: 2,
  state: "completed" as const,
  participants: [
    { studentId: "student-1", side: "A" as const },
    { studentId: "student-2", side: "B" as const },
  ],
  events: [
    {
      id: "one-goal",
      type: "goal" as const,
      side: "A" as const,
      studentId: "student-1",
      minute: 0,
      note: "其他孩子姓名不对家长公开",
    },
    {
      id: "two-save",
      type: "save" as const,
      side: "B" as const,
      studentId: "student-2",
      minute: null,
      note: "",
    },
  ],
  expectedRevision,
  requestId,
});
const post = (payload = creation()) =>
  app.inject({ method: "POST", url: base, headers, payload });
const patch = (gameId: string, payload = content()) =>
  app.inject({ method: "PATCH", url: `${base}/${gameId}`, headers, payload });
beforeEach(async () => {
  vi.stubEnv("FCM_TRAINING_GAME_CLUBS", clubId);
  const seed = seedData();
  persistence = await createPlatformPersistence({
    databasePath: ":memory:",
    seedData: seed,
  });
  store = new PersistentApiStore(persistence.repositories, seed);
  preparePlan(seed, store);
  app = buildServer(store, {
    logger: false,
    membershipResolver: new HeaderMembershipResolver(
      persistence.repositories.users,
      persistence.repositories.memberships,
    ),
  });
});
afterEach(async () => {
  await app?.close();
  persistence?.database.close();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("training games HTTP and persistence", () => {
  it("retains historical participants after course roster changes without accepting foreign additions", async () => {
    const id = (await post()).json().game.id;
    await patch(id);
    const original = store.listEventParticipants.bind(store);
    vi.spyOn(store, "listEventParticipants").mockImplementation((club) =>
      original(club).filter((row) => row.studentId !== "student-2"),
    );
    const corrected = await patch(id, {
      ...content(2, "after-roster-change"),
      reason: "核对历史比分",
      scoreA: 3,
    } as ReturnType<typeof content>);
    expect(corrected.statusCode, corrected.body).toBe(200);
    expect(corrected.json().game.participants).toContainEqual({
      studentId: "student-2",
      side: "B",
      nameSnapshot: "队友乙",
    });
    const rejected = await patch(id, {
      ...content(3, "foreign-after-change"),
      reason: "不能补入其他课程学员",
      participants: [{ studentId: "foreign", side: "A" }],
      events: [],
    } as ReturnType<typeof content>);
    expect(rejected.statusCode).toBe(400);
  });

  it("creates multiple games in one block and publishes only the bound child's own events", async () => {
    const ledger = await store.getLessonLedger(clubId, "student-1");
    const counts = store.trainingRecords.get(clubId, eventId, "student-1");
    const matches = persistence.repositories.matches.listMatches(clubId);
    const created = await post();
    expect(created.statusCode, created.body).toBe(200);
    const id = created.json().game.id;
    expect(created.json().game).toMatchObject({
      state: "draft",
      scoreA: null,
      scoreB: null,
      revision: 1,
    });
    expect(
      (
        await app.inject({
          method: "GET",
          url: `${parent}?studentId=student-1`,
          headers: { "x-user-id": "user-parent-1" },
        })
      ).json().games,
    ).toEqual([]);
    const completed = await patch(id);
    expect(completed.statusCode, completed.body).toBe(200);
    expect(completed.json().game).toMatchObject({
      scoreA: 4,
      scoreB: 2,
      revision: 2,
    });
    const visible = await app.inject({
      method: "GET",
      url: `${parent}?studentId=student-1`,
      headers: { "x-user-id": "user-parent-1" },
    });
    expect(visible.statusCode, visible.body).toBe(200);
    expect(visible.json().games[0].events).toEqual([
      { id: "one-goal", type: "goal", side: "A", minute: 0 },
    ]);
    for (const field of [
      "participants",
      "createdBy",
      "updatedBy",
      "clubId",
      "contentSnapshot",
    ])
      expect(visible.json().games[0]).not.toHaveProperty(field);
    expect(visible.body).not.toContain("student-2");
    expect(visible.body).not.toContain("其他孩子姓名");
    expect((await post(creation("create-two"))).json().game.id).not.toBe(id);
    expect(store.trainingRecords.get(clubId, eventId, "student-1")).toEqual(
      counts,
    );
    expect(await store.getLessonLedger(clubId, "student-1")).toEqual(ledger);
    expect(persistence.repositories.matches.listMatches(clubId)).toEqual(
      matches,
    );
  });
  it("replays immutable responses, rejects key reuse and stale versions, then audits correction and voiding", async () => {
    const first = (await post()).json().game;
    expect((await post()).json().game).toEqual(first);
    expect(store.trainingGames.list(clubId, eventId)).toHaveLength(1);
    expect(
      (await post({ ...creation(), sideAName: "different" })).statusCode,
    ).toBe(409);
    const complete = (await patch(first.id)).json().game;
    expect((await patch(first.id)).json().game).toEqual(complete);
    expect((await patch(first.id, content(1, "stale"))).statusCode).toBe(409);
    expect((await patch(first.id, content(2, "no-reason"))).statusCode).toBe(
      400,
    );
    const corrected = await patch(first.id, {
      ...content(2, "correct"),
      scoreA: 0,
      scoreB: 0,
      reason: "比分核对",
    } as ReturnType<typeof content>);
    expect(corrected.statusCode, corrected.body).toBe(200);
    expect((await patch(first.id)).json().game).toEqual(complete);
    expect(store.trainingGames.get(clubId, first.id)?.scoreA).toBe(0);
    const voided = await patch(first.id, {
      ...content(3, "void"),
      state: "voided",
      reason: "重复记录",
    } as unknown as ReturnType<typeof content>);
    expect(voided.statusCode, voided.body).toBe(200);
    expect(
      (
        await patch(first.id, {
          ...content(4, "revive"),
          reason: "恢复",
        } as ReturnType<typeof content>)
      ).statusCode,
    ).toBe(400);
    const detail = (
      await app.inject({ method: "GET", url: `${base}/${first.id}`, headers })
    ).json();
    expect(detail.history).toHaveLength(4);
    expect(detail.history[2]).toMatchObject({
      reason: "比分核对",
      scoreA: 0,
      scoreB: 0,
    });
    expect(
      (
        await app.inject({
          method: "GET",
          url: `${parent}?studentId=student-1`,
          headers: { "x-user-id": "user-parent-1" },
        })
      ).json().games,
    ).toEqual([]);
  });
  it("rejects foreign role, event, student, source and injected actor fields", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: base,
          headers: { "x-user-id": "user-parent-1" },
          payload: creation(),
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await post({ ...creation(), contentBlockId: "foreign" })).statusCode,
    ).toBe(400);
    const id = (await post()).json().game.id;
    const bad = {
      ...content(),
      participants: [{ studentId: "foreign", side: "A" as const }],
      events: [],
    };
    expect((await patch(id, bad)).statusCode).toBe(400);
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `${base}/${id}`,
          headers,
          payload: { ...content(), actorId: "forged" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "GET",
          url: `${parent}?studentId=student-2`,
          headers: { "x-user-id": "user-parent-1" },
        })
      ).statusCode,
    ).toBe(403);
    const inaccessible = vi
      .spyOn(store, "getCoachToday")
      .mockReturnValue({ events: [] });
    expect(
      (await app.inject({ method: "GET", url: base, headers })).statusCode,
    ).toBe(403);
    inaccessible.mockRestore();
    expect(store.trainingGames.get("foreign-club", id)).toBeNull();
    expect(store.trainingGames.list("foreign-club")).toEqual([]);
  });
  it("keeps history after source removal and blocks cancelled courses or disabled writes", async () => {
    const id = (await post()).json().game.id;
    await patch(id);
    const plan = store.getSessionPlan("game-plan")!;
    store.saveSessionPlan({ ...plan, blocks: [] });
    const list = (
      await app.inject({ method: "GET", url: base, headers })
    ).json();
    expect(list.sources).toEqual([]);
    expect(list.games[0].sourceAdjusted).toBe(true);
    expect((await post(creation("after-removal"))).statusCode).toBe(400);
    expect(
      (
        await patch(id, {
          ...content(2, "after-removal"),
          reason: "历史核对",
        } as ReturnType<typeof content>)
      ).statusCode,
    ).toBe(200);
    const event = (await store.getCalendarEvent(eventId))!;
    await store.saveCalendarEvent({ ...event, status: "cancelled" });
    expect(
      (
        await patch(id, {
          ...content(3, "cancelled"),
          reason: "更正",
        } as ReturnType<typeof content>)
      ).statusCode,
    ).toBe(409);
    expect(
      (await app.inject({ method: "GET", url: base, headers })).json().canEdit,
    ).toBe(false);
    expect(
      (
        await app.inject({
          method: "GET",
          url: `${parent}?studentId=student-1`,
          headers: { "x-user-id": "user-parent-1" },
        })
      ).json().games,
    ).toEqual([]);
    vi.stubEnv("FCM_TRAINING_GAME_CLUBS", "");
    expect((await post(creation("disabled"))).json().error.code).toBe(
      "training_games_disabled",
    );
    expect(
      (await app.inject({ method: "GET", url: base, headers })).json().games,
    ).toHaveLength(1);
  });
  it("rolls back root, participants and events when writing audit fails", async () => {
    const first = (await post()).json().game;
    persistence.database.exec(
      "CREATE TRIGGER game_audit_failure BEFORE INSERT ON training_game_revisions WHEN NEW.revision = 2 BEGIN SELECT RAISE(ABORT, 'fixture audit failure'); END;",
    );
    const result = await patch(first.id);
    expect(result.statusCode).toBe(500);
    expect(store.trainingGames.get(clubId, first.id)).toEqual(first);
    expect(store.trainingGames.history(clubId, first.id)).toHaveLength(1);
    persistence.database.exec("DROP TRIGGER game_audit_failure");
    expect((await patch(first.id)).statusCode).toBe(200);
  });
  it("adds the migration without moving historical friendly/internal matches and survives reopen", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cq-training-games-")),
      path = join(dir, "fixture.sqlite"),
      seed = seedData();
    let db = await createPlatformPersistence({
      databasePath: path,
      seedData: seed,
    });
    try {
      db.database.exec(
        "DROP TABLE training_game_revisions; DROP TABLE training_game_events; DROP TABLE training_game_participants; DROP TABLE training_games; DELETE FROM schema_migrations WHERE version = '0045_training_games.sql';",
      );
      const original = seed.matches[0]!;
      db.repositories.matches.saveMatch({ ...original, matchType: "friendly" });
      const originalEvent = seed.events.find(
        (item) => item.id === original.eventId,
      )!;
      db.repositories.calendar.insertEventIfAbsent({
        ...originalEvent,
        id: "legacy-internal-event",
      });
      db.repositories.matches.saveMatch({
        ...original,
        id: "legacy-internal",
        eventId: "legacy-internal-event",
        matchType: "internal",
      });
      const before = db.repositories.matches.listMatches(clubId);
      expect(before.map((item) => item.matchType)).toEqual(
        expect.arrayContaining(["friendly", "internal"]),
      );
      expect(migrate(db.database).applied).toEqual(["0045_training_games.sql"]);
      expect(db.repositories.matches.listMatches(clubId)).toEqual(before);
      const target = new PersistentApiStore(db.repositories, seed);
      preparePlan(seed, target);
      const event = (await target.getCalendarEvent(eventId))!;
      const draft = createTrainingGame(
        target,
        event,
        creation(),
        "user-coach-1",
        "2026-10-22T00:00:00Z",
        "durable-game",
      );
      const saved = updateTrainingGame(
        target,
        event,
        draft.id,
        content(),
        "user-coach-1",
        "2026-10-22T00:01:00Z",
      );
      db.database.close();
      db = await createPlatformPersistence({
        databasePath: path,
        seedData: seed,
      });
      expect(db.repositories.trainingGames.get(clubId, saved.id)).toEqual(
        saved,
      );
      expect(
        db.repositories.trainingGames.findRequest(clubId, eventId, "save-one")
          ?.snapshot,
      ).toEqual(saved);
      expect(db.repositories.matches.listMatches(clubId)).toEqual(before);
      expect(migrate(db.database).applied).toEqual([]);
    } finally {
      db.database.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

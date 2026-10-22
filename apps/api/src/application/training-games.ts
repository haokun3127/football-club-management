import { createHash, randomUUID } from "node:crypto";
import {
  validateTrainingGame,
  type CalendarEvent,
  type TrainingGame,
  type TrainingGameContent,
  type TrainingGameParticipant,
  type TrainingGameRevision,
} from "@football-club/domain";
import type { ApiStore } from "../store.js";
import { trainingContentRevision } from "./training-templates.js";

export class TrainingGameError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export type TrainingGameUpdate = Omit<TrainingGameContent, "participants"> & {
  participants: Array<Pick<TrainingGameParticipant, "studentId" | "side">>;
  expectedRevision: number;
  requestId: string;
  reason?: string;
};
export function trainingGamesEnabled(clubId: string) {
  return (process.env.FCM_TRAINING_GAME_CLUBS ?? "")
    .split(",")
    .map((value) => value.trim())
    .includes(clubId);
}

/** Call after course authorization. The activity roster defines selectable people, not attendance writes. */
export function trainingGameContext(store: ApiStore, event: CalendarEvent) {
  const session = store.getTrainingSessionByEvent(event.clubId, event.id);
  const plan = session?.sessionPlanId
    ? store.getSessionPlan(session.sessionPlanId)
    : null;
  const drills = store.listTrainingDrills(event.clubId);
  const sources = (plan?.blocks ?? []).flatMap((block) => {
    const drill = drills.find(
      (item) =>
        item.id === block.drillId &&
        item.recordingCapability === "friendly_match",
    );
    return drill && plan
      ? [
          {
            contentBlockId: block.id,
            contentSnapshot: {
              planId: plan.id,
              drillId: drill.id,
              name: drill.name,
              revision: trainingContentRevision(event, session, plan),
            },
          },
        ]
      : [];
  });
  const participantIds = new Set(
    store
      .listEventParticipants(event.clubId)
      .filter((item) => item.eventId === event.id)
      .map((item) => item.studentId),
  );
  const participants = store
    .listStudents(event.clubId)
    .filter((item) => participantIds.has(item.id))
    .map((item) => ({ studentId: item.id, name: item.name }));
  return { sources, participants };
}
export function sourceAdjusted(
  game: TrainingGame,
  context: ReturnType<typeof trainingGameContext>,
) {
  const source = context.sources.find(
    (item) => item.contentBlockId === game.contentBlockId,
  );
  return (
    !source ||
    source.contentSnapshot.planId !== game.contentSnapshot.planId ||
    source.contentSnapshot.drillId !== game.contentSnapshot.drillId ||
    source.contentSnapshot.revision !== game.contentSnapshot.revision
  );
}
function requestHash(value: unknown): string {
  const canonical = (input: unknown): unknown =>
    Array.isArray(input)
      ? input.map(canonical)
      : input && typeof input === "object"
        ? Object.fromEntries(
            Object.entries(input)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, item]) => [key, canonical(item)]),
          )
        : input;
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
function replay(
  store: ApiStore,
  event: CalendarEvent,
  requestId: string,
  hash: string,
) {
  const old = store.trainingGames.findRequest(
    event.clubId,
    event.id,
    requestId,
  );
  if (!old) return null;
  if (old.requestHash !== hash)
    throw new TrainingGameError(
      409,
      "training_game_request_conflict",
      "请求标识已用于其他内容，请重新核对后提交",
    );
  return old.snapshot;
}
function ensureWritable(event: CalendarEvent) {
  if (event.type !== "training")
    throw new TrainingGameError(
      400,
      "training_game_event_required",
      "友谊赛记录必须属于训练课",
    );
  if (event.status === "cancelled")
    throw new TrainingGameError(
      409,
      "training_cancelled",
      "课程已取消，仅支持查看历史记录",
    );
}
function persist(
  store: ApiStore,
  game: TrainingGame,
  expectedRevision: number,
  requestId: string,
  hash: string,
  reason: string,
) {
  const revision: TrainingGameRevision = {
    gameId: game.id,
    revision: game.revision,
    actorId: game.updatedBy,
    changedAt: game.updatedAt,
    reason,
    requestId,
    requestHash: hash,
    snapshot: game,
  };
  if (!store.trainingGames.compareAndSave(game, expectedRevision, revision))
    throw new TrainingGameError(
      409,
      "training_game_conflict",
      "记录已更新，请核对最新版本；本机修改应予保留",
    );
  return game;
}
export function createTrainingGame(
  store: ApiStore,
  event: CalendarEvent,
  input: {
    contentBlockId: string;
    sideAName: string;
    sideBName: string;
    requestId: string;
  },
  actorId: string,
  now = new Date().toISOString(),
  id = randomUUID(),
) {
  const hash = requestHash({ operation: "create", actorId, ...input });
  const previous = replay(store, event, input.requestId, hash);
  if (previous) return previous;
  ensureWritable(event);
  const source = trainingGameContext(store, event).sources.find(
    (item) => item.contentBlockId === input.contentBlockId,
  );
  if (!source)
    throw new TrainingGameError(
      400,
      "training_game_source_unavailable",
      "原训练内容没有可记录友谊赛的项目，请先核对课程内容",
    );
  const game: TrainingGame = {
    id,
    clubId: event.clubId,
    eventId: event.id,
    ...source,
    sideAName: input.sideAName.trim(),
    sideBName: input.sideBName.trim(),
    scoreA: null,
    scoreB: null,
    state: "draft",
    participants: [],
    events: [],
    revision: 1,
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
  validate(game);
  return persist(store, game, 0, input.requestId, hash, "创建草稿");
}
export function updateTrainingGame(
  store: ApiStore,
  event: CalendarEvent,
  gameId: string,
  input: TrainingGameUpdate,
  actorId: string,
  now = new Date().toISOString(),
) {
  const hash = requestHash({ operation: "update", gameId, actorId, ...input });
  const previous = replay(store, event, input.requestId, hash);
  if (previous) return previous;
  ensureWritable(event);
  const current = store.trainingGames.get(event.clubId, gameId);
  if (!current || current.eventId !== event.id)
    throw new TrainingGameError(404, "training_game_not_found", "记录不存在");
  if (current.revision !== input.expectedRevision)
    throw new TrainingGameError(
      409,
      "training_game_conflict",
      "记录已更新，请核对最新版本；本机修改应予保留",
    );
  const available = trainingGameContext(store, event).participants;
  const participants = input.participants.map((item) => {
    const student = available.find(
      (candidate) => candidate.studentId === item.studentId,
    );
    const existing = current.participants.find(
      (old) => old.studentId === item.studentId,
    );
    // Preserve historical participants after roster changes; only new additions require current membership.
    if (!student && !existing)
      throw new TrainingGameError(
        400,
        "training_game_student_unavailable",
        "参赛学员不在该训练课名单内，请核对",
      );
    return { ...item, nameSnapshot: existing?.nameSnapshot ?? student!.name };
  });
  const game: TrainingGame = {
    ...current,
    sideAName: input.sideAName.trim(),
    sideBName: input.sideBName.trim(),
    scoreA: input.scoreA,
    scoreB: input.scoreB,
    state: input.state,
    participants,
    events: input.events.map((item) => ({ ...item, note: item.note.trim() })),
    revision: current.revision + 1,
    updatedBy: actorId,
    updatedAt: now,
  };
  validate(game, current, input.reason);
  return persist(
    store,
    game,
    current.revision,
    input.requestId,
    hash,
    input.reason?.trim() ?? "",
  );
}

/** Explicit allowlist: never send other children's names, events, roster or audit actors to parents. */
export function parentTrainingGames(
  store: ApiStore,
  event: CalendarEvent,
  studentId: string,
) {
  if (event.status === "cancelled") return [];
  return store.trainingGames
    .list(event.clubId, event.id)
    .filter(
      (game) =>
        game.state === "completed" &&
        game.participants.some((item) => item.studentId === studentId),
    )
    .map((game) => ({
      id: game.id,
      eventId: game.eventId,
      contentName: game.contentSnapshot.name,
      sideAName: game.sideAName,
      sideBName: game.sideBName,
      scoreA: game.scoreA,
      scoreB: game.scoreB,
      revision: game.revision,
      updatedAt: game.updatedAt,
      // Free-form notes can name another child, so parent projection deliberately omits them.
      events: game.events
        .filter((item) => item.studentId === studentId)
        .map((item) => ({
          id: item.id,
          type: item.type,
          side: item.side,
          minute: item.minute,
        })),
    }));
}

function validate(
  game: TrainingGameContent,
  previous?: TrainingGameContent,
  reason?: string,
) {
  try {
    validateTrainingGame(game, previous, reason);
  } catch (error) {
    throw new TrainingGameError(
      400,
      "invalid_training_game",
      error instanceof Error ? error.message : "记录内容无效",
    );
  }
}

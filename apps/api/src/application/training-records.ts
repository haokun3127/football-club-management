import type { CalendarEvent, EventParticipant } from "@football-club/domain";

export interface TrainingRecord {
  clubId: string;
  eventId: string;
  studentId: string;
  revision: number;
  counted: boolean;
  source: "automatic" | "correction";
  occurredAt: string;
  updatedAt: string;
  history: Array<{
    revision: number;
    action?: "leave" | "leave_revoke";
    counted: boolean;
    previousCounted?: boolean | null;
    source: "automatic" | "correction";
    reason: string;
    actorUserId?: string;
    actorDisplayName?: string;
    changedAt: string;
  }>;
}

export interface TrainingRecordRepository {
  get(clubId: string, eventId: string, studentId: string): TrainingRecord | null;
  /** Atomically replaces the fact AND its history; revision 0 means insert only. */
  compareAndSave(record: TrainingRecord, expectedRevision: number): boolean;
}

export class MemoryTrainingRecordRepository implements TrainingRecordRepository {
  private readonly records = new Map<string, TrainingRecord>();
  get(clubId: string, eventId: string, studentId: string) {
    const record = this.records.get(JSON.stringify([clubId, eventId, studentId]));
    return record ? structuredClone(record) : null;
  }
  compareAndSave(record: TrainingRecord, expectedRevision: number) {
    const key = JSON.stringify([record.clubId, record.eventId, record.studentId]);
    if ((this.records.get(key)?.revision ?? 0) !== expectedRevision) return false;
    if (record.revision !== expectedRevision + 1) throw new Error("Invalid training record revision");
    this.records.set(key, structuredClone(record));
    return true;
  }

}

export class TrainingRecordConflict extends Error {
  constructor(readonly current: TrainingRecord | null) { super("Training record changed; reload before saving"); }
}

export function reconcileTrainingRecord(
  repository: TrainingRecordRepository,
  event: Pick<CalendarEvent, "id" | "clubId" | "timeRange"> & { type: string; status: string },
  participant: Pick<EventParticipant, "clubId" | "eventId" | "studentId"> & { status?: string },
  now = new Date().toISOString(),
): TrainingRecord | null {
  if (participant.clubId !== event.clubId || participant.eventId !== event.id) throw new Error("Participant scope mismatch");
  if (event.type !== "training") return null;
  const endsAt = Date.parse(event.timeRange.endsAt);
  const nowAt = Date.parse(now);
  if (!Number.isFinite(endsAt) || !Number.isFinite(nowAt)) throw new Error("Invalid training timestamp");
  const current = repository.get(event.clubId, event.id, participant.studentId);
  if (nowAt < endsAt && !(current && event.status === "cancelled")) return current;
  // A retry or a subsequent attendance update must never erase a human correction.
  if (current?.source === "correction" && event.status !== "cancelled") return current;
  const counted = event.status !== "cancelled" && !["leave_requested", "excused", "absent"].includes(participant.status ?? "");
  const reason = event.status === "cancelled" ? "课程已取消"
    : ["leave_requested", "excused"].includes(participant.status ?? "") ? "已请假"
      : participant.status === "absent" ? "已记录缺席" : "训练已结束，自动记录";
  if (current?.counted === counted && current.occurredAt === event.timeRange.startsAt) return current;
  const revision = (current?.revision ?? 0) + 1;
  const record: TrainingRecord = {
    clubId: event.clubId, eventId: event.id, studentId: participant.studentId,
    revision, counted, source: "automatic", occurredAt: event.timeRange.startsAt, updatedAt: now,
    history: [...(current?.history ?? []), { revision, counted, previousCounted: current?.counted ?? null, source: "automatic", reason, changedAt: now }],
  };
  if (!repository.compareAndSave(record, revision - 1)) return repository.get(event.clubId, event.id, participant.studentId);
  return record;
}

export function correctTrainingRecord(
  repository: TrainingRecordRepository,
  scope: { clubId: string; eventId: string; studentId: string },
  input: { expectedRevision: number; counted: boolean; reason: string; actorUserId: string; actorDisplayName?: string; initialOccurredAt?: string; action?: "leave" | "leave_revoke" },
  now = new Date().toISOString(),
): TrainingRecord {
  const current = repository.get(scope.clubId, scope.eventId, scope.studentId);
  if ((current?.revision ?? 0) !== input.expectedRevision || (!current && !input.initialOccurredAt)) throw new TrainingRecordConflict(current);
  if (!input.reason.trim() || input.reason.length > 500 || !input.actorUserId.trim()) throw new Error("A correction requires an actor and a reason of at most 500 characters");
  const revision = (current?.revision ?? 0) + 1;
  const record: TrainingRecord = {
    ...scope, occurredAt: current?.occurredAt ?? input.initialOccurredAt!, counted: input.counted, source: "correction", revision, updatedAt: now,
    history: [...(current?.history ?? []), { revision, ...(input.action ? { action: input.action } : {}), counted: input.counted, previousCounted: current?.counted ?? null, source: "correction", reason: input.reason.trim(), actorUserId: input.actorUserId, actorDisplayName: input.actorDisplayName, changedAt: now }],
  };
  if (!repository.compareAndSave(record, current?.revision ?? 0)) throw new TrainingRecordConflict(repository.get(scope.clubId, scope.eventId, scope.studentId));
  return record;
}

/**
 * 家长请假（REQ-ATT-001）：本质是一次参与状态修正——写入不销课的训练记录并留痕，
 * 与课后更正共用 correctTrainingRecord 的修订/冲突/留痕机制，不另起第三条销课写入路径。
 */
export function requestTrainingLeave(
  repository: TrainingRecordRepository,
  scope: { clubId: string; eventId: string; studentId: string },
  input: { expectedRevision: number; reason?: string; actorUserId: string; actorDisplayName?: string; initialOccurredAt: string },
  now = new Date().toISOString(),
): TrainingRecord {
  return correctTrainingRecord(repository, scope, {
    expectedRevision: input.expectedRevision,
    counted: false,
    action: "leave",
    reason: input.reason?.trim() || "家长请假",
    actorUserId: input.actorUserId,
    actorDisplayName: input.actorDisplayName,
    initialOccurredAt: input.initialOccurredAt,
  }, now);
}

/**
 * 撤回请假始终追加历史和修订。课前恢复请假前的人工事实，或等待课后自动记录；
 * 课后撤回计次。绝不删除旧事实或复用已出现过的修订号。
 */
export function revokeTrainingLeave(
  repository: TrainingRecordRepository,
  scope: { clubId: string; eventId: string; studentId: string },
  event: Pick<CalendarEvent, "timeRange">,
  input: { expectedRevision: number; reason?: string; actorUserId: string; actorDisplayName?: string },
  now = new Date().toISOString(),
): TrainingRecord | null {
  const current = repository.get(scope.clubId, scope.eventId, scope.studentId);
  if (!current) return null;
  const endsAt = Date.parse(event.timeRange.endsAt);
  const nowAt = Date.parse(now);
  if (!Number.isFinite(endsAt) || !Number.isFinite(nowAt)) throw new Error("Invalid training timestamp");
  if (nowAt < endsAt) {
    if (current.revision !== input.expectedRevision) throw new TrainingRecordConflict(current);
    let previousIndex = current.history.length - 1;
    while (previousIndex >= 0 && current.history[previousIndex]?.action === "leave") previousIndex -= 1;
    const previous = current.history[previousIndex];
    const revision = current.revision + 1;
    const counted = previous?.counted ?? false;
    const source = previous?.source ?? "automatic";
    const record: TrainingRecord = { ...current, revision, counted, source, updatedAt: now,
      history: [...current.history, { revision, counted, source, action: "leave_revoke", previousCounted: current.counted,
        reason: input.reason?.trim() || "撤回请假，恢复课程记录流程", actorUserId: input.actorUserId,
        actorDisplayName: input.actorDisplayName, changedAt: now }] };
    if (!repository.compareAndSave(record, current.revision)) throw new TrainingRecordConflict(repository.get(scope.clubId, scope.eventId, scope.studentId));
    return record;
  }
  return correctTrainingRecord(repository, scope, {
    expectedRevision: input.expectedRevision,
    counted: true,
    action: "leave_revoke",
    reason: input.reason?.trim() || "撤回请假，改为销课",
    actorUserId: input.actorUserId,
    actorDisplayName: input.actorDisplayName,
  }, now);
}

import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { correctTrainingRecord, MemoryTrainingRecordRepository, reconcileTrainingRecord, requestTrainingLeave, revokeTrainingLeave, TrainingRecordConflict } from "../src/application/training-records.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData } from "../src/seed.js";

const data = createSeedData();
const event = data.events.find((item) => item.type === "training")!;
const participant = data.participants.find((item) => item.eventId === event.id)!;
const pastEvent = { ...event, status: "completed" as const, timeRange: { startsAt: "2026-09-21T08:00:00Z", endsAt: "2026-09-21T09:30:00Z" } };
const nextDay = "2026-09-21T16:00:00Z";

describe("independent training facts", () => {
  it("records at the course end instant across timezones, and ignores matches", () => {
    const repository = new MemoryTrainingRecordRepository();
    expect(reconcileTrainingRecord(repository, pastEvent, participant, "2026-09-21T09:29:59.999Z")).toBeNull();
    expect(reconcileTrainingRecord(repository, pastEvent, participant, "2026-09-21T17:30:00+08:00")?.counted).toBe(true);
    expect(reconcileTrainingRecord(repository, { ...pastEvent, type: "match" }, participant, nextDay)).toBeNull();
  });

  it("preserves an explicit coach correction before and after course end, and cancels it with history", () => {
    const repository = new MemoryTrainingRecordRepository();
    const scope = { clubId: event.clubId, eventId: event.id, studentId: participant.studentId };
    const early = correctTrainingRecord(repository, scope, { expectedRevision: 0, counted: true, reason: "教练快捷勾选", actorUserId: "coach", initialOccurredAt: pastEvent.timeRange.startsAt }, "2026-09-21T09:00:00Z");
    expect(early.history[0].previousCounted).toBeNull();
    expect(reconcileTrainingRecord(repository, pastEvent, participant, "2026-09-21T09:00:01Z")).toEqual(early);
    expect(reconcileTrainingRecord(repository, pastEvent, participant, nextDay)).toEqual(early);
    const cancelled = reconcileTrainingRecord(repository, { ...pastEvent, status: "cancelled" }, participant, "2026-09-21T09:00:02Z")!;
    expect(cancelled.counted).toBe(false);
    expect(cancelled.history.at(-1)).toMatchObject({ previousCounted: true, counted: false });
    expect(() => correctTrainingRecord(repository, scope, { expectedRevision: 0, counted: false, reason: "stale", actorUserId: "coach", initialOccurredAt: pastEvent.timeRange.startsAt })).toThrow(TrainingRecordConflict);
  });

  it.each(["leave_requested", "excused", "absent"] as const)("does not count %s or cancelled courses", (status) => {
    const repository = new MemoryTrainingRecordRepository();
    expect(reconcileTrainingRecord(repository, pastEvent, { ...participant, status }, nextDay)?.counted).toBe(false);
    expect(reconcileTrainingRecord(repository, { ...pastEvent, status: "cancelled" }, participant, nextDay)?.counted).toBe(false);
  });

  it("writes pre-class leave as an audited non-counted fact and removes it on pre-class withdrawal", () => {
    const repository = new MemoryTrainingRecordRepository();
    const scope = { clubId: event.clubId, eventId: event.id, studentId: participant.studentId };
    const beforeClass = "2026-09-21T07:00:00Z";
    const leave = requestTrainingLeave(repository, scope, { expectedRevision: 0, actorUserId: "parent-1", initialOccurredAt: pastEvent.timeRange.startsAt }, beforeClass);
    expect(leave).toMatchObject({ counted: false, source: "correction", revision: 1 });
    expect(leave.history[0]).toMatchObject({ reason: "家长请假", actorUserId: "parent-1", previousCounted: null });
    // 课前请假不会被自动任务覆盖
    expect(reconcileTrainingRecord(repository, pastEvent, { ...participant, status: "leave_requested" }, nextDay)).toEqual(leave);
    // 课前撤回：删除记录，恢复默认自动流程；过期版本撤回触发冲突
    expect(revokeTrainingLeave(repository, scope, pastEvent, { expectedRevision: 1, actorUserId: "parent-1" }, beforeClass)).toBeNull();
    expect(repository.get(scope.clubId, scope.eventId, scope.studentId)).toBeNull();
    const reLeave = requestTrainingLeave(repository, scope, { expectedRevision: 0, actorUserId: "parent-1", initialOccurredAt: pastEvent.timeRange.startsAt }, beforeClass);
    expect(() => revokeTrainingLeave(repository, scope, pastEvent, { expectedRevision: 0, actorUserId: "parent-1" }, beforeClass)).toThrow(TrainingRecordConflict);
    expect(repository.get(scope.clubId, scope.eventId, scope.studentId)).toEqual(reLeave);
    expect(repository.remove(scope.clubId, scope.eventId, scope.studentId, 99)).toBe(false);
  });

  it("withdraws a post-class leave as a counted correction with history", () => {
    const repository = new MemoryTrainingRecordRepository();
    const scope = { clubId: event.clubId, eventId: event.id, studentId: participant.studentId };
    const leave = requestTrainingLeave(repository, scope, { expectedRevision: 0, actorUserId: "parent-1", initialOccurredAt: pastEvent.timeRange.startsAt }, nextDay);
    const revoked = revokeTrainingLeave(repository, scope, pastEvent, { expectedRevision: leave.revision, actorUserId: "parent-1" }, nextDay)!;
    expect(revoked).toMatchObject({ counted: true, revision: 2 });
    expect(revoked.history.at(-1)).toMatchObject({ reason: "撤回请假，改为销课", previousCounted: false, actorUserId: "parent-1" });
    // 没有记录时撤回直接成功且不产生事实
    expect(revokeTrainingLeave(repository, { ...scope, studentId: "student-none" }, pastEvent, { expectedRevision: 0, actorUserId: "parent-1" }, nextDay)).toBeNull();
  });

  it("replays automatic work without duplicates and preserves a manual correction and its history", () => {
    const repository = new MemoryTrainingRecordRepository();
    const first = reconcileTrainingRecord(repository, pastEvent, participant, nextDay)!;
    expect(reconcileTrainingRecord(repository, pastEvent, participant, nextDay)).toEqual(first);
    const corrected = correctTrainingRecord(repository, first, { expectedRevision: 1, counted: false, actorUserId: "parent", reason: "当天未参与训练" }, nextDay);
    expect(corrected.history).toHaveLength(2);
    expect(reconcileTrainingRecord(repository, pastEvent, { ...participant, status: "present" }, "2026-09-23T00:00:00Z")).toEqual(corrected);
    expect(() => correctTrainingRecord(repository, first, { expectedRevision: 1, counted: true, actorUserId: "coach", reason: "stale edit" })).toThrow(TrainingRecordConflict);
    expect(repository.get(first.clubId, first.eventId, first.studentId)).toEqual(corrected);
    expect(repository.get("other-club", first.eventId, first.studentId)).toBeNull();
  });

  it("keeps correction/history across SQLite reopen and leaves the financial ledger unchanged", async () => {
    const directory = mkdtempSync(join(tmpdir(), "training-facts-"));
    const databasePath = join(directory, "test.sqlite");
    const first = await createPlatformPersistence({ databasePath });
    try {
      const financial = first.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all();
      const automatic = reconcileTrainingRecord(first.repositories.trainingRecords, pastEvent, participant, nextDay)!;
      const corrected = correctTrainingRecord(first.repositories.trainingRecords, automatic, { expectedRevision: 1, counted: false, actorUserId: "parent", reason: "未参训" }, nextDay);
      expect(first.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all()).toEqual(financial);
      first.database.close();
      const reopened = await createPlatformPersistence({ databasePath, seed: false });
      try {
        expect(reopened.repositories.trainingRecords.get(corrected.clubId, corrected.eventId, corrected.studentId)).toEqual(corrected);
        expect(reopened.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all()).toEqual(financial);
        expect(reopened.repositories.trainingRecords.compareAndSave({ ...corrected, revision: 2 }, 1)).toBe(false);
      } finally { reopened.database.close(); }
    } finally {
      if (first.database.isOpen) first.database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

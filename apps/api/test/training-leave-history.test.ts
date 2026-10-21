import { expect, it } from "vitest";
import { correctTrainingRecord, MemoryTrainingRecordRepository, requestTrainingLeave, revokeTrainingLeave, reconcileTrainingRecord } from "../src/application/training-records.js";
it("retains withdrawal history and monotonic revisions until automatic end-of-course recording", () => {
  const repo = new MemoryTrainingRecordRepository();
  const scope = { clubId: "club", eventId: "event", studentId: "student" };
  const event = { id: "event", clubId: "club", type: "training", status: "scheduled", timeRange: { startsAt: "2026-10-23T08:00:00Z", endsAt: "2026-10-23T09:00:00Z" } };
  requestTrainingLeave(repo, scope, { expectedRevision: 0, actorUserId: "parent", initialOccurredAt: event.timeRange.startsAt }, "2026-10-21T00:00:00Z");
  revokeTrainingLeave(repo, scope, event, { expectedRevision: 1, actorUserId: "parent" }, "2026-10-22T00:00:00Z");
  const withdrawn = repo.get("club", "event", "student");
  expect(withdrawn?.history).toHaveLength(2);
  expect(withdrawn?.revision).toBe(2);
  expect(withdrawn?.counted).toBe(false);
  const ended = reconcileTrainingRecord(repo, event, { ...scope, status: "confirmed" }, "2026-10-23T09:00:00Z");
  expect(ended?.counted).toBe(true);
  expect(ended?.history).toHaveLength(3);
});

it("restores a prior manual correction on pre-class withdrawal", () => {
  const repo = new MemoryTrainingRecordRepository();
  const scope = { clubId: "club", eventId: "event", studentId: "student" };
  const event = { id: "event", clubId: "club", type: "training", status: "scheduled", timeRange: { startsAt: "2026-10-23T08:00:00Z", endsAt: "2026-10-23T09:00:00Z" } };
  correctTrainingRecord(repo, scope, { expectedRevision: 0, counted: true, reason: "教练确认", actorUserId: "coach", initialOccurredAt: event.timeRange.startsAt });
  requestTrainingLeave(repo, scope, { expectedRevision: 1, actorUserId: "parent", initialOccurredAt: event.timeRange.startsAt });
  const result = revokeTrainingLeave(repo, scope, event, { expectedRevision: 2, actorUserId: "parent" }, "2026-10-22T00:00:00Z");
  expect(result).toMatchObject({ revision: 3, counted: true, source: "correction" });
  expect(result?.history.map(item => item.action)).toEqual([undefined, "leave", "leave_revoke"]);
});

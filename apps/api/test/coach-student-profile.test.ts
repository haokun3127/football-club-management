import { describe, it, expect } from "vitest";
import { buildCoachStudentProfile } from "../src/application/coach-student-profile.js";
import { createSeedData } from "../src/seed.js";
import { InMemoryStore } from "../src/store.js";
import { correctTrainingRecord } from "../src/application/training-records.js";

describe("teaching profile projection", () => {
 it("separates attendance and effective records, scopes teams, omits sensitive fields and respects cancellation", async () => {
  const seed = createSeedData(); const clubId = "club-chongqing-talent";
  const event = seed.events.find(item => item.id === "event-training-1")!;
  event.timeRange = { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" };
  const participant = seed.participants.find(item => item.eventId === event.id && item.studentId === "student-1")!; participant.status = "late";
  seed.events = [event]; seed.participants = [participant];
  const store = new InMemoryStore(seed);
  const ledger = structuredClone(await store.getLessonLedger(clubId, "student-1"));
  const first = (await buildCoachStudentProfile(store, clubId, "student-1", new Set([event.primaryTeamId!]), "2026-09-28T00:00:00Z"))!;
  expect(first.attendance).toMatchObject({ expected: 1, present: 1, late: 1, effectiveLessons: 1 });
  expect(first.student).not.toHaveProperty("contacts"); expect(first).not.toHaveProperty("lessonBalance");
  const record = store.trainingRecords.get(clubId, event.id, "student-1")!;
  correctTrainingRecord(store.trainingRecords, record, { expectedRevision: record.revision, counted: false, reason: "复核计次", actorUserId: "private-user" });
  const corrected = (await buildCoachStudentProfile(store, clubId, "student-1", new Set([event.primaryTeamId!]), "2026-09-28T00:00:00Z"))!;
  expect(corrected.attendance).toMatchObject({ expected: 1, present: 0, absent: 1, late: 0, effectiveLessons: 0 });
  expect(corrected.training.modules).toEqual([]);
  expect(corrected.training.participation).toBe(0);
  expect(corrected.records[0]?.status).toBe("absent");
  store.saveCalendarEvent({ ...event, status: "cancelled" });
  const cancelled = (await buildCoachStudentProfile(store, clubId, "student-1", new Set([event.primaryTeamId!]), "2026-09-28T00:00:00Z"))!;
  expect(cancelled.attendance).toMatchObject({ expected: 0, effectiveLessons: 0 });
  expect(cancelled.records[0]?.history.some(entry => entry.reason === "复核计次")).toBe(true);
  expect(JSON.stringify(cancelled)).not.toContain("private-user");
  const hidden = await buildCoachStudentProfile(store, clubId, "student-1", new Set(["unrelated"])); expect(hidden?.records).toEqual([]);
  expect(await store.getLessonLedger(clubId, "student-1")).toEqual(ledger);
 });
});

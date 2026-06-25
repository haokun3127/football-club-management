import { describe, expect, it } from "vitest";
import { findScheduleConflicts } from "../src/index.js";

describe("findScheduleConflicts", () => {
  it("detects time overlap for the same student or coach", () => {
    const conflicts = findScheduleConflicts(
      [
        {
          clubId: "club-demo",
          subjectId: "student-1",
          eventId: "event-training",
          timeRange: {
            startsAt: "2026-07-01T09:00:00.000Z",
            endsAt: "2026-07-01T10:30:00.000Z",
          },
        },
      ],
      {
        clubId: "club-demo",
        subjectId: "student-1",
        eventId: "event-private",
        timeRange: {
          startsAt: "2026-07-01T10:00:00.000Z",
          endsAt: "2026-07-01T11:00:00.000Z",
        },
      },
    );

    expect(conflicts).toEqual([
      {
        clubId: "club-demo",
        subjectId: "student-1",
        existingEventId: "event-training",
        candidateEventId: "event-private",
      },
    ]);
  });

  it("does not flag overlap across different clubs", () => {
    const conflicts = findScheduleConflicts(
      [
        {
          clubId: "club-a",
          subjectId: "student-1",
          eventId: "event-training-a",
          timeRange: {
            startsAt: "2026-07-01T09:00:00.000Z",
            endsAt: "2026-07-01T10:30:00.000Z",
          },
        },
      ],
      {
        clubId: "club-b",
        subjectId: "student-1",
        eventId: "event-training-b",
        timeRange: {
          startsAt: "2026-07-01T09:30:00.000Z",
          endsAt: "2026-07-01T10:30:00.000Z",
        },
      },
    );

    expect(conflicts).toEqual([]);
  });
});

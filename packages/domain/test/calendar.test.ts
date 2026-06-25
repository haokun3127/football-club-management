import { describe, expect, it } from "vitest";
import { findScheduleConflicts } from "../src/index.js";

describe("findScheduleConflicts", () => {
  it("detects time overlap for the same student or coach", () => {
    const conflicts = findScheduleConflicts(
      [
        {
          subjectId: "student-1",
          eventId: "event-training",
          timeRange: {
            startsAt: "2026-07-01T09:00:00.000Z",
            endsAt: "2026-07-01T10:30:00.000Z",
          },
        },
      ],
      {
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
        subjectId: "student-1",
        existingEventId: "event-training",
        candidateEventId: "event-private",
      },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { expandRecurringCalendarEvent, findScheduleConflicts } from "../src/index.js";

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

  it("expands recurring calendar events using rrule", () => {
    const occurrences = expandRecurringCalendarEvent({
      event: {
        id: "event-training-series",
        clubId: "club-demo",
        type: "training",
        title: "Weekly Training",
        timeRange: {
          startsAt: "2026-07-01T09:00:00Z",
          endsAt: "2026-07-01T10:30:00Z",
        },
        primaryTeamId: "team-u10-dev",
        ownerCoachId: "coach-1",
        status: "scheduled",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:00:00.000Z",
      },
      recurrence: {
        rrule: "FREQ=WEEKLY;COUNT=3",
        timezone: "Asia/Hong_Kong",
        startsAt: "2026-07-01T09:00:00Z",
      },
      range: {
        startsAt: "2026-07-01T00:00:00Z",
        endsAt: "2026-07-31T00:00:00Z",
      },
    });

    expect(occurrences.map((occurrence) => occurrence.timeRange.startsAt)).toEqual([
      "2026-07-01T09:00:00Z",
      "2026-07-08T09:00:00Z",
      "2026-07-15T09:00:00Z",
    ]);
    expect(occurrences[0]).toEqual(expect.objectContaining({
      id: "event-training-series#1",
      seriesEventId: "event-training-series",
      occurrenceIndex: 1,
    }));
  });
});

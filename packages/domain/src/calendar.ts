import type { AuditFields, EntityId, TimeRange } from "./primitives.js";
import type { ClubScoped } from "./clubs.js";
import { timeRangesOverlap } from "./primitives.js";
import { Temporal } from "@js-temporal/polyfill";
import { rrulestr } from "rrule";

export type CalendarEventType = "training" | "match" | "other";
export type CalendarEventStatus = "scheduled" | "cancelled" | "completed";
export type ParticipantStatus = "invited" | "confirmed" | "present" | "absent" | "leave_requested" | "late" | "excused";

export interface TrainingLocation extends AuditFields, ClubScoped {
  id: EntityId;
  name: string;
  address?: string;
  notes?: string;
}

export interface CalendarEvent extends AuditFields, ClubScoped {
  id: EntityId;
  type: CalendarEventType;
  title: string;
  timeRange: TimeRange;
  locationId?: EntityId;
  primaryTeamId?: EntityId;
  ownerCoachId?: EntityId;
  status: CalendarEventStatus;
  notes?: string;
}

export interface RecurrenceRule {
  rrule: string;
  timezone: string;
  startsAt: string;
}

export interface CalendarEventOccurrence extends CalendarEvent {
  seriesEventId: EntityId;
  occurrenceIndex: number;
}

export interface EventParticipant extends AuditFields, ClubScoped {
  id: EntityId;
  eventId: EntityId;
  studentId: EntityId;
  status: ParticipantStatus;
  note?: string;
}

export interface ScheduledCommitment {
  clubId: EntityId;
  subjectId: EntityId;
  eventId: EntityId;
  timeRange: TimeRange;
}

export interface ScheduleConflict {
  clubId: EntityId;
  subjectId: EntityId;
  existingEventId: EntityId;
  candidateEventId: EntityId;
}

export function findScheduleConflicts(
  existing: ScheduledCommitment[],
  candidate: ScheduledCommitment,
): ScheduleConflict[] {
  return existing
    .filter((item) => item.clubId === candidate.clubId && item.subjectId === candidate.subjectId)
    .filter((item) => item.eventId !== candidate.eventId)
    .filter((item) => timeRangesOverlap(item.timeRange, candidate.timeRange))
    .map((item) => ({
      clubId: candidate.clubId,
      subjectId: item.subjectId,
      existingEventId: item.eventId,
      candidateEventId: candidate.eventId,
    }));
}

export function expandRecurringCalendarEvent(input: {
  event: CalendarEvent;
  recurrence: RecurrenceRule;
  range: TimeRange;
  maxOccurrences?: number;
}): CalendarEventOccurrence[] {
  const startsAt = Temporal.Instant.from(input.event.timeRange.startsAt);
  const endsAt = Temporal.Instant.from(input.event.timeRange.endsAt);
  const durationMilliseconds = endsAt.epochMilliseconds - startsAt.epochMilliseconds;

  if (durationMilliseconds <= 0) {
    throw new Error(`Calendar event ${input.event.id} must end after it starts.`);
  }

  const rule = rrulestr(input.recurrence.rrule, {
    dtstart: new Date(input.recurrence.startsAt),
    tzid: input.recurrence.timezone,
  });
  const occurrenceStarts = rule
    .between(new Date(input.range.startsAt), new Date(input.range.endsAt), true)
    .slice(0, input.maxOccurrences ?? 100);

  return occurrenceStarts.map((occurrenceStart, index) => {
    const occurrenceStartInstant = Temporal.Instant.from(occurrenceStart.toISOString());
    const occurrenceEndInstant = occurrenceStartInstant.add({ milliseconds: durationMilliseconds });

    return {
      ...input.event,
      id: `${input.event.id}#${index + 1}`,
      seriesEventId: input.event.id,
      occurrenceIndex: index + 1,
      timeRange: {
        startsAt: occurrenceStartInstant.toString(),
        endsAt: occurrenceEndInstant.toString(),
      },
    };
  });
}

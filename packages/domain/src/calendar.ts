import type { AuditFields, EntityId, TimeRange } from "./primitives.js";
import { timeRangesOverlap } from "./primitives.js";

export type CalendarEventType = "training" | "match" | "other";
export type CalendarEventStatus = "scheduled" | "cancelled" | "completed";
export type ParticipantStatus = "invited" | "confirmed" | "present" | "absent" | "leave_requested" | "late" | "excused";

export interface TrainingLocation extends AuditFields {
  id: EntityId;
  name: string;
  address?: string;
  notes?: string;
}

export interface CalendarEvent extends AuditFields {
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

export interface EventParticipant extends AuditFields {
  id: EntityId;
  eventId: EntityId;
  studentId: EntityId;
  status: ParticipantStatus;
  note?: string;
}

export interface ScheduledCommitment {
  subjectId: EntityId;
  eventId: EntityId;
  timeRange: TimeRange;
}

export interface ScheduleConflict {
  subjectId: EntityId;
  existingEventId: EntityId;
  candidateEventId: EntityId;
}

export function findScheduleConflicts(
  existing: ScheduledCommitment[],
  candidate: ScheduledCommitment,
): ScheduleConflict[] {
  return existing
    .filter((item) => item.subjectId === candidate.subjectId)
    .filter((item) => timeRangesOverlap(item.timeRange, candidate.timeRange))
    .map((item) => ({
      subjectId: item.subjectId,
      existingEventId: item.eventId,
      candidateEventId: candidate.eventId,
    }));
}

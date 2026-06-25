import type { AuditFields, EntityId, TimeRange } from "./primitives.js";
import type { ClubScoped } from "./clubs.js";
import { timeRangesOverlap } from "./primitives.js";

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

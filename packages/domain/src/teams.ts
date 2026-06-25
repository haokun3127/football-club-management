import type { AuditFields, EntityId } from "./primitives.js";
import type { ClubScoped } from "./clubs.js";

export type TeamLevel = "introductory" | "development" | "advanced" | "elite";
export type TeamMemberStatus = "active" | "paused" | "graduated" | "left";

export interface Team extends AuditFields, ClubScoped {
  id: EntityId;
  name: string;
  ageGroup: string;
  level: TeamLevel;
  defaultCoachId?: EntityId;
  defaultLocationId?: EntityId;
  status: "active" | "inactive";
}

export interface TeamMember extends AuditFields, ClubScoped {
  id: EntityId;
  teamId: EntityId;
  studentId: EntityId;
  startsAt: string;
  endsAt?: string;
  isPrimaryTeam: boolean;
  status: TeamMemberStatus;
}

export interface CoachAssignment extends AuditFields, ClubScoped {
  id: EntityId;
  coachId: EntityId;
  teamId?: EntityId;
  eventId?: EntityId;
  role: "head_coach" | "assistant_coach" | "guest_coach";
}

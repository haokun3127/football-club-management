import type { AuditFields, EntityId } from "./primitives.js";
import type { ClubScoped } from "./clubs.js";

export type MatchType = "internal" | "friendly" | "league" | "cup";
export type MatchStatus = "scheduled" | "completed" | "cancelled";
export type MatchEventType = "goal" | "assist" | "save" | "tackle" | "yellow_card" | "red_card" | "penalty" | "own_goal";

export interface Match extends AuditFields, ClubScoped {
  id: EntityId;
  eventId: EntityId;
  matchType: MatchType;
  opponentName?: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
}

export interface MatchRoster extends AuditFields, ClubScoped {
  id: EntityId;
  matchId: EntityId;
  studentId: EntityId;
  teamId?: EntityId;
  started: boolean;
  minutesPlayed?: number;
  position?: string;
}

export interface MatchEvent extends AuditFields, ClubScoped {
  id: EntityId;
  matchId: EntityId;
  type: MatchEventType;
  studentId: EntityId;
  minute?: number;
  linkedMetricId?: EntityId;
  note?: string;
}

export interface MatchPlayerNote extends AuditFields, ClubScoped {
  id: EntityId;
  matchId: EntityId;
  studentId: EntityId;
  coachId: EntityId;
  note: string;
}

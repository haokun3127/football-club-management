import type { AuditFields, EntityId } from "./primitives.js";

export interface AssessmentTemplate extends AuditFields {
  id: EntityId;
  name: string;
  ageGroup?: string;
  teamLevel?: string;
  metricIds: EntityId[];
  status: "active" | "inactive";
}

export interface PlayerAssessment extends AuditFields {
  id: EntityId;
  studentId: EntityId;
  templateId: EntityId;
  assessedByCoachId: EntityId;
  assessedAt: string;
  eventId?: EntityId;
  summary?: string;
}

export interface AssessmentScore extends AuditFields {
  id: EntityId;
  assessmentId: EntityId;
  metricId: EntityId;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface PlayerDevelopmentGoal extends AuditFields {
  id: EntityId;
  studentId: EntityId;
  metricId?: EntityId;
  title: string;
  targetDescription: string;
  startsAt: string;
  endsAt?: string;
  status: "active" | "completed" | "cancelled";
}

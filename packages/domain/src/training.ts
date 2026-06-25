import type { AuditFields, EntityId } from "./primitives.js";

export type TrainingSessionKind = "team" | "small_group" | "private" | "specialty";
export type DrillDifficulty = "introductory" | "standard" | "advanced";

export interface DevelopmentDimension extends AuditFields {
  id: EntityId;
  code: string;
  name: string;
  description?: string;
}

export interface TrainingObjective extends AuditFields {
  id: EntityId;
  dimensionId: EntityId;
  code: string;
  name: string;
  description?: string;
}

export interface TrainingDrill extends AuditFields {
  id: EntityId;
  name: string;
  objectiveIds: EntityId[];
  metricIds: EntityId[];
  durationMinutes: number;
  difficulty: DrillDifficulty;
  recommendedAgeGroups: string[];
  recommendedLevels: string[];
  equipment: string[];
  setup?: string;
  coachingPoints: string[];
}

export interface SessionPlanBlock {
  id: EntityId;
  drillId: EntityId;
  order: number;
  plannedMinutes: number;
  notes?: string;
}

export interface SessionPlan extends AuditFields {
  id: EntityId;
  name: string;
  objectiveIds: EntityId[];
  metricIds: EntityId[];
  blocks: SessionPlanBlock[];
  estimatedMinutes: number;
}

export interface TrainingSession extends AuditFields {
  id: EntityId;
  eventId: EntityId;
  kind: TrainingSessionKind;
  sessionPlanId?: EntityId;
  intensity?: "low" | "medium" | "high";
}

export interface SessionDelivery extends AuditFields {
  id: EntityId;
  trainingSessionId: EntityId;
  deliveredBlockIds: EntityId[];
  coachId: EntityId;
  intensity?: "low" | "medium" | "high";
  summary?: string;
}

export interface SessionObservation extends AuditFields {
  id: EntityId;
  trainingSessionId: EntityId;
  studentId: EntityId;
  coachId: EntityId;
  metricId?: EntityId;
  rating?: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  note?: string;
}

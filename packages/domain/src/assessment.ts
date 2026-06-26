import type { AuditFields, EntityId } from "./primitives.js";
import type { CatalogScoped, ClubScoped } from "./clubs.js";
import type { MetricValue } from "./metrics.js";

export type AssessmentBindingRole = "input" | "output" | "reference" | "display_only";
export type AssessmentTemplateVersionStatus = "draft" | "active" | "archived";

export interface AssessmentTemplate extends AuditFields, CatalogScoped {
  id: EntityId;
  name: string;
  ageGroup?: string;
  teamLevel?: string;
  status: "active" | "inactive";
}

export interface AssessmentTemplateVersion extends AuditFields, ClubScoped {
  id: EntityId;
  templateId: EntityId;
  graphVersionId?: EntityId;
  version: string;
  status: AssessmentTemplateVersionStatus;
}

export interface AssessmentMetricBinding extends AuditFields, ClubScoped {
  id: EntityId;
  templateVersionId: EntityId;
  metricId: EntityId;
  role: AssessmentBindingRole;
  formulaId?: EntityId;
  testItemId?: EntityId;
  maxScore?: number;
  weight?: number;
  sortOrder: number;
}

export interface AssessmentTestItem extends AuditFields, ClubScoped {
  id: EntityId;
  metricId: EntityId;
  name: string;
  valueKind: MetricValue["kind"];
  unit?: string;
  protocol?: string;
}

export interface PlayerAssessment extends AuditFields, ClubScoped {
  id: EntityId;
  studentId: EntityId;
  templateId: EntityId;
  templateVersionId?: EntityId;
  assessedByCoachId: EntityId;
  assessedAt: string;
  eventId?: EntityId;
  summary?: string;
}

export interface AssessmentRawResult extends AuditFields, ClubScoped {
  id: EntityId;
  assessmentId: EntityId;
  testItemId: EntityId;
  metricId: EntityId;
  value: MetricValue;
  recordedByCoachId?: EntityId;
  note?: string;
}

export interface AssessmentScore extends AuditFields, ClubScoped {
  id: EntityId;
  assessmentId: EntityId;
  metricId: EntityId;
  value: MetricValue;
  normalizedScore?: number;
  rawResultId?: EntityId;
  comment?: string;
}

export interface PlayerDevelopmentGoal extends AuditFields, ClubScoped {
  id: EntityId;
  studentId: EntityId;
  metricId?: EntityId;
  title: string;
  targetDescription: string;
  startsAt: string;
  endsAt?: string;
  status: "active" | "completed" | "cancelled";
}

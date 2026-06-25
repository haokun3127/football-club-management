import type { AuditFields, EntityId, JsonValue } from "./primitives.js";

export type ClubStatus = "active" | "inactive";
export type ClubUserRole = "owner" | "admin" | "operator" | "coach" | "parent" | "finance";
export type ClubMembershipStatus = "active" | "invited" | "inactive";

export type ClubFeature =
  | "training"
  | "matches"
  | "private_lessons"
  | "assessments"
  | "derived_metrics"
  | "payments"
  | "crm"
  | "media_distribution"
  | "venue_management";

export type ClubPolicyKey =
  | "attendance_statuses"
  | "assessment_scale"
  | "match_event_types"
  | "private_lesson_rules"
  | "parent_visibility"
  | "data_retention";

export type CustomFieldTarget =
  | "student"
  | "parent"
  | "coach"
  | "team"
  | "calendar_event"
  | "training_session"
  | "match"
  | "metric_record";

export type CustomFieldValueKind = "text" | "number" | "boolean" | "date" | "single_select" | "multi_select";

export interface ClubScoped {
  clubId: EntityId;
}

export type CatalogScope =
  | {
      scope: "system";
    }
  | {
      scope: "club";
      clubId: EntityId;
      baseItemId?: EntityId;
    };

export interface CatalogScoped {
  catalogScope: CatalogScope;
}

export interface Club extends AuditFields {
  id: EntityId;
  name: string;
  code: string;
  timezone: string;
  locale: string;
  status: ClubStatus;
}

export interface ClubUserMembership extends AuditFields, ClubScoped {
  id: EntityId;
  userId: EntityId;
  roles: ClubUserRole[];
  status: ClubMembershipStatus;
}

export interface ClubFeatureFlag extends AuditFields, ClubScoped {
  id: EntityId;
  feature: ClubFeature;
  enabled: boolean;
}

export interface ClubPolicy extends AuditFields, ClubScoped {
  id: EntityId;
  key: ClubPolicyKey;
  value: JsonValue;
  version: string;
  active: boolean;
}

export interface CustomFieldDefinition extends AuditFields, ClubScoped {
  id: EntityId;
  target: CustomFieldTarget;
  key: string;
  label: string;
  valueKind: CustomFieldValueKind;
  required: boolean;
  options?: string[];
  active: boolean;
}

export function isCatalogVisibleToClub(item: CatalogScoped, clubId: EntityId): boolean {
  return item.catalogScope.scope === "system" || item.catalogScope.clubId === clubId;
}

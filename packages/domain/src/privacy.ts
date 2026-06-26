import type { AuditFields, EntityId, JsonValue } from "./primitives.js";
import type { ClubScoped } from "./clubs.js";

export type PrivacySubjectType = "student" | "parent" | "coach" | "user" | "external_record";
export type PrivacyDataClass = "public" | "internal" | "personal" | "sensitive" | "minor_sensitive";
export type PrivacyRole = "admin" | "coach" | "parent";
export type PrivacyAction =
  | "read"
  | "export"
  | "raw_preview"
  | "confirm_import"
  | "consent_change"
  | "request_create"
  | "request_resolve"
  | "redaction_override";
export type PrivacyConsentScope =
  | "core_training_service"
  | "schedule_attendance"
  | "assessment_metrics"
  | "match_stats"
  | "insurance_lesson_status"
  | "media_capture"
  | "media_public_share"
  | "ai_performance_analysis"
  | "ai_video_editing"
  | "marketing_contact";
export type PrivacyConsentStatus = "granted" | "withdrawn" | "expired";
export type PrivacyRequestType = "correction" | "deletion" | "withdraw_consent" | "restrict_processing" | "export_copy";
export type PrivacyRequestStatus = "open" | "in_review" | "resolved" | "rejected";
export type PrivacyRetentionAction = "retain" | "anonymize" | "delete_after_review";

export interface PrivacyFieldPolicy extends AuditFields, ClubScoped {
  id: EntityId;
  fieldKey: string;
  label: string;
  subjectType: PrivacySubjectType;
  dataClass: PrivacyDataClass;
  visibleToRoles: PrivacyRole[];
  exportable: boolean;
  retentionCategory: string;
  redactionMode: "none" | "mask" | "hide" | "summary_only";
  active: boolean;
}

export interface PrivacyNoticeVersion extends AuditFields, ClubScoped {
  id: EntityId;
  version: string;
  title: string;
  contentRef?: string;
  effectiveAt: string;
  active: boolean;
}

export interface StudentConsentRecord extends AuditFields, ClubScoped {
  id: EntityId;
  studentId: EntityId;
  scope: PrivacyConsentScope;
  status: PrivacyConsentStatus;
  noticeVersionId?: EntityId;
  guardianUserId?: EntityId;
  relationship?: string;
  source: "admin_recorded" | "parent_self_service" | "external_import";
  evidenceRef?: string;
  grantedAt?: string;
  withdrawnAt?: string;
}

export interface ConsentEvent extends AuditFields, ClubScoped {
  id: EntityId;
  studentId: EntityId;
  scope: PrivacyConsentScope;
  action: "grant" | "withdraw";
  actorUserId?: EntityId;
  recordId?: EntityId;
  occurredAt: string;
  reason?: string;
}

export interface PrivacyAuditLog extends AuditFields, ClubScoped {
  id: EntityId;
  actorUserId?: EntityId;
  actorRole?: PrivacyRole | "owner" | "operator" | "finance" | "system";
  action: PrivacyAction;
  targetType: string;
  targetId?: EntityId;
  fieldKeys: string[];
  dataClasses: PrivacyDataClass[];
  purpose: string;
  requestId?: string;
}

export interface PrivacyRequest extends AuditFields, ClubScoped {
  id: EntityId;
  studentId: EntityId;
  requestType: PrivacyRequestType;
  status: PrivacyRequestStatus;
  requestedByUserId?: EntityId;
  resolvedByUserId?: EntityId;
  description?: string;
  resolutionNote?: string;
  requestedAt: string;
  resolvedAt?: string;
}

export interface PrivacyRetentionPolicy extends AuditFields, ClubScoped {
  id: EntityId;
  category: string;
  dataClass: PrivacyDataClass;
  retentionDays?: number;
  action: PrivacyRetentionAction;
  active: boolean;
}

export interface PrivacyCapability {
  noticeVersion?: Pick<PrivacyNoticeVersion, "id" | "version" | "title" | "effectiveAt">;
  consentScopes: Array<{
    scope: PrivacyConsentScope;
    required: boolean;
    enabledByDefault: boolean;
  }>;
  fieldVisibility: Array<{
    fieldKey: string;
    dataClass: PrivacyDataClass;
    visibleToRoles: PrivacyRole[];
    exportable: boolean;
    redactionMode: PrivacyFieldPolicy["redactionMode"];
  }>;
  features: {
    mediaCapture: boolean;
    mediaPublicShare: boolean;
    aiPerformanceAnalysis: boolean;
    aiVideoEditing: boolean;
  };
  parentRequestTypes: PrivacyRequestType[];
}

export function canRoleReadPrivacyField(policy: PrivacyFieldPolicy, role: PrivacyRole): boolean {
  return policy.active && policy.visibleToRoles.includes(role);
}

export function redactPrivacyValue(value: unknown, policy: PrivacyFieldPolicy, role: PrivacyRole): unknown {
  if (canRoleReadPrivacyField(policy, role) || policy.redactionMode === "none") {
    return value;
  }

  if (policy.redactionMode === "hide") {
    return undefined;
  }

  if (policy.redactionMode === "summary_only") {
    return value === undefined || value === null ? value : "[summary_only]";
  }

  return maskPrivacyValue(value);
}

export function hasGrantedConsent(records: StudentConsentRecord[], scope: PrivacyConsentScope): boolean {
  return records.some((record) => record.scope === scope && record.status === "granted");
}

function maskPrivacyValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value === undefined || value === null ? value : "[redacted]";
  }

  if (value.length <= 2) {
    return "*".repeat(value.length);
  }

  if (/^\d{7,}$/.test(value)) {
    return `${value.slice(0, 3)}****${value.slice(-2)}`;
  }

  return `${value.slice(0, 1)}${"*".repeat(Math.max(1, value.length - 2))}${value.slice(-1)}`;
}

export function privacyJson(value: JsonValue): JsonValue {
  return value;
}

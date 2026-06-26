import type {
  AssessmentMetricBinding,
  AssessmentTemplateVersion,
  ClubFeatureFlag,
  ClubPolicy,
  CustomFieldDefinition,
  EntityId,
  MetricDependency,
  MetricGraphVersion,
  MetricView,
  MetricViewNode,
} from "@football-club/domain";

export interface ExternalSystemConnection {
  id: EntityId;
  clubId: EntityId;
  provider: string;
  name: string;
  status: "draft" | "active" | "paused" | "disabled";
  config: Record<string, unknown>;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalTableMapping {
  id: EntityId;
  clubId: EntityId;
  connectionId: EntityId;
  externalTableKey: string;
  targetType: string;
  mappingVersion: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface ExternalSyncPolicy {
  id: EntityId;
  clubId: EntityId;
  connectionId: EntityId;
  tableMappingId?: EntityId;
  name: string;
  status: "draft" | "active" | "paused" | "disabled";
  triggerMode: "manual" | "scheduled";
  schedule?: Record<string, unknown>;
  direction: "inbound" | "outbound" | "bidirectional";
  applyPolicy: "manual_confirm" | "auto_apply_valid";
  conflictPolicy: "manual_review" | "external_wins" | "system_wins";
  writebackPolicy: "disabled" | "status_only";
  createdAt: string;
  updatedAt: string;
}

export interface ExternalFieldMapping {
  id: EntityId;
  clubId: EntityId;
  tableMappingId: EntityId;
  externalFieldKey: string;
  targetFieldKey: string;
  targetFieldKind: string;
  required: boolean;
  transform?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalSyncRun {
  id: EntityId;
  clubId: EntityId;
  connectionId: EntityId;
  tableMappingId?: EntityId;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: string;
  finishedAt?: string;
  totalRecords: number;
  importedRecords: number;
  failedRecords: number;
  error?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalRawRecord {
  id: EntityId;
  clubId: EntityId;
  connectionId: EntityId;
  tableMappingId?: EntityId;
  syncRunId?: EntityId;
  externalRecordId: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  reviewStatus: "pending" | "confirmed" | "rejected" | "linked";
  validationErrors?: unknown[];
  normalizedPreview?: Record<string, unknown>;
  importedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalRecordLink {
  id: EntityId;
  clubId: EntityId;
  rawRecordId: EntityId;
  targetType: string;
  targetId: EntityId;
  linkStatus: "confirmed" | "rejected" | "superseded";
  confirmedBy?: EntityId;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataCapabilityConfig {
  featureFlags: ClubFeatureFlag[];
  policies: ClubPolicy[];
  customFields: CustomFieldDefinition[];
  metricGraphVersions: MetricGraphVersion[];
  metricDependencies: MetricDependency[];
  metricViews: MetricView[];
  metricViewNodes: MetricViewNode[];
  assessmentTemplateVersions: AssessmentTemplateVersion[];
  assessmentMetricBindings: AssessmentMetricBinding[];
  externalConnections: ExternalSystemConnection[];
  syncPolicies: ExternalSyncPolicy[];
  tableMappings: ExternalTableMapping[];
  fieldMappings: ExternalFieldMapping[];
}

export interface ClubCapabilities {
  club: {
    id: EntityId;
    code: string;
    name: string;
    timezone: string;
    locale: string;
  };
  features: Record<string, boolean>;
  roles: {
    parent: string[];
    coach: string[];
    admin: string[];
  };
  calendar: {
    eventTypes: string[];
    participantStatuses: string[];
  };
  operations: {
    standardFields: Array<{ key: string; label: string; source: "core" | "operational" | "custom" }>;
    customFields: CustomFieldDefinition[];
    offlineStatuses: Array<{ key: string; label: string }>;
  };
  assessment: {
    graphVersions: MetricGraphVersion[];
    views: MetricView[];
    viewNodes: MetricViewNode[];
    templateVersions: AssessmentTemplateVersion[];
    metricBindings: AssessmentMetricBinding[];
  };
  integration: {
    connections: ExternalSystemConnection[];
    syncPolicies: ExternalSyncPolicy[];
    tableMappings: ExternalTableMapping[];
    fieldMappings: ExternalFieldMapping[];
    latestSyncRuns: ExternalSyncRun[];
  };
}

export interface ImportPreviewFilters {
  connectionId?: EntityId;
  tableMappingId?: EntityId;
  reviewStatus?: ExternalRawRecord["reviewStatus"];
}

export interface ConfirmExternalRecordInput {
  targetType: string;
  targetId: EntityId;
  confirmedBy?: EntityId;
}

export interface ImportPreview {
  records: ExternalRawRecord[];
}

export interface StudentListFilters {
  teamId?: EntityId;
  coachId?: EntityId;
  studentStatus?: string;
  school?: string;
  insuranceExpiringSoon?: boolean;
  lessonBalanceLow?: boolean;
}

export interface StudentListItem {
  id: EntityId;
  clubId: EntityId;
  name: string;
  birthDate: string;
  gender?: string;
  currentLevel?: string;
  operationalProfile?: Record<string, unknown>;
  teams: Array<Record<string, unknown>>;
  primaryContact?: Record<string, unknown>;
  lessonBalance?: number;
  insuranceStatus: Record<string, unknown>;
  attendanceSnapshot: Record<string, unknown>;
}

export interface StudentDetail extends StudentListItem {
  contacts: Array<Record<string, unknown>>;
  lessonLedger: LessonLedgerEntry[];
  insurancePolicies: InsurancePolicy[];
}

export type LessonLedgerEntryType = "credit" | "debit" | "adjustment" | "external_snapshot";
export type LessonLedgerSource = "offline_recharge" | "attendance" | "manual_adjustment" | "external_import";

export interface LessonLedgerEntry {
  id: EntityId;
  clubId: EntityId;
  studentId: EntityId;
  teamId?: EntityId;
  eventId?: EntityId;
  paymentEventId?: EntityId;
  occurredAt: string;
  entryType: LessonLedgerEntryType;
  lessonDelta: number;
  balanceAfter?: number;
  source: LessonLedgerSource | string;
  sourceId?: EntityId;
  actorUserId?: EntityId;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonLedgerSummary {
  studentId: EntityId;
  clubId: EntityId;
  balance: number;
  entries: LessonLedgerEntry[];
}

export interface LessonAdjustmentInput {
  entryType: Exclude<LessonLedgerEntryType, "external_snapshot">;
  lessonDelta: number;
  source: Exclude<LessonLedgerSource, "external_import">;
  sourceId?: EntityId;
  eventId?: EntityId;
  teamId?: EntityId;
  occurredAt?: string;
  actorUserId?: EntityId;
  amount?: number;
  paymentType?: string;
  note?: string;
}

export type InsuranceCurrentStatus = "active" | "expired" | "pending" | "unknown";
export type InsuranceReviewStatus = "pending" | "approved" | "rejected";

export interface InsurancePolicy {
  id: EntityId;
  clubId: EntityId;
  studentId: EntityId;
  purchasedAt?: string;
  expiresAt: string;
  policyNumber?: string;
  provider?: string;
  sport?: string;
  approved?: boolean;
  reviewStatus: InsuranceReviewStatus;
  currentStatus: InsuranceCurrentStatus;
  source: string;
  sourceId?: EntityId;
  actorUserId?: EntityId;
  externalRef?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsurancePolicyInput {
  purchasedAt?: string;
  expiresAt: string;
  policyNumber?: string;
  provider?: string;
  sport?: string;
  reviewStatus: InsuranceReviewStatus;
  source?: "offline_insurance" | "external_import" | "manual_review";
  sourceId?: EntityId;
  actorUserId?: EntityId;
  note?: string;
}

export interface InsurancePolicySummary {
  studentId: EntityId;
  clubId: EntityId;
  current: {
    status: InsuranceCurrentStatus;
    expiresAt?: string;
    policyNumber?: string;
    reviewStatus?: InsuranceReviewStatus;
  };
  policies: InsurancePolicy[];
}

export interface StudentOperationalStatusSummary {
  studentId: EntityId;
  clubId: EntityId;
  lessonBalance?: number;
  insurance: InsurancePolicySummary["current"];
}

export interface SyncRunDetail {
  syncRun: ExternalSyncRun;
  rawRecords: ExternalRawRecord[];
  validationSummary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    pendingRecords: number;
    confirmedRecords: number;
    rejectedRecords: number;
  };
}

export type CreateExternalSyncPolicyInput = Omit<ExternalSyncPolicy, "id" | "clubId" | "createdAt" | "updatedAt">;

export type UpdateExternalSyncPolicyInput = Partial<Omit<ExternalSyncPolicy, "id" | "clubId" | "createdAt" | "updatedAt">>;

export interface RunExternalSyncPolicyResult {
  policy: ExternalSyncPolicy;
  syncRun: ExternalSyncRun;
  records: ExternalRawRecord[];
}

export interface StageExternalImportRecord {
  rowNumber: number;
  rowHash: string;
  raw: Record<string, unknown>;
}

export interface StageExternalImportInput {
  connectionId: EntityId;
  tableMappingId: EntityId;
  sourceName?: string;
  records: StageExternalImportRecord[];
}

export interface StageExternalImportResult {
  syncRun: ExternalSyncRun;
  records: ExternalRawRecord[];
}

export interface ExcelImportPreviewInput {
  connectionId: EntityId;
  tableMappingId: EntityId;
  contentBase64: string;
  worksheetName?: string;
  headerRow?: number;
  fileName?: string;
}

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
  PrivacyAuditLog,
  PrivacyCapability,
  PrivacyFieldPolicy,
  PrivacyNoticeVersion,
  PrivacyRequest,
  PrivacyRequestStatus,
  PrivacyRequestType,
  PrivacyRetentionPolicy,
  StudentConsentRecord,
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

export type ClubAppClientChannel =
  | "wechat_miniprogram"
  | "wechat_official_account"
  | "douyin"
  | "video_account"
  | "xiaohongshu"
  | "admin_portal";

export interface ClubAppClient {
  id: EntityId;
  clubId: EntityId;
  channel: ClubAppClientChannel;
  name: string;
  status: "draft" | "active" | "paused" | "disabled";
  appId?: string;
  clientKey: string;
  theme?: Record<string, unknown>;
  navigation?: Array<Record<string, unknown>>;
  roleEntrypoints?: Record<string, string[]>;
  featureOverrides?: Record<string, boolean>;
  visibility?: Record<string, unknown>;
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
  config?: Record<string, unknown>;
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

export type ExternalSyncSchedule =
  | { kind: "interval_minutes"; intervalMinutes: number }
  | { kind: "daily_time"; time: string; timezone?: string };

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
  appClients: ClubAppClient[];
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
  privacyFieldPolicies: PrivacyFieldPolicy[];
  privacyNoticeVersions: PrivacyNoticeVersion[];
  privacyRetentionPolicies: PrivacyRetentionPolicy[];
}

export interface ClubCapabilities {
  club: {
    id: EntityId;
    code: string;
    name: string;
    timezone: string;
    locale: string;
  };
  client?: {
    id: EntityId;
    channel: ClubAppClientChannel;
    name: string;
    appId?: string;
    clientKey: string;
    theme?: Record<string, unknown>;
    navigation: Array<Record<string, unknown>>;
    roleEntrypoints: Record<string, string[]>;
    visibility?: Record<string, unknown>;
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
  match: {
    eventTypes: string[];
  };
  operations: {
    standardFields: Array<{ key: string; label: string; source: "core" | "operational" | "custom" }>;
    customFields: CustomFieldDefinition[];
    offlineStatuses: Array<{ key: string; label: string }>;
    statusDisplay: {
      lesson: { showBalance: boolean; showUpdatedAt: boolean; showSource: boolean };
      insurance: { showPolicyNumber: boolean; showUpdatedAt: boolean; showSource: boolean };
    };
  };
  visibility: {
    parent: {
      metricScope: string;
      showLessonBalance: boolean;
      showInsurancePolicyNumber: boolean;
      showStatusUpdatedAt: boolean;
      showStatusSource: boolean;
    };
  };
  defaultTemplates: {
    features: Record<string, boolean>;
    appClientVisibility: Record<string, unknown>;
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
  privacy: PrivacyCapability;
}

export interface PrivacyConsentUpsertInput {
  studentId: EntityId;
  scope: StudentConsentRecord["scope"];
  status: StudentConsentRecord["status"];
  noticeVersionId?: EntityId;
  guardianUserId?: EntityId;
  relationship?: string;
  source?: StudentConsentRecord["source"];
  evidenceRef?: string;
  reason?: string;
}

export interface PrivacyRequestCreateInput {
  studentId: EntityId;
  requestType: PrivacyRequestType;
  description?: string;
}

export interface PrivacyRequestResolveInput {
  status: Exclude<PrivacyRequestStatus, "open">;
  resolutionNote?: string;
  resolvedByUserId?: EntityId;
}

export interface PrivacyRetentionDryRunResult {
  policies: PrivacyRetentionPolicy[];
  candidates: Array<{
    policyId: EntityId;
    category: string;
    action: PrivacyRetentionPolicy["action"];
    targetType: string;
    estimatedCount: number;
  }>;
}

export interface PrivacyExportPreviewInput {
  targetType: "student";
  targetId: EntityId;
  purpose: string;
  fieldKeys: string[];
}

export interface PrivacyExportPreviewResult {
  targetType: "student";
  targetId: EntityId;
  purpose: string;
  allowedFieldKeys: string[];
  deniedFieldKeys: string[];
  redactedFieldKeys: string[];
  data: Record<string, unknown>;
}

export interface PrivacyOverview {
  fieldPolicies: PrivacyFieldPolicy[];
  noticeVersions: PrivacyNoticeVersion[];
  retentionPolicies: PrivacyRetentionPolicy[];
}

export interface StudentPrivacyState {
  studentId: EntityId;
  clubId: EntityId;
  noticeVersion?: PrivacyNoticeVersion;
  consents: StudentConsentRecord[];
  requests: PrivacyRequest[];
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
  lesson?: {
    balance?: number;
    updatedAt?: string;
    source?: string;
    status: "unknown" | "synced" | "confirmed" | "pending";
  };
  insurance: InsurancePolicySummary["current"] & {
    updatedAt?: string;
    source?: string;
    sourceId?: EntityId;
  };
  sync?: {
    latestRun?: {
      id: EntityId;
      status: ExternalSyncRun["status"];
      updatedAt: string;
    };
  };
}

export interface HttpIdempotencyRecord {
  key: string;
  fingerprint: string;
  statusCode: number;
  payload: string;
  contentType?: string;
  createdAt: string;
  expiresAt: string;
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

export interface DueExternalSyncPolicy {
  policy: ExternalSyncPolicy;
  lastRunAt?: string;
  nextRunAt?: string;
  due: boolean;
  runnable: boolean;
  notRunnableReason?: string;
}

export interface DueExternalSyncPoliciesResult {
  clubId: EntityId;
  now: string;
  policies: DueExternalSyncPolicy[];
}

export interface RunDueExternalSyncPoliciesResult {
  clubId: EntityId;
  now: string;
  results: Array<{
    policyId: EntityId;
    due: boolean;
    runnable: boolean;
    status: "skipped" | "completed" | "failed";
    syncRunId?: EntityId;
    importedRecords?: number;
    failedRecords?: number;
    error?: string;
  }>;
}

export interface WpsWebhookIngestionInput {
  eventId?: string;
  eventType: string;
  connectionId: EntityId;
  tableMappingId: EntityId;
  policyId?: EntityId;
  occurredAt?: string;
  payload?: Record<string, unknown>;
  security?: {
    timestamp?: string;
    nonce?: string;
    signature?: string;
  };
}

export interface WpsWebhookIngestionResult {
  status: "queued";
  matchedPolicy: ExternalSyncPolicy;
  syncRun: ExternalSyncRun;
}

export interface StageExternalImportRecord {
  rowNumber: number;
  rowHash: string;
  externalRecordId?: string;
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

export type PrivateLessonRequestStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface PrivateLessonRequest {
  id: EntityId;
  clubId: EntityId;
  studentId: EntityId;
  coachName: string;
  date: string;
  timeSlot: string;
  goals: string[];
  note?: string;
  status: PrivateLessonRequestStatus;
  requestedByUserId?: EntityId;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateLessonRequestInput {
  coachName: string;
  date: string;
  timeSlot: string;
  goals: string[];
  note?: string;
  requestedByUserId?: EntityId;
}

export type EventChangeReason = "venue" | "time" | "weather" | "other";
export type EventChangeRequestStatus = "pending" | "approved" | "rejected";

export interface EventChangeRequest {
  id: EntityId;
  clubId: EntityId;
  eventId: EntityId;
  reason: EventChangeReason;
  newStartsAt?: string;
  newVenue?: string;
  note?: string;
  status: EventChangeRequestStatus;
  requestedByUserId?: EntityId;
  notifyParents?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentTask {
  id: string;
  clubId: string;
  title: string;
  templateId: string;
  startsOn: string;
  dueOn: string;
}

export interface ContentArticle {
  id: string;
  clubId: string;
  title: string;
  subtitle: string;
  accent: string;
  category: "venue" | "help" | "coach" | "guide";
  body?: string;
}

export interface ContentFaq {
  id: string;
  clubId: string;
  q: string;
  a: string;
  category: string;
}

export interface VenueInfo {
  id: string;
  clubId: string;
  name: string;
  type: string;
  address: string;
  tags: string[];
  facilities: string[];
  latitude: number;
  longitude: number;
}

export interface EventChangeRequestInput {
  reason: EventChangeReason;
  newStartsAt?: string;
  newVenue?: string;
  note?: string;
  requestedByUserId?: EntityId;
  notifyParents?: boolean;
}

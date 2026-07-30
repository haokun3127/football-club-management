import { randomUUID } from "node:crypto";
import {
  createAssessmentService,
  createMatchService,
  createMetricService,
  isCatalogVisibleToClub,
  type AssessmentMetricBinding,
  type AssessmentRawResult,
  type AssessmentScore,
  type AssessmentTemplate,
  type AssessmentTemplateVersion,
  type AssessmentTestItem,
  type AbilityMetric,
  type CalendarEvent,
  type Club,
  type ClubFeatureFlag,
  type ClubPolicy,
  type CoachProfile,
  type CustomFieldDefinition,
  type DevelopmentDimension,
  type DerivedMetricDefinition,
  type DerivedMetricResult,
  type EntityId,
  type EventParticipant,
  type Match,
  type MatchEvent,
  type MatchPlayerNote,
  type MatchRoster,
  type MetricLineage,
  type MetricGraphVersion,
  type MetricDependency,
  type MetricView,
  type MetricViewNode,
  type MetricSourceKind,
  type MetricValue,
  type OtherActivity,
  type PlayerAssessment,
  type PlayerMetricRecord,
  type PrivacyAuditLog,
  type PrivacyFieldPolicy,
  type PrivacyNoticeVersion,
  type PrivacyRequest,
  type PrivacyRetentionPolicy,
  type PrivacyRole,
  type StudentConsentRecord,
  type RecordAssessmentInput,
  type RecordMatchInput,
  type SessionDelivery,
  type SessionObservation,
  type SessionPlan,
  type StudentProfile,
  type Team,
  type TeamMember,
  type TrainingDrill,
  type TrainingObjective,
  type TrainingSession,
  type TacticalBoard,
} from "@football-club/domain";
import type {
  ClubCapabilities,
  ClubAppClient,
  ConfirmExternalRecordInput,
  DataCapabilityConfig,
  CreateExternalSyncPolicyInput,
  DueExternalSyncPoliciesResult,
  ExternalFieldMapping,
  ExternalRawRecord,
  ExternalRecordLink,
  ExternalSyncSchedule,
  ExternalSyncRun,
  ExternalSyncPolicy,
  ExternalSystemConnection,
  ExternalTableMapping,
  HttpIdempotencyRecord,
  ImportPreview,
  ImportPreviewFilters,
  InsurancePolicy,
  InsurancePolicyInput,
  PrivateLessonRequest,
  PrivateLessonRequestInput,
  EventChangeRequest,
  EventChangeRequestInput,
  AssessmentTask,
  InsurancePolicySummary,
  LessonAdjustmentInput,
  LessonLedgerEntry,
  LessonLedgerSummary,
  PrivacyConsentUpsertInput,
  PrivacyExportPreviewInput,
  PrivacyExportPreviewResult,
  PrivacyOverview,
  PrivacyRequestCreateInput,
  PrivacyRequestResolveInput,
  PrivacyRetentionDryRunResult,
  RunExternalSyncPolicyResult,
  RunDueExternalSyncPoliciesResult,
  StageExternalImportInput,
  StageExternalImportResult,
  StudentDetail,
  StudentListFilters,
  StudentListItem,
  StudentOperationalStatusSummary,
  SyncRunDetail,
  UpdateExternalSyncPolicyInput,
  WpsWebhookIngestionInput,
  WpsWebhookIngestionResult,
} from "./data-capability/types.js";
import { createApiServices } from "./application/services.js";
import { createEnvWpsCredentialResolver, createWpsConnector, parseWpsConnectionConfig, sanitizeExternalConnection } from "./integration/wps-connector.js";
import {
  InMemoryWpsWebhookReplayGuard,
  createEnvWpsSecretResolver,
  parseWpsWebhookSecurityConfig,
  verifyWpsWebhookSecurity,
} from "./integration/wps-webhook-security.js";
import type { PlatformRepositories } from "./persistence/platform-persistence.js";
import { createSeedData, type SeedData } from "./seed.js";

export interface ApiStore {
  getHealth(): { status: "ok"; service: "@football-club/api" };
  getTacticalBoard(clubId: EntityId, eventId: EntityId): TacticalBoard | null | Promise<TacticalBoard | null>;
  saveTacticalBoard(board: TacticalBoard): TacticalBoard | Promise<TacticalBoard>;
  getHttpIdempotencyRecord(key: string): HttpIdempotencyRecord | null | Promise<HttpIdempotencyRecord | null>;
  saveHttpIdempotencyRecord(record: HttpIdempotencyRecord): void | Promise<void>;
  pruneHttpIdempotencyRecords(now: string): void | Promise<void>;
  listClubs(): Club[] | Promise<Club[]>;
  getClubById(clubId: EntityId): Club | null;
  getClubConfig(clubId: EntityId): unknown | null | Promise<unknown | null>;
  getClubCapabilities(clubId: EntityId, client?: { clientId?: EntityId; appId?: string; clientKey?: string }): ClubCapabilities | null | Promise<ClubCapabilities | null>;
  resolveAppClientCapabilities(input: { appId?: string; clientKey?: string }): { clubId: EntityId; clientId: EntityId; capabilities: ClubCapabilities } | null | Promise<{ clubId: EntityId; clientId: EntityId; capabilities: ClubCapabilities } | null>;
  getDataCapabilityConfig(clubId: EntityId): DataCapabilityConfig | Promise<DataCapabilityConfig>;
  getPrivacyOverview(clubId: EntityId): PrivacyOverview | Promise<PrivacyOverview>;
  getStudentPrivacyState(clubId: EntityId, studentId: EntityId): { studentId: EntityId; clubId: EntityId; noticeVersion?: PrivacyNoticeVersion; consents: StudentConsentRecord[]; requests: PrivacyRequest[] } | Promise<{ studentId: EntityId; clubId: EntityId; noticeVersion?: PrivacyNoticeVersion; consents: StudentConsentRecord[]; requests: PrivacyRequest[] }>;
  upsertStudentConsent(clubId: EntityId, input: PrivacyConsentUpsertInput, actorUserId?: EntityId): StudentConsentRecord | Promise<StudentConsentRecord>;
  createPrivacyRequest(clubId: EntityId, input: PrivacyRequestCreateInput, requestedByUserId?: EntityId): PrivacyRequest | Promise<PrivacyRequest>;
  resolvePrivacyRequest(clubId: EntityId, requestId: EntityId, input: PrivacyRequestResolveInput): PrivacyRequest | null | Promise<PrivacyRequest | null>;
  listPrivacyRequests(clubId: EntityId, studentId?: EntityId): PrivacyRequest[] | Promise<PrivacyRequest[]>;
  listPrivacyAuditLogs(clubId: EntityId): PrivacyAuditLog[] | Promise<PrivacyAuditLog[]>;
  recordPrivacyAudit(log: Omit<PrivacyAuditLog, "id" | "createdAt" | "updatedAt">): PrivacyAuditLog | Promise<PrivacyAuditLog>;
  previewPrivacyExport(clubId: EntityId, input: PrivacyExportPreviewInput, role: PrivacyRole): PrivacyExportPreviewResult | null | Promise<PrivacyExportPreviewResult | null>;
  dryRunPrivacyRetention(clubId: EntityId): PrivacyRetentionDryRunResult | Promise<PrivacyRetentionDryRunResult>;
  listClubAppClients(clubId: EntityId): ClubAppClient[] | Promise<ClubAppClient[]>;
  listExternalConnections(clubId: EntityId): ExternalSystemConnection[] | Promise<ExternalSystemConnection[]>;
  listExternalSyncPolicies(clubId: EntityId): ExternalSyncPolicy[] | Promise<ExternalSyncPolicy[]>;
  createExternalSyncPolicy(clubId: EntityId, input: CreateExternalSyncPolicyInput): ExternalSyncPolicy | Promise<ExternalSyncPolicy>;
  updateExternalSyncPolicy(clubId: EntityId, policyId: EntityId, input: UpdateExternalSyncPolicyInput): ExternalSyncPolicy | null | Promise<ExternalSyncPolicy | null>;
  runExternalSyncPolicy(clubId: EntityId, policyId: EntityId): RunExternalSyncPolicyResult | null | Promise<RunExternalSyncPolicyResult | null>;
  planDueExternalSyncPolicies(clubId: EntityId, now: string): DueExternalSyncPoliciesResult | Promise<DueExternalSyncPoliciesResult>;
  runDueExternalSyncPolicies(clubId: EntityId, now: string): RunDueExternalSyncPoliciesResult | Promise<RunDueExternalSyncPoliciesResult>;
  ingestWpsWebhook(clubId: EntityId, input: WpsWebhookIngestionInput): WpsWebhookIngestionResult | Promise<WpsWebhookIngestionResult>;
  getImportPreview(clubId: EntityId, filters?: ImportPreviewFilters): ImportPreview | Promise<ImportPreview>;
  stageExternalImport(clubId: EntityId, input: StageExternalImportInput): StageExternalImportResult | Promise<StageExternalImportResult>;
  listExternalSyncRuns(clubId: EntityId): ExternalSyncRun[] | Promise<ExternalSyncRun[]>;
  getExternalSyncRunDetail(clubId: EntityId, syncRunId: EntityId): SyncRunDetail | null | Promise<SyncRunDetail | null>;
  listOperationalStudents(clubId: EntityId, filters?: StudentListFilters): StudentListItem[] | Promise<StudentListItem[]>;
  listCoaches(clubId: EntityId): CoachProfile[];
  getOperationalStudentDetail(clubId: EntityId, studentId: EntityId): StudentDetail | null | Promise<StudentDetail | null>;
  getStudentOperationalStatusSummary(clubId: EntityId, studentId: EntityId): StudentOperationalStatusSummary | null | Promise<StudentOperationalStatusSummary | null>;
  getLessonLedger(clubId: EntityId, studentId: EntityId): LessonLedgerSummary | null | Promise<LessonLedgerSummary | null>;
  recordLessonAdjustment(clubId: EntityId, studentId: EntityId, input: LessonAdjustmentInput): LessonLedgerSummary | Promise<LessonLedgerSummary>;
  listInsurancePolicies(clubId: EntityId, studentId: EntityId): InsurancePolicySummary | null | Promise<InsurancePolicySummary | null>;
  createInsurancePolicy(clubId: EntityId, studentId: EntityId, input: InsurancePolicyInput): InsurancePolicySummary | Promise<InsurancePolicySummary>;
  listPrivateLessonRequests(clubId: EntityId, studentId?: EntityId): PrivateLessonRequest[] | Promise<PrivateLessonRequest[]>;
  createPrivateLessonRequest(clubId: EntityId, studentId: EntityId, input: PrivateLessonRequestInput): PrivateLessonRequest | Promise<PrivateLessonRequest>;
  listEventChangeRequests(clubId: EntityId, eventId?: EntityId): EventChangeRequest[] | Promise<EventChangeRequest[]>;
  createEventChangeRequest(clubId: EntityId, eventId: EntityId, input: EventChangeRequestInput): EventChangeRequest | Promise<EventChangeRequest>;
  listAssessmentTasks(clubId: EntityId): AssessmentTask[] | Promise<AssessmentTask[]>;
  confirmExternalRecord(
    clubId: EntityId,
    rawRecordId: EntityId,
    input: ConfirmExternalRecordInput,
  ): ExternalRecordLink | null | Promise<ExternalRecordLink | null>;
  isGuardianOfStudent(clubId: EntityId, userId: EntityId, studentId: EntityId): boolean;
  listCalendarEvents(clubId: EntityId): unknown[];
  getStudentTimeline(clubId: EntityId, studentId: EntityId): unknown[];
  listAbilityMetrics(clubId: EntityId): AbilityMetric[];
  listMetricGraphVersions(clubId: EntityId): MetricGraphVersion[];
  listMetricDependencies(clubId: EntityId): MetricDependency[];
  listMetricViews(clubId: EntityId): MetricView[];
  listMetricViewNodes(clubId: EntityId): MetricViewNode[];
  listAssessmentTemplates(clubId: EntityId): AssessmentTemplate[] | Promise<AssessmentTemplate[]>;
  listAssessmentTestItems(clubId: EntityId): AssessmentTestItem[] | Promise<AssessmentTestItem[]>;
  listDevelopmentDimensions(clubId: EntityId): DevelopmentDimension[];
  listTrainingObjectives(clubId: EntityId): TrainingObjective[];
  listTrainingDrills(clubId: EntityId): TrainingDrill[];
  listSessionPlans(clubId: EntityId): SessionPlan[];
  getSessionPlan(sessionPlanId: EntityId): SessionPlan | null;
  saveSessionPlan(sessionPlan: SessionPlan): SessionPlan;
  getStudentMetrics(clubId: EntityId, studentId: EntityId, source?: MetricSourceKind | MetricSourceKind[]): PlayerMetricRecord[];
  computeAttackingContribution(clubId: EntityId, studentId: EntityId): Promise<DerivedMetricResult>;
  getCoachToday(clubId: EntityId, input: { date: string; userId: EntityId; roles: string[] }): unknown;
  createTeam(input: Parameters<ReturnType<typeof createApiServices>["createTeam"]>[0]): Team;
  joinTeam(input: Parameters<ReturnType<typeof createApiServices>["joinTeam"]>[0]): TeamMember;
  createCalendarEvent(clubId: EntityId, input: Parameters<ReturnType<typeof createApiServices>["createCalendarEvent"]>[1]): unknown;
  recordEventParticipants(
    clubId: EntityId,
    eventId: EntityId,
    participants: Parameters<ReturnType<typeof createApiServices>["recordEventParticipants"]>[2],
  ): EventParticipant[];
  checkScheduleConflicts(
    clubId: EntityId,
    input: Parameters<ReturnType<typeof createApiServices>["checkScheduleConflicts"]>[1],
  ): unknown[];
  createTrainingSession(
    clubId: EntityId,
    input: Parameters<ReturnType<typeof createApiServices>["createTrainingSession"]>[1],
  ): TrainingSession;
  getTrainingSessionByEvent(clubId: EntityId, eventId: EntityId): TrainingSession | null | Promise<TrainingSession | null>;
  ensureTrainingSessionForEvent(
    clubId: EntityId,
    eventId: EntityId,
    input?: Partial<Parameters<ReturnType<typeof createApiServices>["createTrainingSession"]>[1]>,
  ): TrainingSession | Promise<TrainingSession>;
  recordTrainingObservation(
    clubId: EntityId,
    trainingSessionId: EntityId,
    input: {
      studentId: EntityId;
      coachId: EntityId;
      metricId: EntityId;
      rating?: 1 | 2 | 3 | 4 | 5;
      value?: MetricValue;
      tags?: string[];
      note?: string;
    },
  ): { observation: SessionObservation; metricRecord: PlayerMetricRecord };
  recordMatchSummary(input: RecordMatchInput): Promise<{
    match: Match;
    rosters: MatchRoster[];
    events: MatchEvent[];
    notes: MatchPlayerNote[];
    metricRecords: PlayerMetricRecord[];
  }>;
  getMatchDetailByEvent(clubId: EntityId, eventId: EntityId): {
    match: Match;
    rosters: MatchRoster[];
    events: MatchEvent[];
    notes: MatchPlayerNote[];
    metricRecords: PlayerMetricRecord[];
  } | null | Promise<{
    match: Match;
    rosters: MatchRoster[];
    events: MatchEvent[];
    notes: MatchPlayerNote[];
    metricRecords: PlayerMetricRecord[];
  } | null>;
  recordAssessment(input: RecordAssessmentInput): Promise<{
    assessment: PlayerAssessment;
    rawResults: AssessmentRawResult[];
    scores: AssessmentScore[];
    metricRecords: PlayerMetricRecord[];
  }>;
}

function upsertById<TEntity extends { id: EntityId }>(items: TEntity[], entity: TEntity): TEntity {
  const index = items.findIndex((item) => item.id === entity.id);

  if (index >= 0) {
    items[index] = entity;
    return entity;
  }

  items.push(entity);
  return entity;
}

function safeIdPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "external";
}

function buildStagedRawRecordId(tableKey: string, rowHash: string): EntityId {
  return `external-raw-${safeIdPart(tableKey)}-${rowHash.slice(0, 16)}`;
}

function normalizeExternalRawRecord(
  raw: Record<string, unknown>,
  fieldMappings: ExternalFieldMapping[],
): Pick<ExternalRawRecord, "normalizedPreview" | "validationErrors"> {
  const normalizedPreview: Record<string, unknown> = {};
  const validationErrors: Array<Record<string, string>> = [];

  for (const field of fieldMappings) {
    const value = raw[field.externalFieldKey];
    const hasValue = value !== undefined && value !== null && value !== "";

    if (hasValue) {
      normalizedPreview[field.targetFieldKey] = value;
    } else if (field.required) {
      validationErrors.push({
        code: "required",
        field: field.externalFieldKey,
        targetField: field.targetFieldKey,
        message: `Missing required field: ${field.externalFieldKey}`,
      });
    }
  }

  return {
    normalizedPreview,
    validationErrors: validationErrors.length ? validationErrors : undefined,
  };
}

function buildClubCapabilities(
  club: Club,
  config: DataCapabilityConfig,
  latestSyncRuns: ExternalSyncRun[],
  client?: ClubAppClient,
): ClubCapabilities {
  const features = {
    ...Object.fromEntries(config.featureFlags.map((flag) => [flag.feature, flag.enabled])),
    ...(client?.featureOverrides ?? {}),
  };
  const matchEventTypes = stringArrayPolicy(config.policies, "match_event_types", [
    "goal",
    "assist",
    "save",
    "tackle",
    "yellow_card",
    "red_card",
    "penalty",
    "own_goal",
  ]);
  const parentVisibilityPolicy = objectPolicy(config.policies, "parent_visibility");
  const clientVisibility = client?.visibility ?? {};
  const parentVisibility = {
    metricScope: stringValue(clientVisibility.parentMetricScope) ?? stringValue(parentVisibilityPolicy.metricScope) ?? "published_summary",
    showLessonBalance: booleanValue(clientVisibility.showLessonBalance) ?? booleanValue(parentVisibilityPolicy.showLessonBalance) ?? true,
    showInsurancePolicyNumber: booleanValue(clientVisibility.showInsurancePolicyNumber) ?? booleanValue(parentVisibilityPolicy.showInsurancePolicyNumber) ?? false,
    showStatusUpdatedAt: booleanValue(clientVisibility.showStatusUpdatedAt) ?? booleanValue(parentVisibilityPolicy.showStatusUpdatedAt) ?? true,
    showStatusSource: booleanValue(clientVisibility.showStatusSource) ?? booleanValue(parentVisibilityPolicy.showStatusSource) ?? false,
  };

  return {
    club: {
      id: club.id,
      code: club.code,
      name: club.name,
      timezone: club.timezone,
      locale: club.locale,
    },
    client: client
      ? {
          id: client.id,
          channel: client.channel,
          name: client.name,
          appId: client.appId,
          clientKey: client.clientKey,
          theme: client.theme,
          navigation: (client.navigation ?? []).filter((item) => item.enabled !== false),
          roleEntrypoints: client.roleEntrypoints ?? {},
          visibility: client.visibility,
        }
      : undefined,
    features,
    roles: {
      parent: [
        "calendar.read_child",
        "training.read_summary",
        "match.read_summary",
        "assessment.read_trend",
        "operations.read_offline_status",
      ],
      coach: [
        "calendar.read",
        "attendance.write",
        "training_observation.write",
        "match_event.write",
        "assessment.write",
      ],
      admin: [
        "roster.manage",
        "schedule.manage",
        "integration.import_preview",
        "integration.confirm",
        "assessment_graph.manage",
      ],
    },
    calendar: {
      eventTypes: ["training", "match", "other"],
      participantStatuses: ["invited", "confirmed", "present", "absent", "late", "leave_requested", "excused"],
    },
    match: {
      eventTypes: matchEventTypes,
    },
    operations: {
      standardFields: [
        { key: "student.identityNumber", label: "身份证号", source: "operational" },
        { key: "student.name", label: "学员姓名", source: "core" },
        { key: "student.birthDate", label: "出生年月", source: "core" },
        { key: "student.status", label: "学员状态", source: "operational" },
        { key: "student.channel", label: "渠道", source: "operational" },
        { key: "student.area", label: "区域", source: "operational" },
        { key: "student.school", label: "学校", source: "operational" },
        { key: "team.name", label: "队伍名称", source: "core" },
        { key: "coach.name", label: "教练", source: "core" },
        { key: "contact.phone", label: "手机", source: "operational" },
        { key: "contact.wechat", label: "微信", source: "operational" },
        { key: "billing.lastPaymentDate", label: "历次充值日期", source: "operational" },
        { key: "billing.paymentCount", label: "充值笔数", source: "operational" },
        { key: "billing.courseHours", label: "课时", source: "operational" },
        { key: "billing.courseBalance", label: "剩余课时", source: "operational" },
        { key: "insurance.expiresAt", label: "保险到期日期", source: "operational" },
        { key: "attendance.checkInCount", label: "签到次数", source: "operational" },
        { key: "attendance.lastCheckInAt", label: "最近签到时间", source: "operational" },
        ...config.customFields.map((field) => ({
          key: `${field.target}.${field.key}`,
          label: field.label,
          source: "custom" as const,
        })),
      ],
      customFields: config.customFields,
      offlineStatuses: [
        { key: "payment_review_status", label: "线下收费确认状态" },
        { key: "course_balance_snapshot", label: "线下课时余额快照" },
        { key: "insurance_review_status", label: "线下保险确认状态" },
        { key: "attendance_sync_status", label: "到课同步状态" },
      ],
      statusDisplay: {
        lesson: {
          showBalance: parentVisibility.showLessonBalance,
          showUpdatedAt: parentVisibility.showStatusUpdatedAt,
          showSource: parentVisibility.showStatusSource,
        },
        insurance: {
          showPolicyNumber: parentVisibility.showInsurancePolicyNumber,
          showUpdatedAt: parentVisibility.showStatusUpdatedAt,
          showSource: parentVisibility.showStatusSource,
        },
      },
    },
    visibility: {
      parent: parentVisibility,
    },
    defaultTemplates: {
      features: {
        training: true,
        matches: true,
        assessments: true,
        derived_metrics: true,
        private_lessons: true,
        payments: false,
        crm: false,
        media_distribution: false,
        venue_management: false,
      },
      appClientVisibility: {
        parentMetricScope: "published_summary",
        showLessonBalance: true,
        showInsurancePolicyNumber: false,
        showStatusUpdatedAt: true,
        showStatusSource: false,
      },
    },
    assessment: {
      graphVersions: config.metricGraphVersions,
      views: config.metricViews,
      viewNodes: config.metricViewNodes,
      templateVersions: config.assessmentTemplateVersions,
      metricBindings: config.assessmentMetricBindings,
    },
    integration: {
      connections: config.externalConnections,
      syncPolicies: config.syncPolicies,
      tableMappings: config.tableMappings,
      fieldMappings: config.fieldMappings,
      latestSyncRuns: latestSyncRuns.slice(0, 10),
    },
    privacy: buildPrivacyCapability(config),
  };
}

const defaultConsentScopes = [
  "core_training_service",
  "schedule_attendance",
  "assessment_metrics",
  "match_stats",
  "insurance_lesson_status",
  "media_capture",
  "media_public_share",
  "ai_performance_analysis",
  "ai_video_editing",
  "marketing_contact",
] as const;

function buildPrivacyCapability(config: DataCapabilityConfig) {
  const activeNotice = config.privacyNoticeVersions.find((notice) => notice.active);
  const disabledOptionalScopes = new Set(["media_public_share", "ai_performance_analysis", "ai_video_editing"]);

  return {
    noticeVersion: activeNotice
      ? {
          id: activeNotice.id,
          version: activeNotice.version,
          title: activeNotice.title,
          effectiveAt: activeNotice.effectiveAt,
        }
      : undefined,
    consentScopes: defaultConsentScopes.map((scope) => ({
      scope,
      required: [
        "core_training_service",
        "schedule_attendance",
        "assessment_metrics",
        "match_stats",
        "insurance_lesson_status",
      ].includes(scope),
      enabledByDefault: !disabledOptionalScopes.has(scope),
    })),
    fieldVisibility: config.privacyFieldPolicies.map((policy) => ({
      fieldKey: policy.fieldKey,
      dataClass: policy.dataClass,
      visibleToRoles: policy.visibleToRoles,
      exportable: policy.exportable,
      redactionMode: policy.redactionMode,
    })),
    features: {
      mediaCapture: true,
      mediaPublicShare: false,
      aiPerformanceAnalysis: false,
      aiVideoEditing: false,
    },
    parentRequestTypes: ["correction", "deletion", "withdraw_consent", "restrict_processing", "export_copy"],
  } satisfies ClubCapabilities["privacy"];
}

function stringArrayPolicy(policies: ClubPolicy[], key: ClubPolicy["key"], fallback: string[]): string[] {
  const value = policies.find((policy) => policy.key === key && policy.active)?.value;
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

function objectPolicy(policies: ClubPolicy[], key: ClubPolicy["key"]): Record<string, unknown> {
  const value = policies.find((policy) => policy.key === key && policy.active)?.value;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function deriveLessonBalance(entries: LessonLedgerEntry[]): number {
  return [...entries]
    .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt) || left.id.localeCompare(right.id))
    .reduce((balance, entry) =>
      entry.entryType === "external_snapshot" && entry.balanceAfter !== undefined
        ? entry.balanceAfter
        : balance + entry.lessonDelta,
    0);
}

function latestLessonLedgerEntry(entries: LessonLedgerEntry[]): LessonLedgerEntry | undefined {
  return [...entries].sort((left, right) =>
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
    || Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
    || left.id.localeCompare(right.id),
  )[0];
}

function deriveInsuranceCurrentStatus(policy: Pick<InsurancePolicy, "expiresAt" | "reviewStatus"> | undefined, now = new Date()): InsurancePolicy["currentStatus"] {
  if (!policy) {
    return "unknown";
  }

  if (policy.reviewStatus !== "approved") {
    return "pending";
  }

  return Date.parse(policy.expiresAt) >= Date.parse(now.toISOString().slice(0, 10)) ? "active" : "expired";
}

function sortInsurancePolicies(policies: InsurancePolicy[]): InsurancePolicy[] {
  return [...policies].sort((left, right) =>
    Date.parse(right.expiresAt) - Date.parse(left.expiresAt) || Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

function validateLessonAdjustment(input: LessonAdjustmentInput): void {
  if (input.entryType === "credit" && input.source !== "offline_recharge") {
    throw new Error("Lesson credits must come from confirmed offline recharge.");
  }

  if (input.entryType === "debit" && input.source !== "attendance") {
    throw new Error("Lesson debits must come from confirmed attendance.");
  }

  if (input.entryType === "adjustment" && input.source !== "manual_adjustment") {
    throw new Error("Manual lesson corrections must use manual_adjustment source.");
  }

  if (input.entryType === "credit" && input.lessonDelta <= 0) {
    throw new Error("Lesson credit delta must be positive.");
  }

  if (input.entryType === "debit" && input.lessonDelta >= 0) {
    throw new Error("Lesson debit delta must be negative.");
  }

  if (input.entryType === "adjustment" && input.lessonDelta === 0) {
    throw new Error("Lesson adjustment delta cannot be zero.");
  }
}

export abstract class SeedBackedStore implements ApiStore {
  protected readonly data: SeedData;
  private readonly counters = new Map<string, number>();
  private readonly httpIdempotencyRecords = new Map<string, HttpIdempotencyRecord>();
  private readonly privacyAuditLogs: PrivacyAuditLog[] = [];
  private readonly privacyRequests: PrivacyRequest[] = [];
  private readonly tacticalBoards = new Map<string, TacticalBoard>();
  protected readonly wpsWebhookReplayGuard = new InMemoryWpsWebhookReplayGuard();

  constructor(data: SeedData = createSeedData()) {
    this.data = data;
    this.seedCounters();
  }

  private seedCounters() {
    for (const collection of Object.values(this.data)) {
      if (!Array.isArray(collection)) {
        continue;
      }

      for (const item of collection as Array<{ id?: string }>) {
        const match = item.id?.match(/^(.*)-(\d+)$/);
        if (!match?.[1] || !match[2]) {
          continue;
        }

        this.counters.set(match[1], Math.max(this.counters.get(match[1]) ?? 0, Number(match[2])));
      }
    }
  }

  private nextId(prefix = "id"): EntityId {
    const next = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, next);
    return `${prefix}-${next}`;
  }

  private now() {
    return new Date().toISOString();
  }

  private readonly clock = {
    now: () => this.now(),
  };

  private readonly ids = {
    next: (prefix?: string) => this.nextId(prefix),
  };

  private readonly activityServices = createApiServices(this, this.ids, this.clock);

  getHealth(): { status: "ok"; service: "@football-club/api" } {
    return {
      status: "ok",
      service: "@football-club/api",
    };
  }

  getTacticalBoard(clubId: EntityId, eventId: EntityId): TacticalBoard | null {
    return this.tacticalBoards.get(`${clubId}:${eventId}`) ?? null;
  }

  saveTacticalBoard(board: TacticalBoard): TacticalBoard {
    this.tacticalBoards.set(`${board.clubId}:${board.eventId}`, board);
    return board;
  }

  getHttpIdempotencyRecord(key: string): HttpIdempotencyRecord | null {
    const record = this.httpIdempotencyRecords.get(key);
    if (!record || Date.parse(record.expiresAt) <= Date.now()) {
      if (record) {
        this.httpIdempotencyRecords.delete(key);
      }
      return null;
    }

    return record;
  }

  saveHttpIdempotencyRecord(record: HttpIdempotencyRecord): void {
    this.httpIdempotencyRecords.set(record.key, record);
  }

  pruneHttpIdempotencyRecords(now: string): void {
    const cutoff = Date.parse(now);
    for (const [key, record] of this.httpIdempotencyRecords.entries()) {
      if (Date.parse(record.expiresAt) <= cutoff) {
        this.httpIdempotencyRecords.delete(key);
      }
    }
  }

  listClubs(): Club[] | Promise<Club[]> {
    return this.data.clubs;
  }

  getClubById(clubId: EntityId) {
    return this.data.clubs.find((item) => item.id === clubId) ?? null;
  }

  protected getSeedClubConfig(clubId: EntityId, club: Club | null) {
    if (!club) {
      return null;
    }

    return {
      club,
      featureFlags: this.listFeatureFlags(clubId),
      policies: this.listPolicies(clubId),
      customFields: this.listCustomFields(clubId),
    };
  }

  getClubConfig(clubId: EntityId): ReturnType<ApiStore["getClubConfig"]> {
    return this.getSeedClubConfig(clubId, this.getClubById(clubId));
  }

  getClubCapabilities(clubId: EntityId, clientSelector: { clientId?: EntityId; appId?: string; clientKey?: string } = {}): ReturnType<ApiStore["getClubCapabilities"]> {
    const club = this.getClubById(clubId);
    if (!club) {
      return null;
    }
    const client = this.resolveClubAppClient(clubId, clientSelector);
    if ((clientSelector.clientId || clientSelector.appId || clientSelector.clientKey) && !client) {
      return null;
    }

    return buildClubCapabilities(
      club,
      this.getDataCapabilityConfig(clubId),
      this.listExternalSyncRuns(clubId),
      client,
    );
  }

  listClubAppClients(clubId: EntityId): ClubAppClient[] {
    return this.data.appClients.filter((item) => item.clubId === clubId);
  }

  async resolveAppClientCapabilities(input: { appId?: string; clientKey?: string }) {
    const client = this.data.appClients.find((item) =>
      item.status === "active"
      && (input.appId ? item.appId === input.appId : true)
      && (input.clientKey ? item.clientKey === input.clientKey : true)
      && (input.appId || input.clientKey),
    );
    if (!client) {
      return null;
    }
    const capabilities = await this.getClubCapabilities(client.clubId, { clientId: client.id });
    if (!capabilities) {
      return null;
    }

    return { clubId: client.clubId, clientId: client.id, capabilities };
  }

  private resolveClubAppClient(clubId: EntityId, selector: { clientId?: EntityId; appId?: string; clientKey?: string }): ClubAppClient | undefined {
    if (!selector.clientId && !selector.appId && !selector.clientKey) {
      return undefined;
    }

    return this.data.appClients.find((item) =>
      item.clubId === clubId
      && item.status === "active"
      && (selector.clientId ? item.id === selector.clientId : true)
      && (selector.appId ? item.appId === selector.appId : true)
      && (selector.clientKey ? item.clientKey === selector.clientKey : true),
    );
  }

  isGuardianOfStudent(clubId: EntityId, userId: EntityId, studentId: EntityId): boolean {
    const parent = this.data.parents.find((item) => item.clubId === clubId && item.userId === userId);
    if (!parent) {
      return false;
    }

    return this.data.guardianBindings.some((binding) =>
      binding.clubId === clubId && binding.parentId === parent.id && binding.studentId === studentId,
    );
  }

  listFeatureFlags(clubId: EntityId): ClubFeatureFlag[] {
    return this.data.featureFlags.filter((item) => item.clubId === clubId);
  }

  listPolicies(clubId: EntityId): ClubPolicy[] {
    return this.data.policies.filter((item) => item.clubId === clubId && item.active);
  }

  listCustomFields(clubId: EntityId): CustomFieldDefinition[] {
    return this.data.customFields.filter((item) => item.clubId === clubId && item.active);
  }

  private ensureTeamInClub(clubId: EntityId, teamId?: EntityId) {
    if (!teamId) {
      return;
    }

    const team = this.getTeam(teamId);
    if (!team || team.clubId !== clubId) {
      throw new Error("Team not found for club.");
    }
  }

  private ensureCoachInClub(clubId: EntityId, coachId?: EntityId) {
    if (!coachId || this.listCoaches(clubId).some((item) => item.id === coachId)) {
      return;
    }

    throw new Error("Coach not found for club.");
  }

  private ensureStudentInClub(clubId: EntityId, studentId?: EntityId) {
    if (!studentId || this.listStudents(clubId).some((item) => item.id === studentId)) {
      return;
    }

    throw new Error("Student not found for club.");
  }

  listTeams(clubId: EntityId) {
    return this.data.teams.filter((item) => item.clubId === clubId);
  }

  getTeam(teamId: EntityId) {
    return this.data.teams.find((item) => item.id === teamId) ?? null;
  }

  saveTeam(team: Team) {
    return upsertById(this.data.teams, team);
  }

  listTeamMembers(clubId: EntityId) {
    return this.data.teamMembers.filter((item) => item.clubId === clubId);
  }

  getTeamMember(teamMemberId: EntityId) {
    return this.data.teamMembers.find((item) => item.id === teamMemberId) ?? null;
  }

  saveTeamMember(teamMember: TeamMember) {
    return upsertById(this.data.teamMembers, teamMember);
  }

  listCalendarEvents(clubId: EntityId) {
    return this.data.events
      .filter((event) => event.clubId === clubId)
      .map((event) => this.eventDetail(event));
  }

  getCalendarEvent(eventId: EntityId) {
    return this.data.events.find((item) => item.id === eventId) ?? null;
  }

  saveCalendarEvent(event: CalendarEvent) {
    return upsertById(this.data.events, event);
  }

  listEventParticipants(clubId: EntityId) {
    return this.data.participants.filter((item) => item.clubId === clubId);
  }

  getEventParticipant(eventParticipantId: EntityId) {
    return this.data.participants.find((item) => item.id === eventParticipantId) ?? null;
  }

  saveEventParticipant(eventParticipant: EventParticipant) {
    return upsertById(this.data.participants, eventParticipant);
  }

  listTrainingSessions(clubId: EntityId) {
    return this.data.trainingSessions.filter((item) => item.clubId === clubId);
  }

  getTrainingSession(trainingSessionId: EntityId) {
    return this.data.trainingSessions.find((item) => item.id === trainingSessionId) ?? null;
  }

  saveTrainingSession(trainingSession: TrainingSession) {
    return upsertById(this.data.trainingSessions, trainingSession);
  }

  listSessionDeliveries(clubId: EntityId): SessionDelivery[] {
    return this.data.sessionDeliveries.filter((item) => item.clubId === clubId);
  }

  saveSessionDelivery(sessionDelivery: SessionDelivery) {
    return upsertById(this.data.sessionDeliveries, sessionDelivery);
  }

  listSessionObservations(clubId: EntityId): SessionObservation[] {
    return this.data.sessionObservations.filter((item) => item.clubId === clubId);
  }

  saveSessionObservation(sessionObservation: SessionObservation) {
    return upsertById(this.data.sessionObservations, sessionObservation);
  }

  listOtherActivities(clubId: EntityId): OtherActivity[] {
    return this.data.otherActivities.filter((item) => item.clubId === clubId);
  }

  saveOtherActivity(otherActivity: OtherActivity) {
    return upsertById(this.data.otherActivities, otherActivity);
  }

  listSessionPlans(clubId: EntityId) {
    return this.data.sessionPlans.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  getSessionPlan(sessionPlanId: EntityId) {
    return this.data.sessionPlans.find((item) => item.id === sessionPlanId) ?? null;
  }

  saveSessionPlan(sessionPlan: SessionPlan) {
    return upsertById(this.data.sessionPlans, sessionPlan);
  }

  listDevelopmentDimensions(clubId: EntityId) {
    return this.data.dimensions.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listTrainingObjectives(clubId: EntityId) {
    return this.data.objectives.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listTrainingDrills(clubId: EntityId) {
    return this.data.drills.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listAbilityMetrics(clubId: EntityId): AbilityMetric[] {
    return this.data.metrics.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listMetricGraphVersions(clubId: EntityId): MetricGraphVersion[] {
    return this.data.metricGraphVersions.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listMetricDependencies(clubId: EntityId): MetricDependency[] {
    return this.data.metricDependencies.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listMetricViews(clubId: EntityId): MetricView[] {
    return this.data.metricViews.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listMetricViewNodes(clubId: EntityId): MetricViewNode[] {
    return this.data.metricViewNodes.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listAssessmentTemplates(clubId: EntityId): AssessmentTemplate[] {
    return this.data.assessmentTemplates.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listAssessmentTestItems(clubId: EntityId): AssessmentTestItem[] {
    return this.data.assessmentTestItems.filter((item) => item.clubId === clubId);
  }

  listDerivedMetricDefinitions(clubId: EntityId): DerivedMetricDefinition[] {
    return this.data.derivedMetricDefinitions.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listCoaches(clubId: EntityId): CoachProfile[] {
    return this.data.coaches.filter((item) => item.clubId === clubId);
  }

  listStudents(clubId: EntityId): StudentProfile[] {
    return this.data.students.filter((item) => item.clubId === clubId);
  }

  listMatches(clubId: EntityId) {
    return this.data.matches.filter((item) => item.clubId === clubId);
  }

  saveMatch(match: Match) {
    return upsertById(this.data.matches, match);
  }

  listMetricRecords(clubId: EntityId) {
    return this.data.metricRecords.filter((item) => item.clubId === clubId);
  }

  getDataCapabilityConfig(clubId: EntityId): DataCapabilityConfig {
    return {
      featureFlags: this.listFeatureFlags(clubId),
      policies: this.listPolicies(clubId),
      customFields: this.listCustomFields(clubId),
      appClients: this.listClubAppClients(clubId),
      metricGraphVersions: this.listMetricGraphVersions(clubId),
      metricDependencies: this.listMetricDependencies(clubId),
      metricViews: this.listMetricViews(clubId),
      metricViewNodes: this.listMetricViewNodes(clubId),
      assessmentTemplateVersions: this.data.assessmentTemplateVersions.filter((item) => item.clubId === clubId),
      assessmentMetricBindings: this.data.assessmentMetricBindings.filter((item) => item.clubId === clubId),
      externalConnections: this.data.externalConnections.filter((item) => item.clubId === clubId).map(sanitizeExternalConnection),
      syncPolicies: this.data.externalSyncPolicies.filter((item) => item.clubId === clubId),
      tableMappings: this.data.externalTableMappings.filter((item) => item.clubId === clubId),
      fieldMappings: this.data.externalFieldMappings.filter((item) => item.clubId === clubId),
      privacyFieldPolicies: this.data.privacyFieldPolicies.filter((item) => item.clubId === clubId && item.active),
      privacyNoticeVersions: this.data.privacyNoticeVersions.filter((item) => item.clubId === clubId),
      privacyRetentionPolicies: this.data.privacyRetentionPolicies.filter((item) => item.clubId === clubId && item.active),
    };
  }

  getPrivacyOverview(clubId: EntityId): PrivacyOverview {
    const config = this.getDataCapabilityConfig(clubId);
    return {
      fieldPolicies: config.privacyFieldPolicies,
      noticeVersions: config.privacyNoticeVersions,
      retentionPolicies: config.privacyRetentionPolicies,
    };
  }

  getStudentPrivacyState(clubId: EntityId, studentId: EntityId) {
    return {
      clubId,
      studentId,
      noticeVersion: this.data.privacyNoticeVersions.find((notice) => notice.clubId === clubId && notice.active),
      consents: this.data.studentConsentRecords.filter((record) => record.clubId === clubId && record.studentId === studentId),
      requests: this.privacyRequests.filter((request) => request.clubId === clubId && request.studentId === studentId),
    };
  }

  upsertStudentConsent(clubId: EntityId, input: PrivacyConsentUpsertInput, actorUserId?: EntityId): StudentConsentRecord {
    this.ensureStudentInClub(clubId, input.studentId);
    const now = this.now();
    const existing = this.data.studentConsentRecords.find((record) =>
      record.clubId === clubId && record.studentId === input.studentId && record.scope === input.scope,
    );
    const statusChanged = existing?.status !== input.status;
    const record: StudentConsentRecord = {
      id: existing?.id ?? this.nextId("student-consent"),
      clubId,
      studentId: input.studentId,
      scope: input.scope,
      status: input.status,
      noticeVersionId: input.noticeVersionId ?? existing?.noticeVersionId,
      guardianUserId: input.guardianUserId ?? existing?.guardianUserId,
      relationship: input.relationship ?? existing?.relationship,
      source: input.source ?? existing?.source ?? "admin_recorded",
      evidenceRef: input.evidenceRef ?? existing?.evidenceRef,
      grantedAt: input.status === "granted" ? now : existing?.grantedAt,
      withdrawnAt: input.status === "withdrawn" ? now : undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    upsertById(this.data.studentConsentRecords, record);
    if (statusChanged) {
      this.recordPrivacyAudit({
        clubId,
        actorUserId,
        actorRole: actorUserId ? "admin" : "system",
        action: "consent_change",
        targetType: "student",
        targetId: input.studentId,
        fieldKeys: [`consent.${input.scope}`],
        dataClasses: ["personal"],
        purpose: input.reason ?? "privacy consent update",
      });
    }

    return record;
  }

  createPrivacyRequest(clubId: EntityId, input: PrivacyRequestCreateInput, requestedByUserId?: EntityId): PrivacyRequest {
    this.ensureStudentInClub(clubId, input.studentId);
    const now = this.now();
    const request: PrivacyRequest = {
      id: this.nextId("privacy-request"),
      clubId,
      studentId: input.studentId,
      requestType: input.requestType,
      status: "open",
      requestedByUserId,
      description: input.description,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.privacyRequests.push(request);
    this.recordPrivacyAudit({
      clubId,
      actorUserId: requestedByUserId,
      actorRole: requestedByUserId ? "parent" : "system",
      action: "request_create",
      targetType: "student",
      targetId: input.studentId,
      fieldKeys: [`privacy_request.${input.requestType}`],
      dataClasses: ["personal"],
      purpose: "privacy request created",
    });
    return request;
  }

  resolvePrivacyRequest(clubId: EntityId, requestId: EntityId, input: PrivacyRequestResolveInput): PrivacyRequest | null {
    const existing = this.privacyRequests.find((request) => request.clubId === clubId && request.id === requestId);
    if (!existing) {
      return null;
    }

    const now = this.now();
    const resolved: PrivacyRequest = {
      ...existing,
      status: input.status,
      resolvedByUserId: input.resolvedByUserId,
      resolutionNote: input.resolutionNote,
      resolvedAt: input.status === "resolved" || input.status === "rejected" ? now : existing.resolvedAt,
      updatedAt: now,
    };
    upsertById(this.privacyRequests, resolved);
    this.recordPrivacyAudit({
      clubId,
      actorUserId: input.resolvedByUserId,
      actorRole: input.resolvedByUserId ? "admin" : "system",
      action: "request_resolve",
      targetType: "student",
      targetId: resolved.studentId,
      fieldKeys: [`privacy_request.${resolved.requestType}`],
      dataClasses: ["personal"],
      purpose: input.resolutionNote ?? "privacy request resolved",
    });
    return resolved;
  }

  listPrivacyRequests(clubId: EntityId, studentId?: EntityId): PrivacyRequest[] {
    return this.privacyRequests.filter((request) =>
      request.clubId === clubId && (studentId ? request.studentId === studentId : true),
    );
  }

  listPrivacyAuditLogs(clubId: EntityId): PrivacyAuditLog[] {
    return this.privacyAuditLogs.filter((log) => log.clubId === clubId).sort((left, right) =>
      Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
  }

  recordPrivacyAudit(log: Omit<PrivacyAuditLog, "id" | "createdAt" | "updatedAt">): PrivacyAuditLog {
    const now = this.now();
    const entity: PrivacyAuditLog = {
      id: this.nextId("privacy-audit"),
      ...log,
      createdAt: now,
      updatedAt: now,
    };
    this.privacyAuditLogs.push(entity);
    return entity;
  }

  previewPrivacyExport(clubId: EntityId, input: PrivacyExportPreviewInput, role: PrivacyRole): PrivacyExportPreviewResult | null {
    if (input.targetType !== "student") {
      return null;
    }
    const detail = this.getOperationalStudentDetail(clubId, input.targetId);
    if (!detail) {
      return null;
    }

    return buildPrivacyExportPreview(detail, input, role, this.getDataCapabilityConfig(clubId).privacyFieldPolicies);
  }

  dryRunPrivacyRetention(clubId: EntityId): PrivacyRetentionDryRunResult {
    const policies = this.getDataCapabilityConfig(clubId).privacyRetentionPolicies;
    return {
      policies,
      candidates: policies.map((policy) => ({
        policyId: policy.id,
        category: policy.category,
        action: policy.action,
        targetType: retentionTargetType(policy.category),
        estimatedCount: estimateRetentionCandidates(this.data, clubId, policy.category),
      })),
    };
  }

  listExternalConnections(clubId: EntityId): ExternalSystemConnection[] {
    return this.data.externalConnections.filter((item) => item.clubId === clubId).map(sanitizeExternalConnection);
  }

  listExternalSyncPolicies(clubId: EntityId): ExternalSyncPolicy[] {
    return this.data.externalSyncPolicies.filter((item) => item.clubId === clubId);
  }

  createExternalSyncPolicy(clubId: EntityId, input: CreateExternalSyncPolicyInput): ExternalSyncPolicy {
    this.ensureExternalPolicyReferences(clubId, input.connectionId, input.tableMappingId);
    validateExternalSyncPolicyInput(input);
    const now = this.now();

    return upsertById(this.data.externalSyncPolicies, {
      id: this.nextId("external-sync-policy"),
      clubId,
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }

  updateExternalSyncPolicy(
    clubId: EntityId,
    policyId: EntityId,
    input: UpdateExternalSyncPolicyInput,
  ): ExternalSyncPolicy | null {
    const existing = this.data.externalSyncPolicies.find((item) => item.clubId === clubId && item.id === policyId);
    if (!existing) {
      return null;
    }

    this.ensureExternalPolicyReferences(
      clubId,
      input.connectionId ?? existing.connectionId,
      input.tableMappingId === undefined ? existing.tableMappingId : input.tableMappingId,
    );
    validateExternalSyncPolicyInput({ ...existing, ...input });

    return upsertById(this.data.externalSyncPolicies, {
      ...existing,
      ...input,
      clubId,
      id: policyId,
      updatedAt: this.now(),
    });
  }

  async runExternalSyncPolicy(clubId: EntityId, policyId: EntityId): Promise<RunExternalSyncPolicyResult | null> {
    const policy = this.data.externalSyncPolicies.find((item) => item.clubId === clubId && item.id === policyId);
    if (!policy) {
      return null;
    }

    try {
      const { connection, tableMapping } = this.resolveRunnableSyncPolicy(policy);
      this.ensureWpsSyncReadiness(policy.clubId, connection, tableMapping);
      const connector = createWpsConnector(connection, {
        credentialResolver: createEnvWpsCredentialResolver(),
      });
      const records = await connector.fetchRows({ clubId, connection, tableMapping });
      const result = this.stageExternalImport(clubId, {
        connectionId: connection.id,
        tableMappingId: tableMapping.id,
        sourceName: `wps:${tableMapping.externalTableKey}`,
        records,
      });

      return { policy, ...result };
    } catch (error) {
      this.recordFailedSyncRun(policy, error, this.now());
      throw error;
    }
  }

  planDueExternalSyncPolicies(clubId: EntityId, now: string): DueExternalSyncPoliciesResult {
    return {
      clubId,
      now,
      policies: this.data.externalSyncPolicies
        .filter((policy) => policy.clubId === clubId && policy.triggerMode === "scheduled" && policy.status === "active")
        .map((policy) => buildDueExternalSyncPolicy(policy, this.data.externalSyncRuns, now)),
    };
  }

  async runDueExternalSyncPolicies(clubId: EntityId, now: string): Promise<RunDueExternalSyncPoliciesResult> {
    const due = this.planDueExternalSyncPolicies(clubId, now);
    const results: RunDueExternalSyncPoliciesResult["results"] = [];

    for (const item of due.policies) {
      if (!item.due || !item.runnable) {
        results.push({
          policyId: item.policy.id,
          due: item.due,
          runnable: item.runnable,
          status: "skipped",
          error: item.notRunnableReason,
        });
        continue;
      }

      try {
        const result = await this.runExternalSyncPolicy(clubId, item.policy.id);
        results.push({
          policyId: item.policy.id,
          due: true,
          runnable: true,
          status: "completed",
          syncRunId: result?.syncRun.id,
          importedRecords: result?.syncRun.importedRecords,
          failedRecords: result?.syncRun.failedRecords,
        });
      } catch (error) {
        results.push({
          policyId: item.policy.id,
          due: true,
          runnable: true,
          status: "failed",
          error: error instanceof Error ? error.message : "Due sync failed",
        });
      }
    }

    return { clubId, now, results };
  }

  async ingestWpsWebhook(clubId: EntityId, input: WpsWebhookIngestionInput): Promise<WpsWebhookIngestionResult> {
    const connection = this.data.externalConnections.find((item) =>
      item.clubId === clubId && item.id === input.connectionId && item.provider === "wps" && item.status === "active",
    );
    const tableMapping = this.data.externalTableMappings.find((item) =>
      item.clubId === clubId
        && item.id === input.tableMappingId
        && item.connectionId === input.connectionId
        && item.status === "active",
    );
    const policy = this.data.externalSyncPolicies.find((item) =>
      item.clubId === clubId
        && item.connectionId === input.connectionId
        && item.status === "active"
        && item.direction === "inbound"
        && (input.policyId ? item.id === input.policyId : true)
        && (item.tableMappingId ? item.tableMappingId === input.tableMappingId : true),
    );

    if (!connection) {
      throw new Error(`Active WPS connection ${input.connectionId} is not configured for club ${clubId}.`);
    }
    if (!tableMapping) {
      throw new Error(`Active WPS table mapping ${input.tableMappingId} is not configured for club ${clubId}.`);
    }
    if (!policy) {
      throw new Error("No active inbound sync policy matches this WPS webhook.");
    }
    await verifyWpsWebhookSecurity({
      config: parseWpsWebhookSecurityConfig(connection.config),
      envelope: input.security,
      payload: webhookSignedPayload(input),
      secretResolver: createEnvWpsSecretResolver(),
      replayGuard: this.wpsWebhookReplayGuard,
    });

    const now = input.occurredAt ?? this.now();
    const syncRun = upsertById<ExternalSyncRun>(this.data.externalSyncRuns, {
      id: input.eventId ? `external-sync-run-wps-webhook-${input.eventId}` : this.nextId("external-sync-run-wps-webhook"),
      clubId,
      connectionId: connection.id,
      tableMappingId: tableMapping.id,
      status: "queued",
      totalRecords: 0,
      importedRecords: 0,
      failedRecords: 0,
      error: {
        eventType: input.eventType,
        eventId: input.eventId,
        payload: input.payload,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { status: "queued", matchedPolicy: policy, syncRun };
  }

  getImportPreview(clubId: EntityId, filters: ImportPreviewFilters = {}): ImportPreview {
    return {
      records: this.filterExternalRawRecords(clubId, filters),
    };
  }

  stageExternalImport(clubId: EntityId, input: StageExternalImportInput): StageExternalImportResult {
    const connection = this.data.externalConnections.find((item) => item.clubId === clubId && item.id === input.connectionId);
    const tableMapping = this.data.externalTableMappings.find((item) =>
      item.clubId === clubId && item.id === input.tableMappingId && item.connectionId === input.connectionId,
    );

    if (!connection) {
      throw new Error(`External connection ${input.connectionId} is not configured for club ${clubId}.`);
    }

    if (!tableMapping) {
      throw new Error(`External table mapping ${input.tableMappingId} is not configured for club ${clubId}.`);
    }

    const now = this.now();
    const syncRunId = this.nextId("external-sync-run");
    const fieldMappings = this.data.externalFieldMappings.filter((item) =>
      item.clubId === clubId && item.tableMappingId === input.tableMappingId,
    );
    const records = input.records.map((record) => {
      const { normalizedPreview, validationErrors } = normalizeExternalRawRecord(record.raw, fieldMappings);
      const id = buildStagedRawRecordId(tableMapping.externalTableKey, record.rowHash);
      const existing = this.data.externalRawRecords.find((item) => item.id === id);

      return upsertById<ExternalRawRecord>(this.data.externalRawRecords, {
        id,
        clubId,
        connectionId: input.connectionId,
        tableMappingId: input.tableMappingId,
        syncRunId,
        externalRecordId: record.externalRecordId ?? `${input.sourceName ?? tableMapping.externalTableKey}:row-${record.rowNumber}`,
        payload: record.raw,
        payloadHash: record.rowHash,
        reviewStatus: existing?.reviewStatus ?? "pending",
        validationErrors,
        normalizedPreview,
        importedAt: now,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    });
    const failedRecords = records.filter((record) => record.validationErrors?.length).length;
    const syncRun = upsertById<ExternalSyncRun>(this.data.externalSyncRuns, {
      id: syncRunId,
      clubId,
      connectionId: connection.id,
      tableMappingId: tableMapping.id,
      status: "completed",
      startedAt: now,
      finishedAt: now,
      totalRecords: records.length,
      importedRecords: 0,
      failedRecords,
      createdAt: now,
      updatedAt: now,
    });

    return { syncRun, records };
  }

  listExternalSyncRuns(clubId: EntityId): ExternalSyncRun[] {
    return this.data.externalSyncRuns
      .filter((item) => item.clubId === clubId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  getExternalSyncRunDetail(clubId: EntityId, syncRunId: EntityId): SyncRunDetail | null {
    const syncRun = this.data.externalSyncRuns.find((item) => item.clubId === clubId && item.id === syncRunId);

    if (!syncRun) {
      return null;
    }

    const rawRecords = this.data.externalRawRecords.filter((item) => item.clubId === clubId && item.syncRunId === syncRunId);
    const invalidRecords = rawRecords.filter((record) => record.validationErrors?.length).length;

    return {
      syncRun,
      rawRecords,
      validationSummary: {
        totalRecords: rawRecords.length,
        validRecords: rawRecords.length - invalidRecords,
        invalidRecords,
        pendingRecords: rawRecords.filter((record) => record.reviewStatus === "pending").length,
        confirmedRecords: rawRecords.filter((record) => record.reviewStatus === "confirmed" || record.reviewStatus === "linked").length,
        rejectedRecords: rawRecords.filter((record) => record.reviewStatus === "rejected").length,
      },
    };
  }

  listOperationalStudents(clubId: EntityId, filters: StudentListFilters = {}): StudentListItem[] {
    return this.data.students
      .filter((student) => student.clubId === clubId)
      .map((student) => this.getOperationalStudentDetail(clubId, student.id))
      .filter((student): student is StudentDetail => Boolean(student))
      .filter((student) => (filters.teamId ? student.teams.some((team) => team.teamId === filters.teamId) : true))
      .filter((student) => (filters.coachId ? student.teams.some((team) => team.defaultCoachId === filters.coachId) : true))
      .filter((student) => (filters.studentStatus ? student.operationalProfile?.studentStatus === filters.studentStatus : true))
      .filter((student) => (filters.school ? student.operationalProfile?.school === filters.school : true))
      .filter((student) => (filters.lessonBalanceLow ? typeof student.lessonBalance === "number" && student.lessonBalance <= 4 : true));
  }

  getOperationalStudentDetail(clubId: EntityId, studentId: EntityId): StudentDetail | null {
    const student = this.data.students.find((item) => item.clubId === clubId && item.id === studentId);

    if (!student) {
      return null;
    }

    const teams = this.data.teamMembers
      .filter((member) => member.clubId === clubId && member.studentId === studentId)
      .map((member) => {
        const team = this.data.teams.find((item) => item.clubId === clubId && item.id === member.teamId);
        const coach = team?.defaultCoachId
          ? this.data.coaches.find((item) => item.clubId === clubId && item.id === team.defaultCoachId)
          : undefined;

        return {
          membershipId: member.id,
          teamId: member.teamId,
          name: team?.name,
          ageGroup: team?.ageGroup,
          level: team?.level,
          defaultCoachId: team?.defaultCoachId,
          defaultCoachName: coach?.name,
          startsAt: member.startsAt,
          endsAt: member.endsAt,
          isPrimaryTeam: member.isPrimaryTeam,
          status: member.status,
        };
      });
    const primaryContact = this.data.parents.find((parent) =>
      this.data.guardianBindings.some((binding) =>
        binding.clubId === clubId && binding.studentId === studentId && binding.parentId === parent.id && binding.isPrimaryContact,
      ),
    );

    const lessonLedger = this.data.lessonLedger.filter((entry) => entry.clubId === clubId && entry.studentId === studentId);
    const insurancePolicies = sortInsurancePolicies(
      this.data.insurancePolicies.filter((policy) => policy.clubId === clubId && policy.studentId === studentId)
        .map((policy) => ({ ...policy, currentStatus: deriveInsuranceCurrentStatus(policy) })),
    );
    const currentInsurance = insurancePolicies[0];

    return {
      id: student.id,
      clubId: student.clubId,
      name: student.name,
      birthDate: student.birthDate,
      gender: student.gender,
      currentLevel: student.currentLevel,
      operationalProfile: undefined,
      teams,
      primaryContact: primaryContact
        ? { id: primaryContact.id, name: primaryContact.name, phone: primaryContact.phone, relationship: "guardian" }
        : undefined,
      contacts: primaryContact
        ? [{ id: primaryContact.id, name: primaryContact.name, phone: primaryContact.phone, relationship: "guardian" }]
        : [],
      lessonBalance: lessonLedger.length ? deriveLessonBalance(lessonLedger) : undefined,
      lessonLedger,
      insuranceStatus: {
        status: currentInsurance?.currentStatus ?? "unknown",
        expiresAt: currentInsurance?.expiresAt,
        policyNumber: currentInsurance?.policyNumber,
        reviewStatus: currentInsurance?.reviewStatus,
      },
      insurancePolicies,
      attendanceSnapshot: {
        lessonBalance: lessonLedger.length ? deriveLessonBalance(lessonLedger) : undefined,
      },
    };
  }

  getStudentOperationalStatusSummary(clubId: EntityId, studentId: EntityId): StudentOperationalStatusSummary | null {
    const student = this.data.students.find((item) => item.clubId === clubId && item.id === studentId);
    if (!student) {
      return null;
    }

    const lessonLedger = this.data.lessonLedger.filter((entry) => entry.clubId === clubId && entry.studentId === studentId);
    const insurance = this.listInsurancePolicies(clubId, studentId);
    const latestLessonEntry = latestLessonLedgerEntry(lessonLedger);
    const latestSyncRun = this.listExternalSyncRuns(clubId)[0];

    return {
      clubId,
      studentId,
      lessonBalance: lessonLedger.length ? deriveLessonBalance(lessonLedger) : undefined,
      lesson: {
        balance: lessonLedger.length ? deriveLessonBalance(lessonLedger) : undefined,
        updatedAt: latestLessonEntry?.updatedAt,
        source: latestLessonEntry?.source,
        status: latestLessonEntry
          ? latestLessonEntry.source === "external_import" ? "synced" : "confirmed"
          : "unknown",
      },
      insurance: {
        ...(insurance?.current ?? { status: "unknown" as const }),
        updatedAt: insurance?.policies[0]?.updatedAt,
        source: insurance?.policies[0]?.source,
        sourceId: insurance?.policies[0]?.sourceId,
      },
      sync: latestSyncRun
        ? { latestRun: { id: latestSyncRun.id, status: latestSyncRun.status, updatedAt: latestSyncRun.updatedAt } }
        : undefined,
    };
  }

  getLessonLedger(clubId: EntityId, studentId: EntityId): LessonLedgerSummary | null {
    const student = this.data.students.find((item) => item.clubId === clubId && item.id === studentId);
    if (!student) {
      return null;
    }

    const entries = this.data.lessonLedger
      .filter((entry) => entry.clubId === clubId && entry.studentId === studentId)
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt) || right.id.localeCompare(left.id));

    return {
      clubId,
      studentId,
      balance: deriveLessonBalance(entries),
      entries,
    };
  }

  recordLessonAdjustment(clubId: EntityId, studentId: EntityId, input: LessonAdjustmentInput): LessonLedgerSummary {
    const student = this.data.students.find((item) => item.clubId === clubId && item.id === studentId);
    if (!student) {
      throw new Error("Student not found for club.");
    }

    validateLessonAdjustment(input);
    const now = this.now();
    const paymentEventId = input.entryType === "credit" ? this.nextId("payment-event") : undefined;
    const id = input.sourceId ? `lesson-ledger-${input.entryType}-${input.sourceId}` : this.nextId(`lesson-ledger-${input.entryType}`);
    const existingEntry = this.data.lessonLedger.find((entry) => entry.clubId === clubId && entry.id === id);
    if (existingEntry) {
      return this.getLessonLedger(clubId, studentId) ?? {
        clubId,
        studentId,
        balance: existingEntry.balanceAfter ?? 0,
        entries: [existingEntry],
      };
    }
    const existingEntries = this.data.lessonLedger.filter((entry) => entry.clubId === clubId && entry.studentId === studentId);
    const balanceAfter = deriveLessonBalance(existingEntries) + input.lessonDelta;
    const entry: LessonLedgerEntry = {
      id,
      clubId,
      studentId,
      teamId: input.teamId,
      eventId: input.eventId,
      paymentEventId,
      occurredAt: input.occurredAt ?? now,
      entryType: input.entryType,
      lessonDelta: input.lessonDelta,
      balanceAfter,
      source: input.source,
      sourceId: input.sourceId,
      actorUserId: input.actorUserId,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    };

    upsertById(this.data.lessonLedger, entry);
    return this.getLessonLedger(clubId, studentId) ?? {
      clubId,
      studentId,
      balance: balanceAfter,
      entries: [entry],
    };
  }

  listInsurancePolicies(clubId: EntityId, studentId: EntityId): InsurancePolicySummary | null {
    const student = this.data.students.find((item) => item.clubId === clubId && item.id === studentId);
    if (!student) {
      return null;
    }

    const policies = sortInsurancePolicies(
      this.data.insurancePolicies.filter((policy) => policy.clubId === clubId && policy.studentId === studentId)
        .map((policy) => ({ ...policy, currentStatus: deriveInsuranceCurrentStatus(policy) })),
    );
    const current = policies[0];

    return {
      clubId,
      studentId,
      current: {
        status: current?.currentStatus ?? "unknown",
        expiresAt: current?.expiresAt,
        policyNumber: current?.policyNumber,
        reviewStatus: current?.reviewStatus,
      },
      policies,
    };
  }

  createInsurancePolicy(clubId: EntityId, studentId: EntityId, input: InsurancePolicyInput): InsurancePolicySummary {
    const student = this.data.students.find((item) => item.clubId === clubId && item.id === studentId);
    if (!student) {
      throw new Error("Student not found for club.");
    }

    const now = this.now();
    const policy: InsurancePolicy = {
      id: this.nextId("insurance-policy"),
      clubId,
      studentId,
      purchasedAt: input.purchasedAt,
      expiresAt: input.expiresAt,
      policyNumber: input.policyNumber,
      provider: input.provider,
      sport: input.sport,
      approved: input.reviewStatus === "approved" ? true : input.reviewStatus === "rejected" ? false : undefined,
      reviewStatus: input.reviewStatus,
      currentStatus: deriveInsuranceCurrentStatus({ expiresAt: input.expiresAt, reviewStatus: input.reviewStatus }),
      source: input.source ?? "offline_insurance",
      sourceId: input.sourceId,
      actorUserId: input.actorUserId,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    };

    this.data.insurancePolicies.push(policy);
    return this.listInsurancePolicies(clubId, studentId) ?? {
      clubId,
      studentId,
      current: { status: policy.currentStatus, expiresAt: policy.expiresAt, policyNumber: policy.policyNumber, reviewStatus: policy.reviewStatus },
      policies: [policy],
    };
  }

  listPrivateLessonRequests(clubId: EntityId, studentId?: EntityId): PrivateLessonRequest[] {
    return this.data.privateLessonRequests
      .filter((item) => item.clubId === clubId && (!studentId || item.studentId === studentId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createPrivateLessonRequest(clubId: EntityId, studentId: EntityId, input: PrivateLessonRequestInput): PrivateLessonRequest {
    const student = this.data.students.find((item) => item.clubId === clubId && item.id === studentId);
    if (!student) {
      throw new Error("Student not found for club.");
    }

    const now = this.now();
    const request: PrivateLessonRequest = {
      id: this.nextId("private-lesson-request"),
      clubId,
      studentId,
      coachName: input.coachName,
      date: input.date,
      timeSlot: input.timeSlot,
      goals: [...input.goals],
      note: input.note,
      status: "pending",
      requestedByUserId: input.requestedByUserId,
      createdAt: now,
      updatedAt: now,
    };

    this.data.privateLessonRequests.push(request);
    return request;
  }

  listEventChangeRequests(clubId: EntityId, eventId?: EntityId): EventChangeRequest[] {
    return this.data.eventChangeRequests
      .filter((item) => item.clubId === clubId && (!eventId || item.eventId === eventId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createEventChangeRequest(clubId: EntityId, eventId: EntityId, input: EventChangeRequestInput): EventChangeRequest {
    const event = this.data.events.find((item) => item.clubId === clubId && item.id === eventId);
    if (!event) {
      throw new Error("Event not found for club.");
    }

    const now = this.now();
    const request: EventChangeRequest = {
      id: this.nextId("event-change-request"),
      clubId,
      eventId,
      reason: input.reason,
      newStartsAt: input.newStartsAt,
      newVenue: input.newVenue,
      note: input.note,
      status: "pending",
      requestedByUserId: input.requestedByUserId,
      createdAt: now,
      updatedAt: now,
    };

    this.data.eventChangeRequests.push(request);
    return request;
  }

  listAssessmentTasks(clubId: EntityId): AssessmentTask[] {
    return this.data.assessmentTasks.filter((item) => item.clubId === clubId);
  }

  confirmExternalRecord(
    clubId: EntityId,
    rawRecordId: EntityId,
    input: ConfirmExternalRecordInput,
  ): ExternalRecordLink | null {
    const rawRecord = this.data.externalRawRecords.find((item) => item.clubId === clubId && item.id === rawRecordId);

    if (!rawRecord) {
      return null;
    }

    if (rawRecord.validationErrors?.length) {
      throw new Error("Cannot confirm external record with validation errors.");
    }

    const existingLink = this.data.externalRecordLinks.find((item) =>
      item.clubId === clubId && item.rawRecordId === rawRecordId && item.linkStatus === "confirmed",
    );
    if (existingLink) {
      return existingLink;
    }

    const now = this.now();
    upsertById<ExternalRawRecord>(this.data.externalRawRecords, {
      ...rawRecord,
      reviewStatus: "confirmed",
      updatedAt: now,
    });

    return upsertById(this.data.externalRecordLinks, {
      id: this.nextId("external-record-link"),
      clubId,
      rawRecordId,
      targetType: input.targetType,
      targetId: input.targetId,
      linkStatus: "confirmed",
      confirmedBy: input.confirmedBy,
      confirmedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  private filterExternalRawRecords(clubId: EntityId, filters: ImportPreviewFilters): ExternalRawRecord[] {
    return this.data.externalRawRecords
      .filter((item) => item.clubId === clubId)
      .filter((item) => (filters.connectionId ? item.connectionId === filters.connectionId : true))
      .filter((item) => (filters.tableMappingId ? item.tableMappingId === filters.tableMappingId : true))
      .filter((item) => (filters.reviewStatus ? item.reviewStatus === filters.reviewStatus : true))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  private ensureExternalPolicyReferences(clubId: EntityId, connectionId: EntityId, tableMappingId?: EntityId): void {
    const connection = this.data.externalConnections.find((item) => item.clubId === clubId && item.id === connectionId);
    if (!connection) {
      throw new Error(`External connection ${connectionId} is not configured for club ${clubId}.`);
    }

    if (!tableMappingId) {
      return;
    }

    const tableMapping = this.data.externalTableMappings.find((item) =>
      item.clubId === clubId && item.id === tableMappingId && item.connectionId === connectionId,
    );
    if (!tableMapping) {
      throw new Error(`External table mapping ${tableMappingId} is not configured for club ${clubId}.`);
    }
  }

  private resolveRunnableSyncPolicy(policy: ExternalSyncPolicy): {
    connection: ExternalSystemConnection;
    tableMapping: ExternalTableMapping;
  } {
    if (policy.status !== "active") {
      throw new Error("Only active sync policies can be run.");
    }

    if (policy.direction !== "inbound") {
      throw new Error("Only inbound sync policies can be run in MVP.");
    }

    const connection = this.data.externalConnections.find((item) =>
      item.clubId === policy.clubId && item.id === policy.connectionId,
    );
    if (!connection) {
      throw new Error(`External connection ${policy.connectionId} is not configured for club ${policy.clubId}.`);
    }

    if (connection.provider !== "wps") {
      throw new Error(`Provider ${connection.provider} does not have a sync connector.`);
    }

    const tableMapping = this.data.externalTableMappings.find((item) =>
      item.clubId === policy.clubId
        && item.connectionId === connection.id
        && item.status === "active"
        && (policy.tableMappingId ? item.id === policy.tableMappingId : true),
    );
    if (!tableMapping) {
      throw new Error("No active table mapping is configured for this sync policy.");
    }

    return { connection, tableMapping };
  }

  private ensureWpsSyncReadiness(clubId: EntityId, connection: ExternalSystemConnection, tableMapping: ExternalTableMapping) {
    if (connection.status !== "active") {
      throw new Error("WPS connection must be active before running sync.");
    }
    if (parseWpsConnectionConfig(connection.config).mode === "http") {
      const fieldMappings = this.data.externalFieldMappings.filter((item) =>
        item.clubId === clubId && item.tableMappingId === tableMapping.id,
      );
      if (!fieldMappings.length) {
        throw new Error("WPS HTTP sync requires field mappings for schema validation.");
      }
    }
  }

  private recordFailedSyncRun(policy: ExternalSyncPolicy, error: unknown, now: string) {
    upsertById(this.data.externalSyncRuns, {
      id: this.nextId("external-sync-run-failed"),
      clubId: policy.clubId,
      connectionId: policy.connectionId,
      tableMappingId: policy.tableMappingId,
      status: "failed",
      startedAt: now,
      finishedAt: now,
      totalRecords: 0,
      importedRecords: 0,
      failedRecords: 0,
      error: {
        code: "wps_sync_failed",
        message: error instanceof Error ? error.message : "WPS sync failed",
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  private eventDetail(event: CalendarEvent) {
    return {
      ...event,
      participants: this.data.participants.filter((participant) =>
        participant.clubId === event.clubId && participant.eventId === event.id,
      ),
      trainingSession:
        this.data.trainingSessions.find((session) => session.clubId === event.clubId && session.eventId === event.id)
        ?? null,
      match: this.data.matches.find((match) => match.clubId === event.clubId && match.eventId === event.id) ?? null,
      otherActivity:
        this.data.otherActivities.find((activity) => activity.clubId === event.clubId && activity.eventId === event.id)
        ?? null,
    };
  }

  getStudentTimeline(clubId: EntityId, studentId: EntityId) {
    const eventIds = new Set(
      this.data.participants
        .filter((participant) => participant.clubId === clubId && participant.studentId === studentId)
        .map((participant) => participant.eventId),
    );

    return this.listCalendarEvents(clubId).filter((event) => eventIds.has(event.id));
  }

  getStudentMetrics(clubId: EntityId, studentId: EntityId, source?: MetricSourceKind | MetricSourceKind[]) {
    const sources = source ? new Set(Array.isArray(source) ? source : [source]) : null;

    return this.data.metricRecords
      .filter((record) => record.clubId === clubId && record.studentId === studentId)
      .filter((record) => (sources ? sources.has(record.source) : true))
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
  }

  getCoachToday(clubId: EntityId, input: { date: string; userId: EntityId; roles: string[] }) {
    const isAdmin = input.roles.some((role) => role === "owner" || role === "admin" || role === "operator");
    const coach = this.listCoaches(clubId).find((item) => item.userId === input.userId);
    const events = this.listCalendarEvents(clubId)
      .filter((event) => event.timeRange.startsAt.slice(0, 10) === input.date)
      .filter((event) => isAdmin || (coach ? event.ownerCoachId === coach.id : false));

    return {
      clubId,
      date: input.date,
      coachId: coach?.id,
      events: events.map((event) => {
        const participantStudentIds = new Set(event.participants.map((participant) => participant.studentId));
        const teams = event.primaryTeamId
          ? this.listTeams(clubId).filter((team) => team.id === event.primaryTeamId)
          : this.listTeams(clubId).filter((team) =>
            this.listTeamMembers(clubId).some((member) => member.teamId === team.id && participantStudentIds.has(member.studentId)),
          );
        const pendingAttendance = event.participants.some((participant) =>
          participant.status === "invited" || participant.status === "confirmed",
        );
        const pendingRecord = event.type === "training"
          ? !event.trainingSession || !this.listSessionObservations(clubId).some((observation) =>
            observation.trainingSessionId === event.trainingSession?.id,
          )
          : event.type === "match" && !this.data.matchEvents.some((matchEvent) =>
            matchEvent.clubId === clubId && event.match && matchEvent.matchId === event.match.id,
          );
        const pendingAssessment = event.type === "training" && !this.data.playerAssessments.some((assessment) =>
          assessment.clubId === clubId && assessment.eventId === event.id,
        );
        const pendingLessonConfirmation = event.participants.some((participant) => {
          const sourceId = `app-client-lesson-${event.id}-${participant.studentId}`;
          return !this.getLessonLedger(clubId, participant.studentId)?.entries.some((entry) => entry.sourceId === sourceId);
        });

        return {
          ...event,
          teams,
          students: this.listStudents(clubId).filter((student) => participantStudentIds.has(student.id)),
          workflow: {
            pendingAttendance,
            pendingLessonConfirmation,
            pendingRecord,
            pendingAssessment,
          },
        };
      }),
    };
  }

  createTeam(input: Parameters<ReturnType<typeof createApiServices>["createTeam"]>[0]) {
    return this.activityServices.createTeam(input);
  }

  joinTeam(input: Parameters<ReturnType<typeof createApiServices>["joinTeam"]>[0]) {
    return this.activityServices.joinTeam(input);
  }

  createCalendarEvent(clubId: EntityId, input: Parameters<ReturnType<typeof createApiServices>["createCalendarEvent"]>[1]) {
    return this.activityServices.createCalendarEvent(clubId, input);
  }

  recordEventParticipants(
    clubId: EntityId,
    eventId: EntityId,
    participants: Parameters<ReturnType<typeof createApiServices>["recordEventParticipants"]>[2],
  ) {
    const result = this.activityServices.recordEventParticipants(clubId, eventId, participants);
    for (const participant of result) {
      if (participant.status !== "present" && participant.status !== "late") {
        continue;
      }

      this.recordLessonAdjustment(clubId, participant.studentId, {
        entryType: "debit",
        lessonDelta: -1,
        source: "attendance",
        sourceId: `${eventId}-${participant.studentId}`,
        eventId,
        occurredAt: participant.updatedAt,
        note: `Attendance ${participant.status}`,
      });
    }

    return result;
  }

  checkScheduleConflicts(
    clubId: EntityId,
    input: Parameters<ReturnType<typeof createApiServices>["checkScheduleConflicts"]>[1],
  ) {
    return this.activityServices.checkScheduleConflicts(clubId, input);
  }

  createTrainingSession(
    clubId: EntityId,
    input: Parameters<ReturnType<typeof createApiServices>["createTrainingSession"]>[1],
  ) {
    return this.activityServices.createTrainingSession(clubId, input);
  }

  getTrainingSessionByEvent(clubId: EntityId, eventId: EntityId): TrainingSession | null {
    return this.data.trainingSessions.find((session) => session.clubId === clubId && session.eventId === eventId) ?? null;
  }

  ensureTrainingSessionForEvent(
    clubId: EntityId,
    eventId: EntityId,
    input: Partial<Parameters<ReturnType<typeof createApiServices>["createTrainingSession"]>[1]> = {},
  ): TrainingSession {
    return this.createTrainingSession(clubId, {
      eventId,
      kind: input.kind ?? "team",
      sessionPlanId: input.sessionPlanId,
      intensity: input.intensity,
    });
  }

  recordTrainingObservation(
    clubId: EntityId,
    trainingSessionId: EntityId,
    input: {
      studentId: EntityId;
      coachId: EntityId;
      metricId: EntityId;
      rating?: 1 | 2 | 3 | 4 | 5;
      value?: MetricValue;
      tags?: string[];
      note?: string;
    },
  ) {
    const metric = this.findMetricById(clubId, input.metricId);
    if (!metric) {
      throw new Error("Metric not found for club.");
    }

    const observation = this.activityServices.recordSessionObservation(clubId, trainingSessionId, {
      studentId: input.studentId,
      coachId: input.coachId,
      metricId: input.metricId,
      rating: input.rating,
      tags: input.tags,
      note: input.note,
      sourceReference: { kind: "manual" },
    });
    const session = this.getTrainingSession(trainingSessionId);
    const event = session ? this.getCalendarEvent(session.eventId) : null;
    const now = this.now();
    const value = input.value ?? (input.rating ? { kind: "rating_1_5" as const, score: input.rating } : null);

    if (!value) {
      throw new Error("Training observation requires either rating or value.");
    }

    const metricRecord: PlayerMetricRecord = upsertById(this.data.metricRecords, {
      id: this.nextId("metric-record"),
      clubId,
      studentId: input.studentId,
      metricId: input.metricId,
      value,
      source: "training_observation",
      occurredAt: event?.timeRange.endsAt ?? now,
      eventId: event?.id,
      recordedByCoachId: input.coachId,
      createdAt: now,
      updatedAt: now,
      note: input.note,
    });

    return { observation, metricRecord };
  }

  private findMetricById = (clubId: EntityId, metricId: EntityId) =>
    this.data.metrics.find((metric) => metric.id === metricId && isCatalogVisibleToClub(metric, clubId)) ?? null;

  private findMetricByCode = (clubId: EntityId, code: string) =>
    this.data.metrics.find((metric) => metric.code === code && isCatalogVisibleToClub(metric, clubId)) ?? null;

  private findTemplateById = (clubId: EntityId, templateId: EntityId): AssessmentTemplate | null =>
    this.data.assessmentTemplates.find((template) =>
      template.id === templateId && isCatalogVisibleToClub(template, clubId),
    ) ?? null;

  private findTemplateVersion = (
    clubId: EntityId,
    templateId: EntityId,
    templateVersionId?: EntityId,
  ): AssessmentTemplateVersion | null =>
    this.data.assessmentTemplateVersions.find((version) =>
      version.clubId === clubId
      && version.templateId === templateId
      && version.status === "active"
      && (!templateVersionId || version.id === templateVersionId),
    ) ?? null;

  private findMetricGraphVersion = (clubId: EntityId, graphVersionId: EntityId): MetricGraphVersion | null =>
    this.data.metricGraphVersions.find((version) =>
      version.id === graphVersionId && isCatalogVisibleToClub(version, clubId),
    ) ?? null;

  private listTemplateMetricBindings = (
    clubId: EntityId,
    templateId: EntityId,
    templateVersionId?: EntityId,
  ): AssessmentMetricBinding[] => {
    const versions = this.data.assessmentTemplateVersions.filter((version) =>
      version.clubId === clubId
      && version.templateId === templateId
      && version.status === "active"
      && (!templateVersionId || version.id === templateVersionId),
    );
    const versionIds = new Set(versions.map((version) => version.id));

    return this.data.assessmentMetricBindings.filter((binding) =>
      binding.clubId === clubId && versionIds.has(binding.templateVersionId),
    );
  };

  private findDerivedDefinitionByCode = (clubId: EntityId, code: string) =>
    this.data.derivedMetricDefinitions.find((definition) =>
      definition.code === code && isCatalogVisibleToClub(definition, clubId),
    ) ?? null;

  private listMetricGraphDependencies = (clubId: EntityId, graphVersionId: EntityId) =>
    this.data.metricDependencies.filter((dependency) =>
      dependency.graphVersionId === graphVersionId && isCatalogVisibleToClub(dependency, clubId),
    );

  private listAssessmentTestItemsForService = (clubId: EntityId) =>
    this.data.assessmentTestItems.filter((item) => item.clubId === clubId);

  recordMatchSummary(input: RecordMatchInput) {
    const event = this.getCalendarEvent(input.eventId);
    if (!event || event.clubId !== input.clubId) {
      throw new Error("Event not found for club.");
    }

    for (const roster of input.rosters ?? []) {
      this.ensureStudentInClub(input.clubId, roster.studentId);
      this.ensureTeamInClub(input.clubId, roster.teamId);
    }

    for (const eventInput of input.events ?? []) {
      this.ensureStudentInClub(input.clubId, eventInput.studentId);
    }

    for (const note of input.notes ?? []) {
      this.ensureStudentInClub(input.clubId, note.studentId);
      this.ensureCoachInClub(input.clubId, note.coachId);
    }

    const service = createMatchService({
      clock: this.clock,
      ids: this.ids,
      catalog: {
        findMetricById: this.findMetricById,
        findMetricByCode: this.findMetricByCode,
      },
      store: {
        saveMatch: async (match) => {
          upsertById(this.data.matches, match);
        },
        saveRoster: async (roster) => {
          upsertById(this.data.matchRosters, roster);
        },
        saveEvent: async (event) => {
          upsertById(this.data.matchEvents, event);
        },
        saveNote: async (note) => {
          upsertById(this.data.matchPlayerNotes, note);
        },
        saveMetricRecord: async (record) => {
          upsertById(this.data.metricRecords, record);
        },
      },
    });

    return service.recordMatchSummary(input);
  }

  getMatchDetailByEvent(clubId: EntityId, eventId: EntityId) {
    const match = this.data.matches.find((item) => item.clubId === clubId && item.eventId === eventId);
    if (!match) {
      return null;
    }

    return {
      match,
      rosters: this.data.matchRosters.filter((item) => item.clubId === clubId && item.matchId === match.id),
      events: this.data.matchEvents.filter((item) => item.clubId === clubId && item.matchId === match.id),
      notes: this.data.matchPlayerNotes.filter((item) => item.clubId === clubId && item.matchId === match.id),
      metricRecords: this.data.metricRecords.filter((item) => item.clubId === clubId && item.eventId === eventId && item.source === "match_event"),
    };
  }

  recordAssessment(input: RecordAssessmentInput) {
    this.ensureStudentInClub(input.clubId, input.studentId);
    this.ensureCoachInClub(input.clubId, input.assessedByCoachId);
    if (input.eventId) {
      const event = this.getCalendarEvent(input.eventId);
      if (!event || event.clubId !== input.clubId) {
        throw new Error("Event not found for club.");
      }
    }

    const service = createAssessmentService({
      clock: this.clock,
      ids: this.ids,
      catalog: {
        findTemplateById: this.findTemplateById,
        findTemplateVersion: this.findTemplateVersion,
        findMetricGraphVersion: this.findMetricGraphVersion,
        listTemplateMetricBindings: this.listTemplateMetricBindings,
        listMetricGraphDependencies: this.listMetricGraphDependencies,
        listAssessmentTestItems: this.listAssessmentTestItemsForService,
        listAbilityMetrics: (clubId) => this.listAbilityMetrics(clubId),
        listDerivedMetricDefinitions: (clubId) => this.listDerivedMetricDefinitions(clubId),
      },
      store: {
        saveAssessment: async (assessment) => {
          upsertById(this.data.playerAssessments, assessment);
        },
        saveRawResult: async (rawResult: AssessmentRawResult) => {
          upsertById(this.data.assessmentRawResults, rawResult);
        },
        saveScore: async (score) => {
          upsertById(this.data.assessmentScores, score);
        },
        saveMetricRecord: async (record) => {
          upsertById(this.data.metricRecords, record);
        },
        saveMetricLineage: async (lineage) => {
          upsertById(this.data.metricLineages, lineage);
        },
      },
    });

    return service.recordPlayerAssessment(input);
  }

  computeAttackingContribution(clubId: EntityId, studentId: EntityId) {
    const service = createMetricService({
      clock: this.clock,
      ids: this.ids,
      catalog: {
        findDerivedDefinitionByCode: this.findDerivedDefinitionByCode,
      },
      store: {
        listMetricRecordsByStudent: async (recordClubId, recordStudentId) =>
          this.data.metricRecords.filter((record) =>
            record.clubId === recordClubId && record.studentId === recordStudentId,
          ),
        saveMetricRecord: async (record: PlayerMetricRecord) => {
          upsertById(this.data.metricRecords, record);
        },
        saveMetricLineage: async (lineage: MetricLineage) => {
          upsertById(this.data.metricLineages, lineage);
        },
      },
    });

    return service.computeDerivedMetric(clubId, studentId, "attacking_contribution");
  }
}

export class InMemoryStore extends SeedBackedStore {}

export class PersistentApiStore extends SeedBackedStore {
  constructor(
    private readonly repositories: PlatformRepositories,
    data: SeedData = createSeedData(),
  ) {
    super(data);
  }

  override getHttpIdempotencyRecord(key: string) {
    return this.repositories.dataCapability.getHttpIdempotencyRecord(key);
  }

  override saveHttpIdempotencyRecord(record: HttpIdempotencyRecord) {
    this.repositories.dataCapability.saveHttpIdempotencyRecord(record);
  }

  override pruneHttpIdempotencyRecords(now: string) {
    this.repositories.dataCapability.pruneHttpIdempotencyRecords(now);
  }

  override getTacticalBoard(clubId: EntityId, eventId: EntityId) {
    return this.repositories.tacticalBoards.get(clubId, eventId);
  }

  override saveTacticalBoard(board: TacticalBoard) {
    return this.repositories.tacticalBoards.save(board);
  }

  override async listClubs() {
    return this.repositories.clubs.list();
  }

  override async getClubConfig(clubId: EntityId) {
    const club = await this.repositories.clubs.getById(clubId);

    return this.getSeedClubConfig(clubId, club);
  }

  override async getClubCapabilities(clubId: EntityId, clientSelector: { clientId?: EntityId; appId?: string; clientKey?: string } = {}) {
    const club = await this.repositories.clubs.getById(clubId);

    if (!club) {
      return null;
    }
    const client = this.resolvePersistentClubAppClient(clubId, clientSelector);
    if ((clientSelector.clientId || clientSelector.appId || clientSelector.clientKey) && !client) {
      return null;
    }

    return buildClubCapabilities(
      club,
      this.getDataCapabilityConfig(clubId),
      this.listExternalSyncRuns(clubId),
      client,
    );
  }

  override getDataCapabilityConfig(clubId: EntityId) {
    const config = this.repositories.dataCapability.getConfig(clubId, {
      featureFlags: this.listFeatureFlags(clubId),
      policies: this.listPolicies(clubId),
      customFields: this.listCustomFields(clubId),
    });

    return {
      ...config,
      externalConnections: config.externalConnections.map(sanitizeExternalConnection),
    };
  }

  override getPrivacyOverview(clubId: EntityId): PrivacyOverview {
    const config = this.getDataCapabilityConfig(clubId);
    return {
      fieldPolicies: config.privacyFieldPolicies,
      noticeVersions: config.privacyNoticeVersions,
      retentionPolicies: config.privacyRetentionPolicies,
    };
  }

  override getStudentPrivacyState(clubId: EntityId, studentId: EntityId) {
    return {
      clubId,
      studentId,
      noticeVersion: this.repositories.dataCapability.listPrivacyNoticeVersions(clubId).find((notice) => notice.active),
      consents: this.repositories.dataCapability.listStudentConsentRecords(clubId, studentId),
      requests: this.repositories.dataCapability.listPrivacyRequests(clubId, studentId),
    };
  }

  override upsertStudentConsent(clubId: EntityId, input: PrivacyConsentUpsertInput, actorUserId?: EntityId): StudentConsentRecord {
    if (!this.repositories.dataCapability.getStudentDetail(clubId, input.studentId)) {
      throw new Error("Student not found for club.");
    }
    const now = new Date().toISOString();
    const existing = this.repositories.dataCapability
      .listStudentConsentRecords(clubId, input.studentId)
      .find((record) => record.scope === input.scope);
    const record: StudentConsentRecord = {
      id: existing?.id ?? `student-consent-${randomUUID()}`,
      clubId,
      studentId: input.studentId,
      scope: input.scope,
      status: input.status,
      noticeVersionId: input.noticeVersionId ?? existing?.noticeVersionId,
      guardianUserId: input.guardianUserId ?? existing?.guardianUserId,
      relationship: input.relationship ?? existing?.relationship,
      source: input.source ?? existing?.source ?? "admin_recorded",
      evidenceRef: input.evidenceRef ?? existing?.evidenceRef,
      grantedAt: input.status === "granted" ? now : existing?.grantedAt,
      withdrawnAt: input.status === "withdrawn" ? now : undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.repositories.dataCapability.saveStudentConsentRecord(record);
    this.recordPrivacyAudit({
      clubId,
      actorUserId,
      actorRole: actorUserId ? "admin" : "system",
      action: "consent_change",
      targetType: "student",
      targetId: input.studentId,
      fieldKeys: [`consent.${input.scope}`],
      dataClasses: ["personal"],
      purpose: input.reason ?? "privacy consent update",
    });
    return record;
  }

  override createPrivacyRequest(clubId: EntityId, input: PrivacyRequestCreateInput, requestedByUserId?: EntityId): PrivacyRequest {
    if (!this.repositories.dataCapability.getStudentDetail(clubId, input.studentId)) {
      throw new Error("Student not found for club.");
    }
    const now = new Date().toISOString();
    const request: PrivacyRequest = {
      id: `privacy-request-${randomUUID()}`,
      clubId,
      studentId: input.studentId,
      requestType: input.requestType,
      status: "open",
      requestedByUserId,
      description: input.description,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.repositories.dataCapability.savePrivacyRequest(request);
    this.recordPrivacyAudit({
      clubId,
      actorUserId: requestedByUserId,
      actorRole: requestedByUserId ? "parent" : "system",
      action: "request_create",
      targetType: "student",
      targetId: input.studentId,
      fieldKeys: [`privacy_request.${input.requestType}`],
      dataClasses: ["personal"],
      purpose: "privacy request created",
    });
    return request;
  }

  override resolvePrivacyRequest(clubId: EntityId, requestId: EntityId, input: PrivacyRequestResolveInput): PrivacyRequest | null {
    const existing = this.repositories.dataCapability.listPrivacyRequests(clubId).find((request) => request.id === requestId);
    if (!existing) {
      return null;
    }
    const now = new Date().toISOString();
    const request: PrivacyRequest = {
      ...existing,
      status: input.status,
      resolvedByUserId: input.resolvedByUserId,
      resolutionNote: input.resolutionNote,
      resolvedAt: input.status === "resolved" || input.status === "rejected" ? now : existing.resolvedAt,
      updatedAt: now,
    };
    this.repositories.dataCapability.savePrivacyRequest(request);
    this.recordPrivacyAudit({
      clubId,
      actorUserId: input.resolvedByUserId,
      actorRole: input.resolvedByUserId ? "admin" : "system",
      action: "request_resolve",
      targetType: "student",
      targetId: request.studentId,
      fieldKeys: [`privacy_request.${request.requestType}`],
      dataClasses: ["personal"],
      purpose: input.resolutionNote ?? "privacy request resolved",
    });
    return request;
  }

  override listPrivacyRequests(clubId: EntityId, studentId?: EntityId) {
    return this.repositories.dataCapability.listPrivacyRequests(clubId, studentId);
  }

  override listPrivacyAuditLogs(clubId: EntityId) {
    return this.repositories.dataCapability.listPrivacyAuditLogs(clubId);
  }

  override recordPrivacyAudit(log: Omit<PrivacyAuditLog, "id" | "createdAt" | "updatedAt">): PrivacyAuditLog {
    const now = new Date().toISOString();
    const entity: PrivacyAuditLog = {
      id: `privacy-audit-${randomUUID()}`,
      ...log,
      createdAt: now,
      updatedAt: now,
    };
    this.repositories.dataCapability.savePrivacyAuditLog(entity);
    return entity;
  }

  override previewPrivacyExport(clubId: EntityId, input: PrivacyExportPreviewInput, role: PrivacyRole): PrivacyExportPreviewResult | null {
    const detail = this.repositories.dataCapability.getStudentDetail(clubId, input.targetId);
    if (!detail) {
      return null;
    }
    return buildPrivacyExportPreview(detail, input, role, this.getDataCapabilityConfig(clubId).privacyFieldPolicies);
  }

  override dryRunPrivacyRetention(clubId: EntityId): PrivacyRetentionDryRunResult {
    const policies = this.getDataCapabilityConfig(clubId).privacyRetentionPolicies;
    return {
      policies,
      candidates: policies.map((policy) => ({
        policyId: policy.id,
        category: policy.category,
        action: policy.action,
        targetType: retentionTargetType(policy.category),
        estimatedCount: estimateRetentionCandidates(this.data, clubId, policy.category),
      })),
    };
  }

  override listClubAppClients(clubId: EntityId) {
    return this.repositories.dataCapability.listClubAppClients(clubId);
  }

  override listAssessmentTemplates(clubId: EntityId) {
    return this.repositories.dataCapability.listAssessmentTemplates(clubId);
  }

  override listAssessmentTestItems(clubId: EntityId) {
    return this.repositories.dataCapability.listAssessmentTestItems(clubId);
  }

  override async resolveAppClientCapabilities(input: { appId?: string; clientKey?: string }) {
    const client = this.repositories.dataCapability.findActiveClubAppClient(input);
    if (!client) {
      return null;
    }
    const capabilities = await this.getClubCapabilities(client.clubId, { clientId: client.id });
    if (!capabilities) {
      return null;
    }

    return { clubId: client.clubId, clientId: client.id, capabilities };
  }

  override listExternalConnections(clubId: EntityId) {
    return this.repositories.dataCapability.listExternalConnections(clubId).map(sanitizeExternalConnection);
  }

  override listExternalSyncPolicies(clubId: EntityId) {
    return this.repositories.dataCapability.listExternalSyncPolicies(clubId);
  }

  override createExternalSyncPolicy(clubId: EntityId, input: CreateExternalSyncPolicyInput) {
    this.ensurePersistentExternalPolicyReferences(clubId, input.connectionId, input.tableMappingId);
    validateExternalSyncPolicyInput(input);
    const now = new Date().toISOString();
    const policy: ExternalSyncPolicy = {
      id: `external-sync-policy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId,
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.repositories.dataCapability.saveExternalSyncPolicy(policy);
    return policy;
  }

  override updateExternalSyncPolicy(
    clubId: EntityId,
    policyId: EntityId,
    input: UpdateExternalSyncPolicyInput,
  ) {
    const existing = this.repositories.dataCapability.getExternalSyncPolicy(clubId, policyId);
    if (!existing) {
      return null;
    }

    this.ensurePersistentExternalPolicyReferences(
      clubId,
      input.connectionId ?? existing.connectionId,
      input.tableMappingId === undefined ? existing.tableMappingId : input.tableMappingId,
    );
    validateExternalSyncPolicyInput({ ...existing, ...input });

    const policy: ExternalSyncPolicy = {
      ...existing,
      ...input,
      clubId,
      id: policyId,
      updatedAt: new Date().toISOString(),
    };
    this.repositories.dataCapability.saveExternalSyncPolicy(policy);
    return policy;
  }

  override async runExternalSyncPolicy(clubId: EntityId, policyId: EntityId): Promise<RunExternalSyncPolicyResult | null> {
    const policy = this.repositories.dataCapability.getExternalSyncPolicy(clubId, policyId);
    if (!policy) {
      return null;
    }

    const config = this.getDataCapabilityConfig(clubId);
    const connection = config.externalConnections.find((item) => item.id === policy.connectionId);
    const tableMapping = config.tableMappings.find((item) =>
      item.connectionId === policy.connectionId
        && item.status === "active"
        && (policy.tableMappingId ? item.id === policy.tableMappingId : true),
    );

    if (policy.status !== "active") {
      throw new Error("Only active sync policies can be run.");
    }
    if (policy.direction !== "inbound") {
      throw new Error("Only inbound sync policies can be run in MVP.");
    }
    if (!connection) {
      throw new Error(`External connection ${policy.connectionId} is not configured for club ${clubId}.`);
    }
    if (connection.provider !== "wps") {
      throw new Error(`Provider ${connection.provider} does not have a sync connector.`);
    }
    if (!tableMapping) {
      throw new Error("No active table mapping is configured for this sync policy.");
    }

    try {
      ensurePersistentWpsSyncReadiness(config, connection, tableMapping);
      const connector = createWpsConnector(connection, {
        credentialResolver: createEnvWpsCredentialResolver(),
      });
      const records = await connector.fetchRows({ clubId, connection, tableMapping });
      const result = this.stageExternalImport(clubId, {
        connectionId: connection.id,
        tableMappingId: tableMapping.id,
        sourceName: `wps:${tableMapping.externalTableKey}`,
        records,
      });

      return { policy, ...result };
    } catch (error) {
      this.saveFailedPersistentSyncRun(policy, error);
      throw error;
    }
  }

  override planDueExternalSyncPolicies(clubId: EntityId, now: string): DueExternalSyncPoliciesResult {
    return {
      clubId,
      now,
      policies: this.repositories.dataCapability
        .listExternalSyncPolicies(clubId)
        .filter((policy) => policy.triggerMode === "scheduled" && policy.status === "active")
        .map((policy) => buildDueExternalSyncPolicy(policy, this.repositories.dataCapability.listSyncRuns(clubId), now)),
    };
  }

  override async runDueExternalSyncPolicies(clubId: EntityId, now: string): Promise<RunDueExternalSyncPoliciesResult> {
    const due = this.planDueExternalSyncPolicies(clubId, now);
    const results: RunDueExternalSyncPoliciesResult["results"] = [];

    for (const item of due.policies) {
      if (!item.due || !item.runnable) {
        results.push({
          policyId: item.policy.id,
          due: item.due,
          runnable: item.runnable,
          status: "skipped",
          error: item.notRunnableReason,
        });
        continue;
      }

      try {
        const result = await this.runExternalSyncPolicy(clubId, item.policy.id);
        results.push({
          policyId: item.policy.id,
          due: true,
          runnable: true,
          status: "completed",
          syncRunId: result?.syncRun.id,
          importedRecords: result?.syncRun.importedRecords,
          failedRecords: result?.syncRun.failedRecords,
        });
      } catch (error) {
        results.push({
          policyId: item.policy.id,
          due: true,
          runnable: true,
          status: "failed",
          error: error instanceof Error ? error.message : "Due sync failed",
        });
      }
    }

    return { clubId, now, results };
  }

  override async ingestWpsWebhook(clubId: EntityId, input: WpsWebhookIngestionInput): Promise<WpsWebhookIngestionResult> {
    const config = this.getDataCapabilityConfig(clubId);
    const connection = config.externalConnections.find((item) =>
      item.id === input.connectionId && item.provider === "wps" && item.status === "active",
    );
    const tableMapping = config.tableMappings.find((item) =>
      item.id === input.tableMappingId && item.connectionId === input.connectionId && item.status === "active",
    );
    const policy = config.syncPolicies.find((item) =>
      item.connectionId === input.connectionId
        && item.status === "active"
        && item.direction === "inbound"
        && (input.policyId ? item.id === input.policyId : true)
        && (item.tableMappingId ? item.tableMappingId === input.tableMappingId : true),
    );

    if (!connection) {
      throw new Error(`Active WPS connection ${input.connectionId} is not configured for club ${clubId}.`);
    }
    if (!tableMapping) {
      throw new Error(`Active WPS table mapping ${input.tableMappingId} is not configured for club ${clubId}.`);
    }
    if (!policy) {
      throw new Error("No active inbound sync policy matches this WPS webhook.");
    }
    await verifyWpsWebhookSecurity({
      config: parseWpsWebhookSecurityConfig(connection.config),
      envelope: input.security,
      payload: webhookSignedPayload(input),
      secretResolver: createEnvWpsSecretResolver(),
      replayGuard: this.wpsWebhookReplayGuard,
    });

    const now = input.occurredAt ?? new Date().toISOString();
    const syncRun: ExternalSyncRun = {
      id: input.eventId ? `external-sync-run-wps-webhook-${input.eventId}` : `external-sync-run-wps-webhook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId,
      connectionId: connection.id,
      tableMappingId: tableMapping.id,
      status: "queued",
      totalRecords: 0,
      importedRecords: 0,
      failedRecords: 0,
      error: {
        eventType: input.eventType,
        eventId: input.eventId,
        payload: input.payload,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.repositories.dataCapability.saveExternalSyncRun(syncRun);
    return { status: "queued", matchedPolicy: policy, syncRun };
  }

  override getImportPreview(clubId: EntityId, filters: ImportPreviewFilters = {}) {
    return this.repositories.dataCapability.getImportPreview(clubId, filters);
  }

  override listExternalSyncRuns(clubId: EntityId) {
    return this.repositories.dataCapability.listSyncRuns(clubId);
  }

  override getExternalSyncRunDetail(clubId: EntityId, syncRunId: EntityId) {
    return this.repositories.dataCapability.getSyncRunDetail(clubId, syncRunId);
  }

  override listOperationalStudents(clubId: EntityId, filters: StudentListFilters = {}) {
    return this.repositories.dataCapability.listStudents(clubId, filters);
  }

  override getOperationalStudentDetail(clubId: EntityId, studentId: EntityId) {
    return this.repositories.dataCapability.getStudentDetail(clubId, studentId);
  }

  override getStudentOperationalStatusSummary(clubId: EntityId, studentId: EntityId) {
    return this.repositories.dataCapability.getStudentOperationalStatusSummary(clubId, studentId);
  }

  override getLessonLedger(clubId: EntityId, studentId: EntityId) {
    return this.repositories.dataCapability.getLessonLedger(clubId, studentId);
  }

  override recordLessonAdjustment(clubId: EntityId, studentId: EntityId, input: LessonAdjustmentInput) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const id = input.sourceId ? `lesson-ledger-${input.entryType}-${input.sourceId}` : `lesson-ledger-${input.entryType}-${suffix}`;
    const paymentEventId = input.entryType === "credit" ? `payment-event-${suffix}` : undefined;

    return this.repositories.dataCapability.recordLessonAdjustment(clubId, studentId, input, {
      id,
      paymentEventId,
      now: new Date().toISOString(),
    });
  }

  override listInsurancePolicies(clubId: EntityId, studentId: EntityId) {
    return this.repositories.dataCapability.listInsurancePolicies(clubId, studentId);
  }

  override createInsurancePolicy(clubId: EntityId, studentId: EntityId, input: InsurancePolicyInput) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return this.repositories.dataCapability.createInsurancePolicy(clubId, studentId, input, {
      id: `insurance-policy-${suffix}`,
      now: new Date().toISOString(),
    });
  }

  override stageExternalImport(clubId: EntityId, input: StageExternalImportInput): StageExternalImportResult {
    const config = this.getDataCapabilityConfig(clubId);
    const connection = config.externalConnections.find((item) => item.id === input.connectionId);
    const tableMapping = config.tableMappings.find((item) =>
      item.id === input.tableMappingId && item.connectionId === input.connectionId,
    );

    if (!connection) {
      throw new Error(`External connection ${input.connectionId} is not configured for club ${clubId}.`);
    }

    if (!tableMapping) {
      throw new Error(`External table mapping ${input.tableMappingId} is not configured for club ${clubId}.`);
    }

    const now = new Date().toISOString();
    const syncRun: ExternalSyncRun = {
      id: `external-sync-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId,
      connectionId: connection.id,
      tableMappingId: tableMapping.id,
      status: "completed",
      startedAt: now,
      finishedAt: now,
      totalRecords: input.records.length,
      importedRecords: 0,
      failedRecords: 0,
      createdAt: now,
      updatedAt: now,
    };
    const existingRecords = this.repositories.dataCapability.getImportPreview(clubId, {
      connectionId: input.connectionId,
      tableMappingId: input.tableMappingId,
    }).records;
    const fieldMappings = config.fieldMappings.filter((item) => item.tableMappingId === input.tableMappingId);
    const records = input.records.map((record) => {
      const id = buildStagedRawRecordId(tableMapping.externalTableKey, record.rowHash);
      const existing = existingRecords.find((item) => item.id === id);
      const { normalizedPreview, validationErrors } = normalizeExternalRawRecord(record.raw, fieldMappings);

      return {
        id,
        clubId,
        connectionId: input.connectionId,
        tableMappingId: input.tableMappingId,
        syncRunId: syncRun.id,
        externalRecordId: record.externalRecordId ?? `${input.sourceName ?? tableMapping.externalTableKey}:row-${record.rowNumber}`,
        payload: record.raw,
        payloadHash: record.rowHash,
        reviewStatus: existing?.reviewStatus ?? "pending",
        validationErrors,
        normalizedPreview,
        importedAt: now,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      } satisfies ExternalRawRecord;
    });

    syncRun.failedRecords = records.filter((record) => record.validationErrors?.length).length;

    this.repositories.dataCapability.saveExternalSyncRun(syncRun);
    for (const record of records) {
      this.repositories.dataCapability.saveExternalRawRecord(record);
    }

    return { syncRun, records };
  }

  override confirmExternalRecord(
    clubId: EntityId,
    rawRecordId: EntityId,
    input: ConfirmExternalRecordInput,
  ) {
    const now = new Date().toISOString();

    return this.repositories.dataCapability.confirmExternalRecord(clubId, rawRecordId, input, {
      linkId: `external-record-link-${Date.now()}`,
      now,
    });
  }

  private ensurePersistentExternalPolicyReferences(clubId: EntityId, connectionId: EntityId, tableMappingId?: EntityId): void {
    const config = this.getDataCapabilityConfig(clubId);
    const connection = config.externalConnections.find((item) => item.id === connectionId);

    if (!connection) {
      throw new Error(`External connection ${connectionId} is not configured for club ${clubId}.`);
    }

    if (!tableMappingId) {
      return;
    }

    const tableMapping = config.tableMappings.find((item) =>
      item.id === tableMappingId && item.connectionId === connectionId,
    );
    if (!tableMapping) {
      throw new Error(`External table mapping ${tableMappingId} is not configured for club ${clubId}.`);
    }
  }

  private resolvePersistentClubAppClient(clubId: EntityId, selector: { clientId?: EntityId; appId?: string; clientKey?: string }): ClubAppClient | undefined {
    if (!selector.clientId && !selector.appId && !selector.clientKey) {
      return undefined;
    }

    return this.repositories.dataCapability.listClubAppClients(clubId).find((item) =>
      item.status === "active"
      && (selector.clientId ? item.id === selector.clientId : true)
      && (selector.appId ? item.appId === selector.appId : true)
      && (selector.clientKey ? item.clientKey === selector.clientKey : true),
    );
  }

  private saveFailedPersistentSyncRun(policy: ExternalSyncPolicy, error: unknown): void {
    const now = new Date().toISOString();
    this.repositories.dataCapability.saveExternalSyncRun({
      id: `external-sync-run-failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: policy.clubId,
      connectionId: policy.connectionId,
      tableMappingId: policy.tableMappingId,
      status: "failed",
      startedAt: now,
      finishedAt: now,
      totalRecords: 0,
      importedRecords: 0,
      failedRecords: 0,
      error: {
        code: "wps_sync_failed",
        message: error instanceof Error ? error.message : "WPS sync failed",
      },
      createdAt: now,
      updatedAt: now,
    });
  }
}

function ensurePersistentWpsSyncReadiness(
  config: DataCapabilityConfig,
  connection: ExternalSystemConnection,
  tableMapping: ExternalTableMapping,
) {
  if (connection.status !== "active") {
    throw new Error("WPS connection must be active before running sync.");
  }
  if (parseWpsConnectionConfig(connection.config).mode === "http") {
    const fieldMappings = config.fieldMappings.filter((item) => item.tableMappingId === tableMapping.id);
    if (!fieldMappings.length) {
      throw new Error("WPS HTTP sync requires field mappings for schema validation.");
    }
  }
}

function validateExternalSyncPolicyInput(input: {
  triggerMode: ExternalSyncPolicy["triggerMode"];
  schedule?: Record<string, unknown>;
}): void {
  if (input.triggerMode === "manual") {
    if (input.schedule !== undefined) {
      throw new Error("Manual sync policies must not define a schedule.");
    }
    return;
  }

  parseExternalSyncSchedule(input.schedule);
}

function buildPrivacyExportPreview(
  detail: StudentDetail,
  input: PrivacyExportPreviewInput,
  role: PrivacyRole,
  policies: PrivacyFieldPolicy[],
): PrivacyExportPreviewResult {
  const data = flattenStudentPrivacyData(detail);
  const policyByKey = new Map(policies.map((policy) => [policy.fieldKey, policy]));
  const allowedFieldKeys: string[] = [];
  const deniedFieldKeys: string[] = [];
  const redactedFieldKeys: string[] = [];
  const output: Record<string, unknown> = {};

  for (const fieldKey of input.fieldKeys) {
    const policy = policyByKey.get(fieldKey);
    if (!policy || !policy.exportable || !policy.visibleToRoles.includes(role)) {
      deniedFieldKeys.push(fieldKey);
      continue;
    }

    allowedFieldKeys.push(fieldKey);
    const value = data[fieldKey];
    output[fieldKey] = policy.redactionMode === "none" ? value : redactValue(value, policy.redactionMode);
    if (policy.redactionMode !== "none") {
      redactedFieldKeys.push(fieldKey);
    }
  }

  return {
    targetType: "student",
    targetId: input.targetId,
    purpose: input.purpose,
    allowedFieldKeys,
    deniedFieldKeys,
    redactedFieldKeys,
    data: output,
  };
}

function webhookSignedPayload(input: WpsWebhookIngestionInput): Record<string, unknown> {
  return {
    eventId: input.eventId,
    eventType: input.eventType,
    connectionId: input.connectionId,
    tableMappingId: input.tableMappingId,
    policyId: input.policyId,
    occurredAt: input.occurredAt,
    payload: input.payload,
  };
}

function flattenStudentPrivacyData(detail: StudentDetail): Record<string, unknown> {
  return {
    "student.name": detail.name,
    "student.birthDate": detail.birthDate,
    "student.currentLevel": detail.currentLevel,
    "student.school": fieldValue(detail.operationalProfile, "schoolName") ?? fieldValue(detail.operationalProfile, "school"),
    "student.identityNumber": fieldValue(detail.operationalProfile, "idDocumentHash") ?? fieldValue(detail.operationalProfile, "externalRef"),
    "contact.phone": fieldValue(detail.primaryContact, "phone"),
    "contact.wechat": fieldValue(detail.primaryContact, "wechat"),
    "guardian.relationship": fieldValue(detail.primaryContact, "relationship"),
    "insurance.status": detail.insuranceStatus,
    "insurance.policyNumber": fieldValue(detail.insuranceStatus, "policyNumber"),
    "lesson.balance": detail.lessonBalance,
    "attendance.snapshot": detail.attendanceSnapshot,
    "assessment.metrics": "available_via_metric_records",
    "training.observation": "available_via_training_records",
    "match.stats": "available_via_match_records",
  };
}

function fieldValue(record: Record<string, unknown> | undefined, key: string): unknown {
  return record ? record[key] : undefined;
}

function redactValue(value: unknown, mode: PrivacyFieldPolicy["redactionMode"]): unknown {
  if (mode === "hide") {
    return undefined;
  }
  if (mode === "summary_only") {
    return value === undefined || value === null ? value : "[summary_only]";
  }
  if (mode === "mask") {
    if (typeof value === "string") {
      return value.length <= 2 ? "*".repeat(value.length) : `${value.slice(0, 1)}***${value.slice(-1)}`;
    }
    return value === undefined || value === null ? value : "[redacted]";
  }
  return value;
}

function retentionTargetType(category: string): string {
  if (category.includes("external")) {
    return "external_raw_record";
  }
  if (category.includes("contact")) {
    return "student_contact";
  }
  if (category.includes("assessment")) {
    return "assessment";
  }
  if (category.includes("attendance")) {
    return "attendance";
  }
  return "student";
}

function estimateRetentionCandidates(data: SeedData, clubId: EntityId, category: string): number {
  if (category === "external_raw_record") {
    return data.externalRawRecords.filter((record) => record.clubId === clubId).length;
  }
  if (category === "guardian_contact") {
    return data.students.filter((student) => student.clubId === clubId).length;
  }
  if (category === "assessment") {
    return data.playerAssessments.filter((assessment) => assessment.clubId === clubId).length;
  }
  if (category === "attendance") {
    return data.participants.filter((participant) => participant.clubId === clubId).length;
  }
  return data.students.filter((student) => student.clubId === clubId).length;
}

function parseExternalSyncSchedule(schedule: Record<string, unknown> | undefined): ExternalSyncSchedule {
  if (!schedule) {
    throw new Error("Scheduled sync policies require a schedule.");
  }

  if (schedule.kind === "interval_minutes") {
    const intervalMinutes = schedule.intervalMinutes;
    if (typeof intervalMinutes !== "number" || !Number.isInteger(intervalMinutes) || intervalMinutes <= 0) {
      throw new Error("interval_minutes schedule requires a positive integer intervalMinutes.");
    }

    return { kind: "interval_minutes", intervalMinutes };
  }

  if (schedule.kind === "daily_time") {
    const time = schedule.time;
    const timezone = schedule.timezone;
    if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
      throw new Error("daily_time schedule requires time in HH:mm format.");
    }
    if (timezone !== undefined && typeof timezone !== "string") {
      throw new Error("daily_time schedule timezone must be a string.");
    }

    return { kind: "daily_time", time, timezone };
  }

  throw new Error("Sync schedule kind must be interval_minutes or daily_time.");
}

function buildDueExternalSyncPolicy(policy: ExternalSyncPolicy, syncRuns: ExternalSyncRun[], now: string) {
  const lastRunAt = syncRuns
    .filter((run) =>
      run.clubId === policy.clubId
      && run.connectionId === policy.connectionId
      && (policy.tableMappingId ? run.tableMappingId === policy.tableMappingId : true)
      && run.status !== "queued",
    )
    .map((run) => run.finishedAt ?? run.startedAt ?? run.createdAt)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  const schedule = parseExternalSyncSchedule(policy.schedule);
  const nextRunAt = schedule.kind === "interval_minutes"
    ? (lastRunAt ? new Date(Date.parse(lastRunAt) + schedule.intervalMinutes * 60_000).toISOString() : now)
    : nextDailyRunAt(schedule, lastRunAt, now);
  const runnable = policy.direction === "inbound";

  return {
    policy,
    lastRunAt,
    nextRunAt,
    due: Date.parse(nextRunAt) <= Date.parse(now),
    runnable,
    notRunnableReason: runnable ? undefined : "Only inbound sync policies can be run in MVP.",
  };
}

function nextDailyRunAt(schedule: Extract<ExternalSyncSchedule, { kind: "daily_time" }>, lastRunAt: string | undefined, now: string): string {
  const nowDate = new Date(now);
  const [hours, minutes] = schedule.time.split(":").map((part) => Number(part));
  const candidate = new Date(nowDate);
  candidate.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0);

  if (lastRunAt && Date.parse(lastRunAt) >= candidate.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  return candidate.toISOString();
}

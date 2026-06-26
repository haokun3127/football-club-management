import {
  createAssessmentService,
  createMatchService,
  createMetricService,
  isCatalogVisibleToClub,
  type AssessmentMetricBinding,
  type AssessmentScore,
  type AssessmentTemplate,
  type AssessmentTemplateVersion,
  type CalendarEvent,
  type Club,
  type ClubFeatureFlag,
  type ClubPolicy,
  type CoachProfile,
  type CustomFieldDefinition,
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
  type OtherActivity,
  type PlayerAssessment,
  type PlayerMetricRecord,
  type RecordAssessmentInput,
  type RecordMatchInput,
  type SessionDelivery,
  type SessionObservation,
  type StudentProfile,
  type Team,
  type TeamMember,
  type TrainingSession,
} from "@football-club/domain";
import type {
  ClubCapabilities,
  ConfirmExternalRecordInput,
  DataCapabilityConfig,
  ExternalFieldMapping,
  ExternalRawRecord,
  ExternalRecordLink,
  ExternalSyncRun,
  ImportPreview,
  ImportPreviewFilters,
  StageExternalImportInput,
  StageExternalImportResult,
} from "./data-capability/types.js";
import { createApiServices } from "./application/services.js";
import type { PlatformRepositories } from "./persistence/platform-persistence.js";
import { createSeedData, type SeedData } from "./seed.js";

export interface ApiStore {
  getHealth(): { status: "ok"; service: "@football-club/api" };
  listClubs(): Club[] | Promise<Club[]>;
  getClubById(clubId: EntityId): Club | null;
  getClubConfig(clubId: EntityId): unknown | null | Promise<unknown | null>;
  getClubCapabilities(clubId: EntityId): ClubCapabilities | null | Promise<ClubCapabilities | null>;
  getDataCapabilityConfig(clubId: EntityId): DataCapabilityConfig | Promise<DataCapabilityConfig>;
  getImportPreview(clubId: EntityId, filters?: ImportPreviewFilters): ImportPreview | Promise<ImportPreview>;
  stageExternalImport(clubId: EntityId, input: StageExternalImportInput): StageExternalImportResult | Promise<StageExternalImportResult>;
  listExternalSyncRuns(clubId: EntityId): ExternalSyncRun[] | Promise<ExternalSyncRun[]>;
  confirmExternalRecord(
    clubId: EntityId,
    rawRecordId: EntityId,
    input: ConfirmExternalRecordInput,
  ): ExternalRecordLink | null | Promise<ExternalRecordLink | null>;
  isGuardianOfStudent(clubId: EntityId, userId: EntityId, studentId: EntityId): boolean;
  listCalendarEvents(clubId: EntityId): unknown[];
  getStudentTimeline(clubId: EntityId, studentId: EntityId): unknown[];
  listAbilityMetrics(clubId: EntityId): unknown[];
  listMetricGraphVersions(clubId: EntityId): MetricGraphVersion[];
  listMetricDependencies(clubId: EntityId): MetricDependency[];
  listMetricViews(clubId: EntityId): MetricView[];
  listMetricViewNodes(clubId: EntityId): MetricViewNode[];
  getStudentMetrics(clubId: EntityId, studentId: EntityId, source?: MetricSourceKind | MetricSourceKind[]): PlayerMetricRecord[];
  computeAttackingContribution(clubId: EntityId, studentId: EntityId): Promise<DerivedMetricResult>;
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
  recordMatchSummary(input: RecordMatchInput): Promise<{
    match: Match;
    rosters: MatchRoster[];
    events: MatchEvent[];
    notes: MatchPlayerNote[];
    metricRecords: PlayerMetricRecord[];
  }>;
  recordAssessment(input: RecordAssessmentInput): Promise<{
    assessment: PlayerAssessment;
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
): ClubCapabilities {
  return {
    club: {
      id: club.id,
      code: club.code,
      name: club.name,
      timezone: club.timezone,
      locale: club.locale,
    },
    features: Object.fromEntries(config.featureFlags.map((flag) => [flag.feature, flag.enabled])),
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
      tableMappings: config.tableMappings,
      fieldMappings: config.fieldMappings,
      latestSyncRuns: latestSyncRuns.slice(0, 10),
    },
  };
}

export abstract class SeedBackedStore implements ApiStore {
  protected readonly data: SeedData;
  private readonly counters = new Map<string, number>();

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

  getClubCapabilities(clubId: EntityId): ReturnType<ApiStore["getClubCapabilities"]> {
    const club = this.getClubById(clubId);
    if (!club) {
      return null;
    }

    return buildClubCapabilities(
      club,
      this.getDataCapabilityConfig(clubId),
      this.listExternalSyncRuns(clubId),
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

  listDevelopmentDimensions(clubId: EntityId) {
    return this.data.dimensions.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listTrainingObjectives(clubId: EntityId) {
    return this.data.objectives.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listTrainingDrills(clubId: EntityId) {
    return this.data.drills.filter((item) => isCatalogVisibleToClub(item, clubId));
  }

  listAbilityMetrics(clubId: EntityId) {
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
      metricGraphVersions: this.listMetricGraphVersions(clubId),
      metricDependencies: this.listMetricDependencies(clubId),
      metricViews: this.listMetricViews(clubId),
      metricViewNodes: this.listMetricViewNodes(clubId),
      assessmentTemplateVersions: this.data.assessmentTemplateVersions.filter((item) => item.clubId === clubId),
      assessmentMetricBindings: this.data.assessmentMetricBindings.filter((item) => item.clubId === clubId),
      externalConnections: this.data.externalConnections.filter((item) => item.clubId === clubId),
      tableMappings: this.data.externalTableMappings.filter((item) => item.clubId === clubId),
      fieldMappings: this.data.externalFieldMappings.filter((item) => item.clubId === clubId),
    };
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
        externalRecordId: `${input.sourceName ?? tableMapping.externalTableKey}:row-${record.rowNumber}`,
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

  confirmExternalRecord(
    clubId: EntityId,
    rawRecordId: EntityId,
    input: ConfirmExternalRecordInput,
  ): ExternalRecordLink | null {
    const rawRecord = this.data.externalRawRecords.find((item) => item.clubId === clubId && item.id === rawRecordId);

    if (!rawRecord) {
      return null;
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
    return this.activityServices.recordEventParticipants(clubId, eventId, participants);
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
        listAbilityMetrics: (clubId) => this.listAbilityMetrics(clubId),
        listDerivedMetricDefinitions: (clubId) => this.listDerivedMetricDefinitions(clubId),
      },
      store: {
        saveAssessment: async (assessment) => {
          upsertById(this.data.playerAssessments, assessment);
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

  override async listClubs() {
    return this.repositories.clubs.list();
  }

  override async getClubConfig(clubId: EntityId) {
    const club = await this.repositories.clubs.getById(clubId);

    return this.getSeedClubConfig(clubId, club);
  }

  override async getClubCapabilities(clubId: EntityId) {
    const club = await this.repositories.clubs.getById(clubId);

    if (!club) {
      return null;
    }

    return buildClubCapabilities(
      club,
      this.getDataCapabilityConfig(clubId),
      this.listExternalSyncRuns(clubId),
    );
  }

  override getDataCapabilityConfig(clubId: EntityId) {
    return this.repositories.dataCapability.getConfig(clubId, {
      featureFlags: this.listFeatureFlags(clubId),
      policies: this.listPolicies(clubId),
      customFields: this.listCustomFields(clubId),
    });
  }

  override getImportPreview(clubId: EntityId, filters: ImportPreviewFilters = {}) {
    return this.repositories.dataCapability.getImportPreview(clubId, filters);
  }

  override listExternalSyncRuns(clubId: EntityId) {
    return this.repositories.dataCapability.listSyncRuns(clubId);
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
      id: `external-sync-run-${Date.now()}`,
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
        externalRecordId: `${input.sourceName ?? tableMapping.externalTableKey}:row-${record.rowNumber}`,
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
}

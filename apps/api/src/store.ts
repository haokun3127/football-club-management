import {
  createAssessmentService,
  createMatchService,
  createMetricService,
  isCatalogVisibleToClub,
  type AssessmentMetricBinding,
  type AssessmentScore,
  type AssessmentTemplate,
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
import { createApiServices } from "./application/services.js";
import type { PlatformRepositories } from "./persistence/platform-persistence.js";
import { createSeedData, type SeedData } from "./seed.js";

export interface ApiStore {
  getHealth(): { status: "ok"; service: "@football-club/api" };
  listClubs(): Club[] | Promise<Club[]>;
  getClubById(clubId: EntityId): Club | null;
  getClubConfig(clubId: EntityId): unknown | null | Promise<unknown | null>;
  listCalendarEvents(clubId: EntityId): unknown[];
  getStudentTimeline(clubId: EntityId, studentId: EntityId): unknown[];
  listAbilityMetrics(clubId: EntityId): unknown[];
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

  listFeatureFlags(clubId: EntityId): ClubFeatureFlag[] {
    return this.data.featureFlags.filter((item) => item.clubId === clubId);
  }

  listPolicies(clubId: EntityId): ClubPolicy[] {
    return this.data.policies.filter((item) => item.clubId === clubId && item.active);
  }

  listCustomFields(clubId: EntityId): CustomFieldDefinition[] {
    return this.data.customFields.filter((item) => item.clubId === clubId && item.active);
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

  recordMatchSummary(input: RecordMatchInput) {
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
    const service = createAssessmentService({
      clock: this.clock,
      ids: this.ids,
      catalog: {
        findTemplateById: this.findTemplateById,
        listTemplateMetricBindings: this.listTemplateMetricBindings,
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
}

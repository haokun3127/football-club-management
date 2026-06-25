import type {
  AbilityMetric,
  CalendarEvent,
  Club,
  ClubFeatureFlag,
  ClubPolicy,
  CustomFieldDefinition,
  DevelopmentDimension,
  DerivedMetricDefinition,
  EventParticipant,
  Match,
  OtherActivity,
  PlayerMetricRecord,
  SessionDelivery,
  SessionObservation,
  SessionPlan,
  Team,
  TeamMember,
  TrainingDrill,
  TrainingObjective,
  TrainingSession,
  CoachProfile,
  StudentProfile,
} from "@football-club/domain";
import type { EntityId, ISODateTimeString } from "@football-club/domain";

type MaybePromise<T> = T | Promise<T>;

export interface ApiStore {
  listClubs(): MaybePromise<Club[]>;
  getClubById(clubId: EntityId): Club | null;
  listFeatureFlags(clubId: EntityId): ClubFeatureFlag[];
  listPolicies(clubId: EntityId): ClubPolicy[];
  listCustomFields(clubId: EntityId): CustomFieldDefinition[];

  listTeams(clubId: EntityId): Team[];
  getTeam(teamId: EntityId): Team | null;
  saveTeam(team: Team): Team;

  listTeamMembers(clubId: EntityId): TeamMember[];
  getTeamMember(teamMemberId: EntityId): TeamMember | null;
  saveTeamMember(teamMember: TeamMember): TeamMember;

  listCalendarEvents(clubId: EntityId): CalendarEvent[];
  getCalendarEvent(eventId: EntityId): CalendarEvent | null;
  saveCalendarEvent(event: CalendarEvent): CalendarEvent;

  listEventParticipants(clubId: EntityId): EventParticipant[];
  getEventParticipant(eventParticipantId: EntityId): EventParticipant | null;
  saveEventParticipant(eventParticipant: EventParticipant): EventParticipant;

  listTrainingSessions(clubId: EntityId): TrainingSession[];
  getTrainingSession(trainingSessionId: EntityId): TrainingSession | null;
  saveTrainingSession(trainingSession: TrainingSession): TrainingSession;

  listSessionDeliveries(clubId: EntityId): SessionDelivery[];
  saveSessionDelivery(sessionDelivery: SessionDelivery): SessionDelivery;

  listSessionObservations(clubId: EntityId): SessionObservation[];
  saveSessionObservation(sessionObservation: SessionObservation): SessionObservation;

  listOtherActivities(clubId: EntityId): OtherActivity[];
  saveOtherActivity(otherActivity: OtherActivity): OtherActivity;

  listSessionPlans(clubId: EntityId): SessionPlan[];
  getSessionPlan(sessionPlanId: EntityId): SessionPlan | null;

  listDevelopmentDimensions(clubId: EntityId): DevelopmentDimension[];
  listTrainingObjectives(clubId: EntityId): TrainingObjective[];
  listTrainingDrills(clubId: EntityId): TrainingDrill[];
  listAbilityMetrics(clubId: EntityId): AbilityMetric[];
  listDerivedMetricDefinitions(clubId: EntityId): DerivedMetricDefinition[];

  listCoaches(clubId: EntityId): CoachProfile[];
  listStudents(clubId: EntityId): StudentProfile[];
  listMatches(clubId: EntityId): Match[];
  saveMatch(match: Match): Match;
  listMetricRecords(clubId: EntityId): PlayerMetricRecord[];
}

export interface TimeSource {
  now(): ISODateTimeString;
}

export interface IdSource {
  next(prefix?: string): EntityId;
}

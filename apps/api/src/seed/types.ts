import type {
  AbilityMetric,
  AssessmentScore,
  AssessmentTemplate,
  CalendarEvent,
  Club,
  ClubFeatureFlag,
  ClubPolicy,
  ClubUserMembership,
  CoachProfile,
  CustomFieldDefinition,
  DevelopmentDimension,
  DerivedMetricDefinition,
  EventParticipant,
  Match,
  MatchEvent,
  MatchPlayerNote,
  MatchRoster,
  MetricLineage,
  OtherActivity,
  ParentProfile,
  PlayerAssessment,
  PlayerMetricRecord,
  SessionDelivery,
  SessionObservation,
  SessionPlan,
  StudentGuardianBinding,
  StudentProfile,
  Team,
  TeamMember,
  TrainingDrill,
  TrainingObjective,
  TrainingSession,
  UserAccount,
} from "@football-club/domain";

export const seedNow = "2026-06-25T00:00:00.000Z";
export const demoClubId = "club-demo";
export const systemCatalog = { scope: "system" } as const;
export const clubCatalog = { scope: "club", clubId: demoClubId } as const;

export interface SeedData {
  clubs: Club[];
  clubMemberships: ClubUserMembership[];
  featureFlags: ClubFeatureFlag[];
  policies: ClubPolicy[];
  customFields: CustomFieldDefinition[];
  users: UserAccount[];
  parents: ParentProfile[];
  students: StudentProfile[];
  guardianBindings: StudentGuardianBinding[];
  coaches: CoachProfile[];
  teams: Team[];
  teamMembers: TeamMember[];
  dimensions: DevelopmentDimension[];
  objectives: TrainingObjective[];
  metrics: AbilityMetric[];
  assessmentTemplates: AssessmentTemplate[];
  playerAssessments: PlayerAssessment[];
  assessmentScores: AssessmentScore[];
  drills: TrainingDrill[];
  sessionPlans: SessionPlan[];
  events: CalendarEvent[];
  participants: EventParticipant[];
  trainingSessions: TrainingSession[];
  sessionDeliveries: SessionDelivery[];
  sessionObservations: SessionObservation[];
  otherActivities: OtherActivity[];
  matches: Match[];
  matchRosters: MatchRoster[];
  matchEvents: MatchEvent[];
  matchPlayerNotes: MatchPlayerNote[];
  metricRecords: PlayerMetricRecord[];
  metricLineages: MetricLineage[];
  derivedMetricDefinitions: DerivedMetricDefinition[];
}

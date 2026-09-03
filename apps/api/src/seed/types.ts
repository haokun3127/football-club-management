import type {
  AbilityMetric,
  AssessmentMetricBinding,
  AssessmentRawResult,
  AssessmentScore,
  AssessmentTemplate,
  AssessmentTemplateVersion,
  AssessmentTestItem,
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
  MetricDependency,
  MetricGraphVersion,
  MetricView,
  MetricViewNode,
  OtherActivity,
  ParentProfile,
  PlayerAssessment,
  PlayerMetricRecord,
  PrivacyFieldPolicy,
  PrivacyNoticeVersion,
  PrivacyRetentionPolicy,
  StudentConsentRecord,
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
import type {
  ClubAppClient,
  ExternalFieldMapping,
  ExternalRawRecord,
  ExternalRecordLink,
  ExternalSyncRun,
  ExternalSyncPolicy,
  ExternalSystemConnection,
  ExternalTableMapping,
  InsurancePolicy,
  PrivateLessonRequest,
  EventChangeRequest,
  AssessmentTask,
  TrainingContentAssessment,
  ContentArticle,
  ContentFaq,
  VenueInfo,
  LessonLedgerEntry,
} from "../data-capability/types.js";

export const seedNow = "2026-06-25T00:00:00.000Z";
export const chongqingTalentClubId = "club-chongqing-talent";
export const systemCatalog = { scope: "system" } as const;
export const clubCatalog = { scope: "club", clubId: chongqingTalentClubId } as const;

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
  assessmentTemplateVersions: AssessmentTemplateVersion[];
  assessmentMetricBindings: AssessmentMetricBinding[];
  assessmentTestItems: AssessmentTestItem[];
  playerAssessments: PlayerAssessment[];
  assessmentRawResults: AssessmentRawResult[];
  assessmentScores: AssessmentScore[];
  metricGraphVersions: MetricGraphVersion[];
  metricDependencies: MetricDependency[];
  metricViews: MetricView[];
  metricViewNodes: MetricViewNode[];
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
  externalConnections: ExternalSystemConnection[];
  appClients: ClubAppClient[];
  externalTableMappings: ExternalTableMapping[];
  externalFieldMappings: ExternalFieldMapping[];
  externalSyncPolicies: ExternalSyncPolicy[];
  externalSyncRuns: ExternalSyncRun[];
  externalRawRecords: ExternalRawRecord[];
  externalRecordLinks: ExternalRecordLink[];
  lessonLedger: LessonLedgerEntry[];
  insurancePolicies: InsurancePolicy[];
  privateLessonRequests: PrivateLessonRequest[];
  eventChangeRequests: EventChangeRequest[];
  assessmentTasks: AssessmentTask[];
  trainingContentAssessments: TrainingContentAssessment[];
  contentArticles: ContentArticle[];
  contentFaqs: ContentFaq[];
  venues: VenueInfo[];
  privacyFieldPolicies: PrivacyFieldPolicy[];
  privacyNoticeVersions: PrivacyNoticeVersion[];
  privacyRetentionPolicies: PrivacyRetentionPolicy[];
  studentConsentRecords: StudentConsentRecord[];
}

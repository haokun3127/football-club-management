import type {
  AbilityMetric,
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
  MatchRoster,
  ParentProfile,
  PlayerMetricRecord,
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

const now = "2026-06-25T00:00:00.000Z";
const clubId = "club-demo";
const systemCatalog = { scope: "system" } as const;
const clubCatalog = { scope: "club", clubId } as const;

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
  drills: TrainingDrill[];
  sessionPlans: SessionPlan[];
  events: CalendarEvent[];
  participants: EventParticipant[];
  trainingSessions: TrainingSession[];
  matches: Match[];
  matchRosters: MatchRoster[];
  matchEvents: MatchEvent[];
  metricRecords: PlayerMetricRecord[];
  derivedMetricDefinitions: DerivedMetricDefinition[];
}

export function createSeedData(): SeedData {
  return {
    clubs: [
      {
        id: clubId,
        name: "Demo Football Academy",
        code: "demo",
        timezone: "Asia/Hong_Kong",
        locale: "zh-CN",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    users: [
      {
        id: "user-coach-1",
        displayName: "Coach Chen",
        roles: ["coach"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-parent-1",
        displayName: "Parent Li",
        roles: ["parent"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    clubMemberships: [
      {
        id: "club-member-coach-1",
        clubId,
        userId: "user-coach-1",
        roles: ["coach"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "club-member-parent-1",
        clubId,
        userId: "user-parent-1",
        roles: ["parent"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    featureFlags: [
      {
        id: "feature-matches",
        clubId,
        feature: "matches",
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "feature-private-lessons",
        clubId,
        feature: "private_lessons",
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    policies: [
      {
        id: "policy-match-event-types",
        clubId,
        key: "match_event_types",
        value: ["goal", "assist", "save", "tackle"],
        version: "1.0.0",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    customFields: [
      {
        id: "custom-student-school",
        clubId,
        target: "student",
        key: "school",
        label: "School",
        valueKind: "text",
        required: false,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    parents: [
      {
        id: "parent-1",
        clubId,
        userId: "user-parent-1",
        name: "Li Parent",
        phone: "13800000000",
        createdAt: now,
        updatedAt: now,
      },
    ],
    students: [
      {
        id: "student-1",
        clubId,
        name: "Li Ming",
        birthDate: "2015-05-01",
        gender: "male",
        dominantFoot: "right",
        currentLevel: "U10 development",
        createdAt: now,
        updatedAt: now,
      },
    ],
    guardianBindings: [
      {
        id: "guardian-1",
        clubId,
        studentId: "student-1",
        parentId: "parent-1",
        relationship: "father",
        isPrimaryContact: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    coaches: [
      {
        id: "coach-1",
        clubId,
        userId: "user-coach-1",
        name: "Chen Coach",
        specialties: ["technical", "U10"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    teams: [
      {
        id: "team-u10-dev",
        clubId,
        name: "U10 Development",
        ageGroup: "U10",
        level: "development",
        defaultCoachId: "coach-1",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "team-weekend-select",
        clubId,
        name: "Weekend Select",
        ageGroup: "U10-U12",
        level: "advanced",
        defaultCoachId: "coach-1",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    teamMembers: [
      {
        id: "team-member-1",
        clubId,
        teamId: "team-u10-dev",
        studentId: "student-1",
        startsAt: "2026-06-01",
        isPrimaryTeam: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "team-member-2",
        clubId,
        teamId: "team-weekend-select",
        studentId: "student-1",
        startsAt: "2026-06-15",
        isPrimaryTeam: false,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    dimensions: [
      {
        id: "dimension-technical",
        catalogScope: systemCatalog,
        code: "technical",
        name: "Technical",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "dimension-match",
        catalogScope: systemCatalog,
        code: "match",
        name: "Match Performance",
        createdAt: now,
        updatedAt: now,
      },
    ],
    objectives: [
      {
        id: "objective-finishing",
        catalogScope: systemCatalog,
        dimensionId: "dimension-technical",
        code: "finishing",
        name: "Finishing",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metrics: [
      {
        id: "metric-finishing",
        catalogScope: systemCatalog,
        code: "finishing_rating",
        name: "Finishing Rating",
        dimensionId: "dimension-technical",
        valueKind: "rating_1_5",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-goals",
        catalogScope: systemCatalog,
        code: "match_goals",
        name: "Match Goals",
        dimensionId: "dimension-match",
        valueKind: "count",
        unit: "goal",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-assists",
        catalogScope: systemCatalog,
        code: "match_assists",
        name: "Match Assists",
        dimensionId: "dimension-match",
        valueKind: "count",
        unit: "assist",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-attacking-contribution",
        catalogScope: systemCatalog,
        code: "attacking_contribution",
        name: "Attacking Contribution",
        dimensionId: "dimension-match",
        valueKind: "measurement",
        unit: "score",
        createdAt: now,
        updatedAt: now,
      },
    ],
    drills: [
      {
        id: "drill-finishing-1",
        catalogScope: systemCatalog,
        name: "First-touch finishing from cutback",
        objectiveIds: ["objective-finishing"],
        metricIds: ["metric-finishing"],
        durationMinutes: 15,
        difficulty: "standard",
        recommendedAgeGroups: ["U10", "U12"],
        recommendedLevels: ["development", "advanced"],
        equipment: ["balls", "cones", "mini goals"],
        setup: "Wide channel cutback into central finishing zone.",
        coachingPoints: ["Open body shape", "First touch toward goal", "Shoot before pressure arrives"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    sessionPlans: [
      {
        id: "session-plan-finishing",
        catalogScope: clubCatalog,
        name: "U10 Finishing Basics",
        objectiveIds: ["objective-finishing"],
        metricIds: ["metric-finishing"],
        blocks: [
          {
            id: "block-finishing-1",
            drillId: "drill-finishing-1",
            order: 1,
            plannedMinutes: 15,
          },
        ],
        estimatedMinutes: 60,
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: "event-training-1",
        clubId,
        type: "training",
        title: "U10 Development Training",
        timeRange: {
          startsAt: "2026-07-01T09:00:00.000Z",
          endsAt: "2026-07-01T10:30:00.000Z",
        },
        primaryTeamId: "team-u10-dev",
        ownerCoachId: "coach-1",
        status: "scheduled",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "event-match-1",
        clubId,
        type: "match",
        title: "U10 Friendly Match",
        timeRange: {
          startsAt: "2026-07-05T08:00:00.000Z",
          endsAt: "2026-07-05T09:30:00.000Z",
        },
        primaryTeamId: "team-u10-dev",
        ownerCoachId: "coach-1",
        status: "completed",
        createdAt: now,
        updatedAt: now,
      },
    ],
    participants: [
      {
        id: "participant-training-1",
        clubId,
        eventId: "event-training-1",
        studentId: "student-1",
        status: "confirmed",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "participant-match-1",
        clubId,
        eventId: "event-match-1",
        studentId: "student-1",
        status: "present",
        createdAt: now,
        updatedAt: now,
      },
    ],
    trainingSessions: [
      {
        id: "training-session-1",
        clubId,
        eventId: "event-training-1",
        kind: "team",
        sessionPlanId: "session-plan-finishing",
        intensity: "medium",
        createdAt: now,
        updatedAt: now,
      },
    ],
    matches: [
      {
        id: "match-1",
        clubId,
        eventId: "event-match-1",
        matchType: "friendly",
        opponentName: "City School U10",
        homeScore: 3,
        awayScore: 2,
        status: "completed",
        createdAt: now,
        updatedAt: now,
      },
    ],
    matchRosters: [
      {
        id: "match-roster-1",
        clubId,
        matchId: "match-1",
        studentId: "student-1",
        teamId: "team-u10-dev",
        started: true,
        minutesPlayed: 60,
        position: "FW",
        createdAt: now,
        updatedAt: now,
      },
    ],
    matchEvents: [
      {
        id: "match-event-goal-1",
        clubId,
        matchId: "match-1",
        type: "goal",
        studentId: "student-1",
        minute: 18,
        linkedMetricId: "metric-goals",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "match-event-assist-1",
        clubId,
        matchId: "match-1",
        type: "assist",
        studentId: "student-1",
        minute: 42,
        linkedMetricId: "metric-assists",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricRecords: [
      {
        id: "metric-record-goal-1",
        clubId,
        studentId: "student-1",
        metricId: "metric-goals",
        value: { kind: "count", count: 1 },
        source: "match_event",
        occurredAt: "2026-07-05T09:30:00.000Z",
        eventId: "event-match-1",
        recordedByCoachId: "coach-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-record-assist-1",
        clubId,
        studentId: "student-1",
        metricId: "metric-assists",
        value: { kind: "count", count: 1 },
        source: "match_event",
        occurredAt: "2026-07-05T09:30:00.000Z",
        eventId: "event-match-1",
        recordedByCoachId: "coach-1",
        createdAt: now,
        updatedAt: now,
      },
    ],
    derivedMetricDefinitions: [
      {
        id: "derived-attacking-contribution",
        catalogScope: systemCatalog,
        code: "attacking_contribution",
        name: "Attacking Contribution",
        outputMetricId: "metric-attacking-contribution",
        method: "weighted_average",
        inputMetricIds: ["metric-goals", "metric-assists"],
        version: "1.0.0",
        weights: {
          "metric-goals": 2,
          "metric-assists": 1,
        },
        outputUnit: "score",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

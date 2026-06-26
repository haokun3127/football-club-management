import type { SeedData } from "./types.js";
import { clubCatalog, chongqingTalentClubId as clubId, seedNow as now, systemCatalog } from "./types.js";

export function createTrainingSeed(): Pick<
  SeedData,
  | "dimensions"
  | "objectives"
  | "metrics"
  | "drills"
  | "sessionPlans"
  | "events"
  | "participants"
  | "trainingSessions"
  | "sessionDeliveries"
  | "sessionObservations"
  | "otherActivities"
> {
  return {
    dimensions: [
      {
        id: "dimension-technical",
        catalogScope: systemCatalog,
        code: "technical",
        name: "技术能力",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "dimension-match",
        catalogScope: systemCatalog,
        code: "match",
        name: "比赛表现",
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
        name: "射门终结",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metrics: [
      {
        id: "metric-finishing",
        catalogScope: systemCatalog,
        code: "finishing_rating",
        name: "射门终结评分",
        dimensionId: "dimension-technical",
        valueKind: "rating_1_5",
        metricKind: "atomic",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-goals",
        catalogScope: systemCatalog,
        code: "match_goals",
        name: "比赛进球",
        dimensionId: "dimension-match",
        valueKind: "count",
        metricKind: "atomic",
        unit: "goal",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-assists",
        catalogScope: systemCatalog,
        code: "match_assists",
        name: "比赛助攻",
        dimensionId: "dimension-match",
        valueKind: "count",
        metricKind: "atomic",
        unit: "assist",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-attacking-contribution",
        catalogScope: systemCatalog,
        code: "attacking_contribution",
        name: "进攻贡献",
        dimensionId: "dimension-match",
        valueKind: "measurement",
        metricKind: "computed",
        unit: "score",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-technical-index",
        catalogScope: systemCatalog,
        code: "technical_index",
        name: "技术综合指数",
        dimensionId: "dimension-technical",
        valueKind: "measurement",
        metricKind: "computed",
        unit: "score",
        createdAt: now,
        updatedAt: now,
      },
    ],
    drills: [
      {
        id: "drill-finishing-1",
        catalogScope: systemCatalog,
        name: "倒三角传中后第一脚射门",
        objectiveIds: ["objective-finishing"],
        metricIds: ["metric-finishing"],
        durationMinutes: 15,
        difficulty: "standard",
        recommendedAgeGroups: ["U10", "U12"],
        recommendedLevels: ["development", "advanced"],
        equipment: ["balls", "cones", "mini goals"],
        setup: "边路传至中路射门区域，要求第一脚面向球门。",
        coachingPoints: ["身体打开接球", "第一脚触球指向球门", "防守压力到达前完成射门"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    sessionPlans: [
      {
        id: "session-plan-finishing",
        catalogScope: clubCatalog,
        name: "U10射门基础课",
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
        title: "U10发展队训练",
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
        title: "U10友谊赛",
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
    sessionDeliveries: [],
    sessionObservations: [
      {
        id: "session-observation-1",
        clubId,
        trainingSessionId: "training-session-1",
        studentId: "student-1",
        coachId: "coach-1",
        metricId: "metric-finishing",
        rating: 4,
        tags: ["finishing", "first_touch"],
        note: "训练中射门动作稳定。",
        sourceReference: { kind: "calendar_event", eventId: "event-training-1" },
        createdAt: now,
        updatedAt: now,
      },
    ],
    otherActivities: [],
  };
}

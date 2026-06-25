import type { SeedData } from "./types.js";
import { clubCatalog, demoClubId as clubId, seedNow as now, systemCatalog } from "./types.js";

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
        note: "Good finishing mechanics in the session.",
        sourceReference: { kind: "calendar_event", eventId: "event-training-1" },
        createdAt: now,
        updatedAt: now,
      },
    ],
    otherActivities: [],
  };
}

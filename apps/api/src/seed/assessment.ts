import type { SeedData } from "./types.js";
import { demoClubId as clubId, seedNow as now, systemCatalog } from "./types.js";

export function createAssessmentSeed(): Pick<
  SeedData,
  | "assessmentTemplates"
  | "assessmentTemplateVersions"
  | "assessmentMetricBindings"
  | "assessmentTestItems"
  | "playerAssessments"
  | "assessmentScores"
  | "metricGraphVersions"
  | "metricDependencies"
  | "metricViews"
  | "metricViewNodes"
  | "metricRecords"
  | "metricLineages"
  | "derivedMetricDefinitions"
> {
  return {
    metricGraphVersions: [
      {
        id: "metric-graph-version-demo",
        catalogScope: systemCatalog,
        name: "Demo Metric Graph",
        version: "1.0.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricDependencies: [],
    metricViews: [
      {
        id: "metric-view-technical-basics",
        catalogScope: systemCatalog,
        graphVersionId: "metric-graph-version-demo",
        name: "Technical Basics View",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricViewNodes: [
      {
        id: "metric-view-node-finishing",
        catalogScope: systemCatalog,
        viewId: "metric-view-technical-basics",
        metricId: "metric-finishing",
        label: "Finishing",
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentTemplates: [
      {
        id: "assessment-template-technical",
        catalogScope: systemCatalog,
        name: "Technical Basics Assessment",
        ageGroup: "U10",
        teamLevel: "development",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentTemplateVersions: [
      {
        id: "assessment-template-version-technical-1",
        clubId,
        templateId: "assessment-template-technical",
        graphVersionId: "metric-graph-version-demo",
        version: "1.0.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentMetricBindings: [
      {
        id: "assessment-binding-finishing",
        clubId,
        templateVersionId: "assessment-template-version-technical-1",
        metricId: "metric-finishing",
        role: "input",
        maxScore: 5,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentTestItems: [],
    playerAssessments: [
      {
        id: "assessment-1",
        clubId,
        studentId: "student-1",
        templateId: "assessment-template-technical",
        templateVersionId: "assessment-template-version-technical-1",
        assessedByCoachId: "coach-1",
        assessedAt: "2026-07-06T10:00:00.000Z",
        summary: "Assessment day technical check",
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentScores: [
      {
        id: "assessment-score-1",
        clubId,
        assessmentId: "assessment-1",
        metricId: "metric-finishing",
        value: { kind: "rating_1_5", score: 4 },
        normalizedScore: 4,
        comment: "Clean first touch and composed finish.",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricRecords: [
      {
        id: "metric-record-training-1",
        clubId,
        studentId: "student-1",
        metricId: "metric-finishing",
        value: { kind: "rating_1_5", score: 4 },
        source: "training_observation",
        occurredAt: "2026-07-01T10:15:00.000Z",
        eventId: "event-training-1",
        recordedByCoachId: "coach-1",
        createdAt: now,
        updatedAt: now,
        note: "Good finishing mechanics in the session.",
      },
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
      {
        id: "metric-record-assessment-1",
        clubId,
        studentId: "student-1",
        metricId: "metric-finishing",
        value: { kind: "rating_1_5", score: 4 },
        source: "assessment",
        occurredAt: "2026-07-06T10:00:00.000Z",
        eventId: "event-training-1",
        assessmentId: "assessment-1",
        templateVersionId: "assessment-template-version-technical-1",
        recordedByCoachId: "coach-1",
        createdAt: now,
        updatedAt: now,
        note: "Assessment day technical check",
      },
    ],
    metricLineages: [],
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

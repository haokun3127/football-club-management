import { describe, expect, it } from "vitest";
import { createAssessmentService, type AssessmentCatalogLookup, type AssessmentStore } from "../src/index.js";

const now = "2026-06-25T10:00:00.000Z";

describe("createAssessmentService", () => {
  it("records assessment scores and emits assessment metric records", async () => {
    const saved = {
      assessments: [] as unknown[],
      scores: [] as unknown[],
      metricRecords: [] as unknown[],
      lineages: [] as unknown[],
    };

    const catalog: AssessmentCatalogLookup = {
      findTemplateById: async (_clubId, templateId) => {
        if (templateId !== "assessment-template-technical") {
          return null;
        }

        return {
          id: "assessment-template-technical",
          catalogScope: { scope: "system" as const },
          name: "天才精英队周期评测",
          ageGroup: "U10",
          teamLevel: "development",
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
      },
      findTemplateVersion: async () => ({
        id: "assessment-template-version-technical-1",
        clubId: "club-chongqing-talent",
        templateId: "assessment-template-technical",
        graphVersionId: "metric-graph-version-chongqing-talent",
        version: "1.0.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
      }),
      findMetricGraphVersion: async () => ({
        id: "metric-graph-version-chongqing-talent",
        catalogScope: { scope: "system" as const },
        name: "重庆天才球员能力指标图谱",
        version: "1.0.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
      }),
      listTemplateMetricBindings: async () => [
        {
          id: "assessment-binding-finishing",
          clubId: "club-chongqing-talent",
          templateVersionId: "assessment-template-version-technical-1",
          metricId: "metric-finishing",
          role: "input",
          maxScore: 5,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
      listMetricGraphDependencies: async () => [],
      listAbilityMetrics: async () => [],
      listDerivedMetricDefinitions: async () => [],
    };

    const store: AssessmentStore = {
      saveAssessment: async (assessment) => saved.assessments.push(assessment),
      saveScore: async (score) => saved.scores.push(score),
      saveMetricRecord: async (record) => saved.metricRecords.push(record),
      saveMetricLineage: async (lineage) => saved.lineages.push(lineage),
    };

    let idCounter = 0;
    const service = createAssessmentService({
      clock: { now: () => now },
      ids: {
        next: (prefix = "id") => `${prefix}-${++idCounter}`,
      },
      store,
      catalog,
    });

    const result = await service.recordPlayerAssessment({
      clubId: "club-chongqing-talent",
      studentId: "student-1",
      templateId: "assessment-template-technical",
      templateVersionId: "assessment-template-version-technical-1",
      assessedByCoachId: "coach-1",
      assessedAt: "2026-06-25T09:30:00.000Z",
      summary: "Mid-cycle technical assessment",
      scores: [
        {
          metricId: "metric-finishing",
          value: { kind: "rating_1_5", score: 4 },
          normalizedScore: 4,
          comment: "Composed in front of goal.",
        },
      ],
    });

    expect(result.assessment.studentId).toBe("student-1");
    expect(result.scores).toHaveLength(1);
    expect(result.metricRecords[0]?.source).toBe("assessment");
    expect(result.metricRecords[0]?.value).toEqual({ kind: "rating_1_5", score: 4 });
    expect(result.metricRecords[0]?.templateVersionId).toBe("assessment-template-version-technical-1");
    expect(saved.metricRecords).toHaveLength(1);
  });
});

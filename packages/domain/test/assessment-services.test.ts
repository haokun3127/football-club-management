import { describe, expect, it } from "vitest";
import { createAssessmentService, type AssessmentCatalogLookup, type AssessmentStore } from "../src/index.js";

const now = "2026-06-25T10:00:00.000Z";

describe("createAssessmentService", () => {
  it("records assessment scores and emits assessment metric records", async () => {
    const saved = {
      assessments: [],
      scores: [],
      metricRecords: [],
    };

    const catalog: AssessmentCatalogLookup = {
      findTemplateById: async (_clubId, templateId) => {
        if (templateId !== "assessment-template-technical") {
          return null;
        }

        return {
          id: "assessment-template-technical",
          catalogScope: { scope: "system" as const },
          name: "Technical Basics Assessment",
          ageGroup: "U10",
          teamLevel: "development",
          metricIds: ["metric-finishing"],
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
      },
    };

    const store: AssessmentStore = {
      saveAssessment: async (assessment) => saved.assessments.push(assessment),
      saveScore: async (score) => saved.scores.push(score),
      saveMetricRecord: async (record) => saved.metricRecords.push(record),
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
      clubId: "club-demo",
      studentId: "student-1",
      templateId: "assessment-template-technical",
      assessedByCoachId: "coach-1",
      assessedAt: "2026-06-25T09:30:00.000Z",
      summary: "Mid-cycle technical assessment",
      scores: [
        {
          metricId: "metric-finishing",
          score: 4,
          comment: "Composed in front of goal.",
        },
      ],
    });

    expect(result.assessment.studentId).toBe("student-1");
    expect(result.scores).toHaveLength(1);
    expect(result.metricRecords[0]?.source).toBe("assessment");
    expect(result.metricRecords[0]?.value).toEqual({ kind: "rating_1_5", score: 4 });
    expect(saved.metricRecords).toHaveLength(1);
  });
});

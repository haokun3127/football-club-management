import type { AssessmentScore, AssessmentTemplate, PlayerAssessment } from "./assessment.js";
import type { PlayerMetricRecord } from "./metrics.js";
import type { EntityId } from "./primitives.js";
import type { Clock, IdGenerator } from "./ports.js";

export interface AssessmentScoreInput {
  metricId: EntityId;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface RecordAssessmentInput {
  clubId: EntityId;
  studentId: EntityId;
  templateId: EntityId;
  assessedByCoachId: EntityId;
  assessedAt?: string;
  eventId?: EntityId;
  summary?: string;
  scores: AssessmentScoreInput[];
}

export interface AssessmentStore {
  saveAssessment(assessment: PlayerAssessment): Promise<void> | void;
  saveScore(score: AssessmentScore): Promise<void> | void;
  saveMetricRecord(record: PlayerMetricRecord): Promise<void> | void;
}

export interface AssessmentCatalogLookup {
  findTemplateById(clubId: EntityId, templateId: EntityId): Promise<AssessmentTemplate | null> | AssessmentTemplate | null;
}

export interface AssessmentServiceDependencies {
  clock: Clock;
  ids: IdGenerator;
  store: AssessmentStore;
  catalog: AssessmentCatalogLookup;
}

export interface AssessmentResult {
  assessment: PlayerAssessment;
  scores: AssessmentScore[];
  metricRecords: PlayerMetricRecord[];
}

export function createAssessmentService(dependencies: AssessmentServiceDependencies) {
  return {
    async recordPlayerAssessment(input: RecordAssessmentInput): Promise<AssessmentResult> {
      const template = await dependencies.catalog.findTemplateById(input.clubId, input.templateId);
      if (!template) {
        throw new Error(`Assessment template ${input.templateId} not found.`);
      }

      if (template.status !== "active") {
        throw new Error(`Assessment template ${input.templateId} is not active.`);
      }

      const invalidMetricId = input.scores.find((score) => !template.metricIds.includes(score.metricId));
      if (invalidMetricId) {
        throw new Error(`Metric ${invalidMetricId.metricId} is not part of template ${template.id}.`);
      }

      const now = dependencies.clock.now();
      const assessedAt = input.assessedAt ?? now;
      const assessment: PlayerAssessment = {
        id: dependencies.ids.next("assessment"),
        clubId: input.clubId,
        studentId: input.studentId,
        templateId: input.templateId,
        assessedByCoachId: input.assessedByCoachId,
        assessedAt,
        eventId: input.eventId,
        summary: input.summary,
        createdAt: now,
        updatedAt: now,
      };

      await dependencies.store.saveAssessment(assessment);

      const scores: AssessmentScore[] = [];
      const metricRecords: PlayerMetricRecord[] = [];

      for (const scoreInput of input.scores) {
        const score: AssessmentScore = {
          id: dependencies.ids.next("assessment-score"),
          clubId: input.clubId,
          assessmentId: assessment.id,
          metricId: scoreInput.metricId,
          score: scoreInput.score,
          comment: scoreInput.comment,
          createdAt: now,
          updatedAt: now,
        };
        scores.push(score);
        await dependencies.store.saveScore(score);

        const metricRecord: PlayerMetricRecord = {
          id: dependencies.ids.next("metric-record"),
          clubId: input.clubId,
          studentId: input.studentId,
          metricId: scoreInput.metricId,
          value: { kind: "rating_1_5", score: scoreInput.score },
          source: "assessment",
          occurredAt: assessedAt,
          eventId: input.eventId,
          recordedByCoachId: input.assessedByCoachId,
          createdAt: now,
          updatedAt: now,
          note: scoreInput.comment ?? input.summary ?? `assessment:${template.id}`,
        };
        metricRecords.push(metricRecord);
        await dependencies.store.saveMetricRecord(metricRecord);
      }

      return { assessment, scores, metricRecords };
    },
  };
}

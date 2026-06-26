import type { AssessmentMetricBinding, AssessmentScore, AssessmentTemplate, PlayerAssessment } from "./assessment.js";
import { getNumericMetricValue, type MetricValue, type PlayerMetricRecord } from "./metrics.js";
import type { EntityId } from "./primitives.js";
import type { Clock, IdGenerator } from "./ports.js";

export interface AssessmentScoreInput {
  metricId: EntityId;
  value: MetricValue;
  normalizedScore?: number;
  rawResultId?: EntityId;
  comment?: string;
}

export interface RecordAssessmentInput {
  clubId: EntityId;
  studentId: EntityId;
  templateId: EntityId;
  templateVersionId?: EntityId;
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
  listTemplateMetricBindings(
    clubId: EntityId,
    templateId: EntityId,
    templateVersionId?: EntityId,
  ): Promise<AssessmentMetricBinding[]> | AssessmentMetricBinding[];
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

      const bindings = await dependencies.catalog.listTemplateMetricBindings(
        input.clubId,
        template.id,
        input.templateVersionId,
      );
      const allowedMetricIds = new Set(bindings
        .filter((binding) => binding.role === "input" || binding.role === "output")
        .map((binding) => binding.metricId));
      if (allowedMetricIds.size === 0) {
        throw new Error(`Assessment template ${template.id} has no metric bindings.`);
      }

      const invalidMetricId = input.scores.find((score) => !allowedMetricIds.has(score.metricId));
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
        templateVersionId: input.templateVersionId,
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
          value: scoreInput.value,
          normalizedScore: scoreInput.normalizedScore,
          rawResultId: scoreInput.rawResultId,
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
          value: scoreInput.value,
          source: "assessment",
          occurredAt: assessedAt,
          eventId: input.eventId,
          assessmentId: assessment.id,
          templateVersionId: input.templateVersionId,
          rawResultId: scoreInput.rawResultId,
          recordedByCoachId: input.assessedByCoachId,
          confidence: scoreInput.normalizedScore ?? getNumericMetricValue(scoreInput.value) ?? undefined,
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

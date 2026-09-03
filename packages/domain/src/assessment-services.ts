import type {
  AssessmentMetricBinding,
  AssessmentRawResult,
  AssessmentScore,
  AssessmentTestItem,
  AssessmentTemplate,
  AssessmentTemplateVersion,
  PlayerAssessment,
} from "./assessment.js";
import { computeMetricGraph } from "./metric-graph-services.js";
import {
  getNumericMetricValue,
  type AbilityMetric,
  type DerivedMetricDefinition,
  type MetricDependency,
  type MetricGraphVersion,
  type MetricLineage,
  type MetricValue,
  type PlayerMetricRecord,
} from "./metrics.js";
import type { EntityId } from "./primitives.js";
import type { Clock, IdGenerator } from "./ports.js";

export interface AssessmentScoreInput {
  metricId: EntityId;
  value: MetricValue;
  normalizedScore?: number;
  rawResultId?: EntityId;
  comment?: string;
}

export interface AssessmentRawResultInput {
  testItemId: EntityId;
  metricId?: EntityId;
  value: MetricValue;
  normalizedScore?: number;
  note?: string;
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
  assessmentTaskId?: EntityId;
  summary?: string;
  scores?: AssessmentScoreInput[];
  rawResults?: AssessmentRawResultInput[];
}

export interface AssessmentStore {
  saveAssessment(assessment: PlayerAssessment): Promise<void> | void;
  saveRawResult(rawResult: AssessmentRawResult): Promise<void> | void;
  saveScore(score: AssessmentScore): Promise<void> | void;
  saveMetricRecord(record: PlayerMetricRecord): Promise<void> | void;
  saveMetricLineage(lineage: MetricLineage): Promise<void> | void;
}

export interface AssessmentCatalogLookup {
  findTemplateById(clubId: EntityId, templateId: EntityId): Promise<AssessmentTemplate | null> | AssessmentTemplate | null;
  findTemplateVersion(
    clubId: EntityId,
    templateId: EntityId,
    templateVersionId?: EntityId,
  ): Promise<AssessmentTemplateVersion | null> | AssessmentTemplateVersion | null;
  findMetricGraphVersion(clubId: EntityId, graphVersionId: EntityId): Promise<MetricGraphVersion | null> | MetricGraphVersion | null;
  listTemplateMetricBindings(
    clubId: EntityId,
    templateId: EntityId,
    templateVersionId?: EntityId,
  ): Promise<AssessmentMetricBinding[]> | AssessmentMetricBinding[];
  listAssessmentTestItems(clubId: EntityId): Promise<AssessmentTestItem[]> | AssessmentTestItem[];
  listMetricGraphDependencies(clubId: EntityId, graphVersionId: EntityId): Promise<MetricDependency[]> | MetricDependency[];
  listAbilityMetrics(clubId: EntityId): Promise<AbilityMetric[]> | AbilityMetric[];
  listDerivedMetricDefinitions(clubId: EntityId): Promise<DerivedMetricDefinition[]> | DerivedMetricDefinition[];
}

export interface AssessmentServiceDependencies {
  clock: Clock;
  ids: IdGenerator;
  store: AssessmentStore;
  catalog: AssessmentCatalogLookup;
}

export interface AssessmentResult {
  assessment: PlayerAssessment;
  rawResults: AssessmentRawResult[];
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

      const templateVersion = await dependencies.catalog.findTemplateVersion(
        input.clubId,
        template.id,
        input.templateVersionId,
      );
      if (!templateVersion) {
        throw new Error(`Assessment template ${template.id} has no active version.`);
      }

      const bindings = await dependencies.catalog.listTemplateMetricBindings(
        input.clubId,
        template.id,
        templateVersion.id,
      );
      const allowedMetricIds = new Set(bindings
        .filter((binding) => binding.role === "input")
        .map((binding) => binding.metricId));
      if (allowedMetricIds.size === 0) {
        throw new Error(`Assessment template ${template.id} has no metric bindings.`);
      }

      const testItems = await dependencies.catalog.listAssessmentTestItems(input.clubId);
      const rawScoreInputs = (input.rawResults ?? []).map((rawResult) => {
        const testItem = testItems.find((item) => item.id === rawResult.testItemId);
        if (!testItem) {
          throw new Error(`Assessment test item ${rawResult.testItemId} not found.`);
        }

        return {
          metricId: rawResult.metricId ?? testItem.metricId,
          value: rawResult.value,
          normalizedScore: rawResult.normalizedScore ?? getNumericMetricValue(rawResult.value) ?? undefined,
          rawResult,
          comment: rawResult.comment ?? rawResult.note,
        };
      });
      const scoreInputs = [
        ...(input.scores ?? []).map((score) => ({ ...score, rawResult: undefined })),
        ...rawScoreInputs,
      ];

      const invalidMetricId = scoreInputs.find((score) => !allowedMetricIds.has(score.metricId));
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
        templateVersionId: templateVersion.id,
        assessedByCoachId: input.assessedByCoachId,
        assessedAt,
        eventId: input.eventId,
        assessmentTaskId: input.assessmentTaskId,
        summary: input.summary,
        createdAt: now,
        updatedAt: now,
      };

      await dependencies.store.saveAssessment(assessment);

      const scores: AssessmentScore[] = [];
      const rawResults: AssessmentRawResult[] = [];
      const metricRecords: PlayerMetricRecord[] = [];

      for (const scoreInput of scoreInputs) {
        let rawResultId = "rawResultId" in scoreInput ? scoreInput.rawResultId : undefined;

        if (scoreInput.rawResult) {
          const rawResult: AssessmentRawResult = {
            id: dependencies.ids.next("assessment-raw-result"),
            clubId: input.clubId,
            assessmentId: assessment.id,
            testItemId: scoreInput.rawResult.testItemId,
            metricId: scoreInput.metricId,
            value: scoreInput.value,
            recordedByCoachId: input.assessedByCoachId,
            note: scoreInput.rawResult.note,
            createdAt: now,
            updatedAt: now,
          };
          rawResultId = rawResult.id;
          rawResults.push(rawResult);
          await dependencies.store.saveRawResult(rawResult);
        }

        const score: AssessmentScore = {
          id: dependencies.ids.next("assessment-score"),
          clubId: input.clubId,
          assessmentId: assessment.id,
          metricId: scoreInput.metricId,
          value: scoreInput.value,
          normalizedScore: scoreInput.normalizedScore,
          rawResultId,
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
          templateVersionId: templateVersion.id,
          rawResultId,
          recordedByCoachId: input.assessedByCoachId,
          confidence: scoreInput.normalizedScore ?? getNumericMetricValue(scoreInput.value) ?? undefined,
          createdAt: now,
          updatedAt: now,
          note: scoreInput.comment ?? input.summary ?? `assessment:${template.id}`,
        };
        metricRecords.push(metricRecord);
        await dependencies.store.saveMetricRecord(metricRecord);
      }

      if (templateVersion.graphVersionId) {
        const graphVersion = await dependencies.catalog.findMetricGraphVersion(input.clubId, templateVersion.graphVersionId);
        if (!graphVersion) {
          throw new Error(`Metric graph version ${templateVersion.graphVersionId} not found.`);
        }

        const computed = computeMetricGraph({
          clubId: input.clubId,
          studentId: input.studentId,
          graphVersion,
          metrics: await dependencies.catalog.listAbilityMetrics(input.clubId),
          dependencies: await dependencies.catalog.listMetricGraphDependencies(input.clubId, graphVersion.id),
          formulas: await dependencies.catalog.listDerivedMetricDefinitions(input.clubId),
          inputRecords: metricRecords,
          ids: dependencies.ids,
          now,
          assessmentId: assessment.id,
          templateVersionId: templateVersion.id,
        });

        for (const record of computed.records) {
          metricRecords.push(record);
          await dependencies.store.saveMetricRecord(record);
        }

        for (const lineage of computed.lineages) {
          await dependencies.store.saveMetricLineage(lineage);
        }
      }

      return { assessment, rawResults, scores, metricRecords };
    },
  };
}

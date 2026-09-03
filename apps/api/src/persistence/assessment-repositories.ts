import type {
  AssessmentRawResult,
  AssessmentScore,
  DerivedMetricDefinition,
  EntityId,
  MetricLineage,
  PlayerAssessment,
  PlayerMetricRecord,
} from "@football-club/domain";
import type { DatabaseSync } from "node:sqlite";
import type { SQLInputValue } from "node:sqlite";

type SqlRow = Record<string, unknown>;

export class AssessmentRepository {
  constructor(private readonly database: DatabaseSync) {}

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    this.database.exec("BEGIN;");
    try {
      const result = await operation();
      this.database.exec("COMMIT;");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  listAssessments(clubId: EntityId): PlayerAssessment[] {
    const rows = this.database.prepare(`
      SELECT * FROM player_assessments
      WHERE club_id = ?
      ORDER BY assessed_at DESC, id DESC
    `).all(clubId) as SqlRow[];
    return rows.map(mapPlayerAssessment);
  }

  listRawResults(clubId: EntityId): AssessmentRawResult[] {
    const rows = this.database.prepare(`
      SELECT * FROM assessment_raw_results
      WHERE club_id = ?
      ORDER BY created_at, id
    `).all(clubId) as SqlRow[];
    return rows.map(mapAssessmentRawResult);
  }

  listScores(clubId: EntityId): AssessmentScore[] {
    const rows = this.database.prepare(`
      SELECT * FROM assessment_scores
      WHERE club_id = ?
      ORDER BY created_at, id
    `).all(clubId) as SqlRow[];
    return rows.map(mapAssessmentScore);
  }

  listMetricRecords(clubId: EntityId, studentId?: EntityId): PlayerMetricRecord[] {
    const rows = this.database.prepare(`
      SELECT * FROM player_metric_records
      WHERE club_id = ? AND (? IS NULL OR student_id = ?)
      ORDER BY occurred_at DESC, id DESC
    `).all(clubId, studentId ?? null, studentId ?? null) as SqlRow[];
    return rows.map(mapPlayerMetricRecord);
  }

  listMetricLineages(clubId: EntityId): MetricLineage[] {
    const rows = this.database.prepare(`
      SELECT * FROM metric_lineages
      WHERE club_id = ?
      ORDER BY computed_at, id
    `).all(clubId) as SqlRow[];
    return rows.map(mapMetricLineage);
  }

  saveAssessment(entity: PlayerAssessment): void {
    this.database.prepare(`
      INSERT INTO player_assessments (
        id, club_id, student_id, template_id, template_version_id, assessed_by_coach_id,
        assessed_at, event_id, assessment_task_id, summary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...playerAssessmentValues(entity));
  }

  insertAssessmentIfAbsent(entity: PlayerAssessment): void {
    this.database.prepare(`
      INSERT INTO player_assessments (
        id, club_id, student_id, template_id, template_version_id, assessed_by_coach_id,
        assessed_at, event_id, assessment_task_id, summary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...playerAssessmentValues(entity));
  }

  saveRawResult(entity: AssessmentRawResult): void {
    this.database.prepare(`
      INSERT INTO assessment_raw_results (
        id, club_id, assessment_id, test_item_id, metric_id, value_json,
        recorded_by_coach_id, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...assessmentRawResultValues(entity));
  }

  insertRawResultIfAbsent(entity: AssessmentRawResult): void {
    this.database.prepare(`
      INSERT INTO assessment_raw_results (
        id, club_id, assessment_id, test_item_id, metric_id, value_json,
        recorded_by_coach_id, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...assessmentRawResultValues(entity));
  }

  saveScore(entity: AssessmentScore): void {
    this.database.prepare(`
      INSERT INTO assessment_scores (
        id, club_id, assessment_id, metric_id, value_json, normalized_score,
        raw_result_id, comment, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...assessmentScoreValues(entity));
  }

  insertScoreIfAbsent(entity: AssessmentScore): void {
    this.database.prepare(`
      INSERT INTO assessment_scores (
        id, club_id, assessment_id, metric_id, value_json, normalized_score,
        raw_result_id, comment, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...assessmentScoreValues(entity));
  }

  saveMetricRecord(entity: PlayerMetricRecord): void {
    this.database.prepare(`
      INSERT INTO player_metric_records (
        id, club_id, student_id, metric_id, value_json, source, occurred_at, event_id,
        assessment_id, template_version_id, raw_result_id, source_record_id,
        recorded_by_coach_id, visibility, confidence, note, lineage_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...playerMetricRecordValues(entity));
  }

  insertMetricRecordIfAbsent(entity: PlayerMetricRecord): void {
    this.database.prepare(`
      INSERT INTO player_metric_records (
        id, club_id, student_id, metric_id, value_json, source, occurred_at, event_id,
        assessment_id, template_version_id, raw_result_id, source_record_id,
        recorded_by_coach_id, visibility, confidence, note, lineage_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...playerMetricRecordValues(entity));
  }

  saveMetricLineage(entity: MetricLineage): void {
    this.database.prepare(`
      INSERT INTO metric_lineages (
        id, club_id, output_record_id, definition_id, definition_version,
        input_record_ids_json, computed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...metricLineageValues(entity));
  }

  insertMetricLineageIfAbsent(entity: MetricLineage): void {
    this.database.prepare(`
      INSERT INTO metric_lineages (
        id, club_id, output_record_id, definition_id, definition_version,
        input_record_ids_json, computed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...metricLineageValues(entity));
  }

  insertDerivedMetricDefinitionIfAbsent(entity: DerivedMetricDefinition): void {
    const scopeClubId = entity.catalogScope.scope === "club" ? entity.catalogScope.clubId : null;
    const baseItemId = entity.catalogScope.scope === "club" ? entity.catalogScope.baseItemId ?? null : null;
    this.database.prepare(`
      INSERT INTO derived_metric_definitions (
        id, catalog_scope, scope_club_id, base_item_id, code, name, output_metric_id,
        method, input_metric_ids_json, version, weights_json, input_scale, max_score,
        rounding, input_window_days, output_unit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(
      entity.id,
      entity.catalogScope.scope,
      scopeClubId,
      baseItemId,
      entity.code,
      entity.name,
      entity.outputMetricId,
      entity.method,
      JSON.stringify(entity.inputMetricIds),
      entity.version,
      entity.weights ? JSON.stringify(entity.weights) : null,
      entity.inputScale ?? null,
      entity.maxScore ?? null,
      entity.rounding ?? null,
      entity.inputWindowDays ?? null,
      entity.outputUnit ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

function playerAssessmentValues(entity: PlayerAssessment): SQLInputValue[] {
  return [
    entity.id,
    entity.clubId,
    entity.studentId,
    entity.templateId,
    entity.templateVersionId ?? null,
    entity.assessedByCoachId,
    entity.assessedAt,
    entity.eventId ?? null,
    entity.assessmentTaskId ?? null,
    entity.summary ?? null,
    entity.createdAt,
    entity.updatedAt,
  ];
}

function assessmentRawResultValues(entity: AssessmentRawResult): SQLInputValue[] {
  return [
    entity.id,
    entity.clubId,
    entity.assessmentId,
    entity.testItemId,
    entity.metricId,
    JSON.stringify(entity.value),
    entity.recordedByCoachId ?? null,
    entity.note ?? null,
    entity.createdAt,
    entity.updatedAt,
  ];
}

function assessmentScoreValues(entity: AssessmentScore): SQLInputValue[] {
  return [
    entity.id,
    entity.clubId,
    entity.assessmentId,
    entity.metricId,
    JSON.stringify(entity.value),
    entity.normalizedScore ?? null,
    entity.rawResultId ?? null,
    entity.comment ?? null,
    entity.createdAt,
    entity.updatedAt,
  ];
}

function playerMetricRecordValues(entity: PlayerMetricRecord): SQLInputValue[] {
  return [
    entity.id,
    entity.clubId,
    entity.studentId,
    entity.metricId,
    JSON.stringify(entity.value),
    entity.source,
    entity.occurredAt,
    entity.eventId ?? null,
    entity.assessmentId ?? null,
    entity.templateVersionId ?? null,
    entity.rawResultId ?? null,
    entity.sourceRecordId ?? null,
    entity.recordedByCoachId ?? null,
    entity.visibility ?? null,
    entity.confidence ?? null,
    entity.note ?? null,
    entity.lineageId ?? null,
    entity.createdAt,
    entity.updatedAt,
  ];
}

function metricLineageValues(entity: MetricLineage): SQLInputValue[] {
  return [
    entity.id,
    entity.clubId,
    entity.outputRecordId,
    entity.definitionId,
    entity.definitionVersion,
    JSON.stringify(entity.inputRecordIds),
    entity.computedAt,
    entity.createdAt,
    entity.updatedAt,
  ];
}

function mapPlayerAssessment(row: SqlRow): PlayerAssessment {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    studentId: requiredString(row, "student_id"),
    templateId: requiredString(row, "template_id"),
    templateVersionId: optionalString(row, "template_version_id"),
    assessedByCoachId: requiredString(row, "assessed_by_coach_id"),
    assessedAt: requiredString(row, "assessed_at"),
    eventId: optionalString(row, "event_id"),
    assessmentTaskId: optionalString(row, "assessment_task_id"),
    summary: optionalString(row, "summary"),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function mapAssessmentRawResult(row: SqlRow): AssessmentRawResult {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    assessmentId: requiredString(row, "assessment_id"),
    testItemId: requiredString(row, "test_item_id"),
    metricId: requiredString(row, "metric_id"),
    value: parseMetricValue(row, "value_json"),
    recordedByCoachId: optionalString(row, "recorded_by_coach_id"),
    note: optionalString(row, "note"),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  } as AssessmentRawResult;
}

function mapAssessmentScore(row: SqlRow): AssessmentScore {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    assessmentId: requiredString(row, "assessment_id"),
    metricId: requiredString(row, "metric_id"),
    value: parseMetricValue(row, "value_json"),
    normalizedScore: optionalNumber(row, "normalized_score"),
    rawResultId: optionalString(row, "raw_result_id"),
    comment: optionalString(row, "comment"),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  } as AssessmentScore;
}

function mapPlayerMetricRecord(row: SqlRow): PlayerMetricRecord {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    studentId: requiredString(row, "student_id"),
    metricId: requiredString(row, "metric_id"),
    value: parseMetricValue(row, "value_json"),
    source: requiredString(row, "source") as PlayerMetricRecord["source"],
    occurredAt: requiredString(row, "occurred_at") as PlayerMetricRecord["occurredAt"],
    eventId: optionalString(row, "event_id"),
    assessmentId: optionalString(row, "assessment_id"),
    templateVersionId: optionalString(row, "template_version_id"),
    rawResultId: optionalString(row, "raw_result_id"),
    sourceRecordId: optionalString(row, "source_record_id"),
    recordedByCoachId: optionalString(row, "recorded_by_coach_id"),
    visibility: optionalString(row, "visibility") as PlayerMetricRecord["visibility"],
    confidence: optionalNumber(row, "confidence"),
    note: optionalString(row, "note"),
    lineageId: optionalString(row, "lineage_id"),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function mapMetricLineage(row: SqlRow): MetricLineage {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    outputRecordId: requiredString(row, "output_record_id"),
    definitionId: requiredString(row, "definition_id"),
    definitionVersion: requiredString(row, "definition_version"),
    inputRecordIds: JSON.parse(requiredString(row, "input_record_ids_json")) as EntityId[],
    computedAt: requiredString(row, "computed_at") as MetricLineage["computedAt"],
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function requiredString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string.`);
  }
  return value;
}

function optionalString(row: SqlRow, key: string): string | undefined {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string.`);
  }
  return value;
}

function optionalNumber(row: SqlRow, key: string): number | undefined {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "number") {
    throw new Error(`Expected ${key} to be a number.`);
  }
  return value;
}

function parseMetricValue(row: SqlRow, key: string): PlayerMetricRecord["value"] {
  const parsed: unknown = JSON.parse(requiredString(row, key));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected ${key} to contain a metric value object.`);
  }
  return parsed as PlayerMetricRecord["value"];
}

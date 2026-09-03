import type { EntityId } from "@football-club/domain";
import type { TrainingContentAssessment } from "../data-capability/types.js";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";

type SqlRow = Record<string, unknown>;

export class TrainingContentAssessmentRepository {
  constructor(private readonly database: DatabaseSync) {}

  listByClub(clubId: EntityId): TrainingContentAssessment[] {
    const rows = this.database.prepare(`
      SELECT * FROM training_content_assessments
      WHERE club_id = ?
      ORDER BY assessed_at DESC, id DESC
    `).all(clubId) as SqlRow[];
    return rows.map(mapTrainingContentAssessment);
  }

  listByEvent(clubId: EntityId, eventId: EntityId): TrainingContentAssessment[] {
    const rows = this.database.prepare(`
      SELECT * FROM training_content_assessments
      WHERE club_id = ? AND event_id = ?
      ORDER BY student_id, training_project_id
    `).all(clubId, eventId) as SqlRow[];
    return rows.map(mapTrainingContentAssessment);
  }

  save(entity: TrainingContentAssessment): TrainingContentAssessment {
    this.database.prepare(`
      INSERT INTO training_content_assessments (
        id, club_id, event_id, student_id, training_project_id, score, note,
        assessed_by_coach_id, assessed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(club_id, event_id, student_id, training_project_id) DO UPDATE SET
        score = excluded.score,
        note = excluded.note,
        assessed_by_coach_id = excluded.assessed_by_coach_id,
        assessed_at = excluded.assessed_at,
        updated_at = excluded.updated_at
    `).run(...trainingContentAssessmentValues(entity));

    const row = this.database.prepare(`
      SELECT * FROM training_content_assessments
      WHERE club_id = ? AND event_id = ? AND student_id = ? AND training_project_id = ?
    `).get(entity.clubId, entity.eventId, entity.studentId, entity.trainingProjectId) as SqlRow | undefined;
    if (!row) throw new Error("Training content assessment was not persisted.");
    return mapTrainingContentAssessment(row);
  }
}

function trainingContentAssessmentValues(entity: TrainingContentAssessment): SQLInputValue[] {
  return [
    entity.id,
    entity.clubId,
    entity.eventId,
    entity.studentId,
    entity.trainingProjectId,
    entity.score,
    entity.note ?? null,
    entity.assessedByCoachId,
    entity.assessedAt,
    entity.createdAt,
    entity.updatedAt,
  ];
}

function mapTrainingContentAssessment(row: SqlRow): TrainingContentAssessment {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    eventId: requiredString(row, "event_id"),
    studentId: requiredString(row, "student_id"),
    trainingProjectId: requiredString(row, "training_project_id"),
    score: requiredNumber(row, "score"),
    note: optionalString(row, "note"),
    assessedByCoachId: requiredString(row, "assessed_by_coach_id"),
    assessedAt: requiredString(row, "assessed_at"),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function requiredString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Expected ${key} to be a string.`);
  return value;
}

function optionalString(row: SqlRow, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}

function requiredNumber(row: SqlRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number") throw new Error(`Expected ${key} to be a number.`);
  return value;
}

import type { DatabaseSync } from "node:sqlite";
import type { TrainingRecord, TrainingRecordRepository } from "../application/training-records.js";

export class SqliteTrainingRecordRepository implements TrainingRecordRepository {
  constructor(private readonly database: DatabaseSync) {}
  get(clubId: string, eventId: string, studentId: string): TrainingRecord | null {
    const row = this.database.prepare("SELECT revision, state_json FROM training_records WHERE club_id = ? AND event_id = ? AND student_id = ?")
      .get(clubId, eventId, studentId);
    if (!row) return null;
    const record = JSON.parse(String(row.state_json)) as TrainingRecord;
    if (record.clubId !== clubId || record.eventId !== eventId || record.studentId !== studentId
      || record.revision !== row.revision || !Array.isArray(record.history)) throw new Error("Invalid persisted training record");
    return record;
  }
  compareAndSave(record: TrainingRecord, expectedRevision: number): boolean {
    if (record.revision !== expectedRevision + 1) throw new Error("Invalid training record revision");
    const state = JSON.stringify(record);
    const result = expectedRevision === 0
      ? this.database.prepare(`INSERT INTO training_records (club_id, event_id, student_id, revision, state_json)
          VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`)
        .run(record.clubId, record.eventId, record.studentId, record.revision, state)
      : this.database.prepare(`UPDATE training_records SET revision = ?, state_json = ?
          WHERE club_id = ? AND event_id = ? AND student_id = ? AND revision = ?`)
        .run(record.revision, state, record.clubId, record.eventId, record.studentId, expectedRevision);
    return Number(result.changes) === 1;
  }
}

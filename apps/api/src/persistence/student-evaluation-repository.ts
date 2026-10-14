import type { DatabaseSync } from "node:sqlite";
import type { StudentEvaluation, StudentEvaluationRepository } from "../application/student-evaluations.js";
export class SqliteStudentEvaluationRepository implements StudentEvaluationRepository {
  constructor(private readonly database: DatabaseSync) {}
  list(clubId: string, studentId: string) {
    return this.database.prepare("SELECT team_id FROM student_evaluations WHERE club_id = ? AND student_id = ? ORDER BY team_id").all(clubId, studentId)
      .map(row => this.get(clubId, String(row.team_id), studentId)!);
  }
  get(clubId: string, teamId: string, studentId: string): StudentEvaluation | null {
    const row = this.database.prepare("SELECT revision, state_json FROM student_evaluations WHERE club_id = ? AND team_id = ? AND student_id = ?").get(clubId, teamId, studentId);
    if (!row) return null;
    const record = JSON.parse(String(row.state_json)) as StudentEvaluation;
    if (record.clubId !== clubId || record.teamId !== teamId || record.studentId !== studentId || record.revision !== row.revision || record.history?.at(-1)?.revision !== record.revision) throw new Error("Invalid persisted evaluation");
    return record;
  }
  compareAndSave(record: StudentEvaluation, expectedRevision: number) {
    if (record.revision !== expectedRevision + 1) throw new Error("Invalid evaluation revision");
    const state = JSON.stringify(record);
    const result = expectedRevision === 0
      ? this.database.prepare("INSERT INTO student_evaluations (club_id, team_id, student_id, revision, state_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING").run(record.clubId, record.teamId, record.studentId, record.revision, state)
      : this.database.prepare("UPDATE student_evaluations SET revision = ?, state_json = ? WHERE club_id = ? AND team_id = ? AND student_id = ? AND revision = ?").run(record.revision, state, record.clubId, record.teamId, record.studentId, expectedRevision);
    return Number(result.changes) === 1;
  }
}

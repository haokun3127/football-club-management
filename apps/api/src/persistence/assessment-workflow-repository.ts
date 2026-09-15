import type { DatabaseSync } from "node:sqlite";
import type { AssessmentWorkingState, AssessmentWorkflowRepository } from "../application/assessment-workflow-types.js";

export class SqliteAssessmentWorkflowRepository implements AssessmentWorkflowRepository {
  constructor(private readonly database: DatabaseSync) {}
  version(clubId: string, taskId: string): string | null {
    const row = this.database.prepare("SELECT template_version_id FROM assessment_workflow_tasks WHERE club_id = ? AND task_id = ?").get(clubId, taskId);
    return typeof row?.template_version_id === "string" ? row.template_version_id : null;
  }
  pin(clubId: string, taskId: string, versionId: string) {
    const existing = this.version(clubId, taskId);
    if (existing && existing !== versionId) throw new Error("Assessment task version is already pinned");
    this.database.prepare("INSERT INTO assessment_workflow_tasks (club_id, task_id, template_version_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING").run(clubId, taskId, versionId);
  }
  get(clubId: string, taskId: string, studentId: string): AssessmentWorkingState | null {
    const row = this.database.prepare("SELECT state_json FROM assessment_workflow_students WHERE club_id = ? AND task_id = ? AND student_id = ?").get(clubId, taskId, studentId);
    if (!row) return null;
    if (typeof row.state_json !== "string") throw new Error("Invalid assessment working state");
    const state = JSON.parse(row.state_json) as AssessmentWorkingState;
    if (!Number.isInteger(state.revision) || state.revision < 0 || !state.entries || !Array.isArray(state.changes) || !Array.isArray(state.publications)) throw new Error("Invalid assessment working state");
    return state;
  }
  save(clubId: string, taskId: string, studentId: string, state: AssessmentWorkingState) {
    this.database.prepare(`INSERT INTO assessment_workflow_students (club_id, task_id, student_id, state_json) VALUES (?, ?, ?, ?)
      ON CONFLICT(club_id, task_id, student_id) DO UPDATE SET state_json = excluded.state_json`).run(clubId, taskId, studentId, JSON.stringify(state));
  }
}

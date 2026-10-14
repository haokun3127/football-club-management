import type { EntityId } from "@football-club/domain";
import type { AssessmentTask } from "../data-capability/types.js";
import type { DatabaseSync } from "node:sqlite";

type SqlRow = Record<string, unknown>;

export class AssessmentTaskRepository {
  constructor(private readonly database: DatabaseSync) {}

  listByClub(clubId: EntityId): AssessmentTask[] {
    const rows = this.database.prepare(`
      SELECT id, club_id, team_id, term_label, title, template_id, starts_on, due_on, student_ids_json, test_item_ids_json, source_event_id
      FROM assessment_tasks
      WHERE club_id = ?
        AND NULLIF(TRIM(team_id), '') IS NOT NULL
        AND NULLIF(TRIM(term_label), '') IS NOT NULL
      ORDER BY starts_on, due_on, id
    `).all(clubId) as SqlRow[];

    return rows.map(mapAssessmentTask);
  }

  save(task: AssessmentTask): void {
    const now = new Date().toISOString();
    this.database.prepare(`
      INSERT INTO assessment_tasks (
        id, club_id, team_id, term_label, title, template_id, starts_on, due_on, created_at, updated_at, student_ids_json, test_item_ids_json, source_event_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        club_id = excluded.club_id,
        team_id = excluded.team_id,
        term_label = excluded.term_label,
        title = excluded.title,
        template_id = excluded.template_id,
        starts_on = excluded.starts_on,
        due_on = excluded.due_on,
        updated_at = excluded.updated_at,
        student_ids_json = excluded.student_ids_json,
        test_item_ids_json = excluded.test_item_ids_json,
        source_event_id = excluded.source_event_id
    `).run(
      task.id,
      task.clubId,
      task.teamId,
      task.termLabel,
      task.title,
      task.templateId,
      task.startsOn,
      task.dueOn,
      now,
      now,
      task.studentIds ? JSON.stringify(task.studentIds) : null,
      task.testItemIds ? JSON.stringify(task.testItemIds) : null,
      task.sourceEventId ?? null,
    );
  }

  insertIfAbsent(task: AssessmentTask): void {
    const now = new Date().toISOString();
    this.database.prepare(`
      INSERT INTO assessment_tasks (
        id, club_id, team_id, term_label, title, template_id, starts_on, due_on, created_at, updated_at, student_ids_json, test_item_ids_json, source_event_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(
      task.id,
      task.clubId,
      task.teamId,
      task.termLabel,
      task.title,
      task.templateId,
      task.startsOn,
      task.dueOn,
      now,
      now,
      task.studentIds ? JSON.stringify(task.studentIds) : null,
      task.testItemIds ? JSON.stringify(task.testItemIds) : null,
      task.sourceEventId ?? null,
    );
  }
}

function mapAssessmentTask(row: SqlRow): AssessmentTask {
  const required = (key: string): string => {
    const value = row[key];
    if (typeof value !== "string") throw new Error(`Expected ${key} to be a string.`);
    return value;
  };

  return {
    id: required("id"),
    clubId: required("club_id"),
    teamId: required("team_id"),
    termLabel: required("term_label"),
    title: required("title"),
    templateId: required("template_id"),
    startsOn: required("starts_on"),
    dueOn: required("due_on"),
    ...(typeof row.student_ids_json === "string" ? {studentIds: JSON.parse(row.student_ids_json) as string[]} : {}),
    ...(typeof row.test_item_ids_json === "string" ? {testItemIds: JSON.parse(row.test_item_ids_json) as string[]} : {}),
    ...(typeof row.source_event_id === "string" ? {sourceEventId: row.source_event_id} : {}),
  };
}

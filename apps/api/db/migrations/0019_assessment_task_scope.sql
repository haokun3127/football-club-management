ALTER TABLE assessment_tasks ADD COLUMN team_id TEXT REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE assessment_tasks ADD COLUMN term_label TEXT;
ALTER TABLE player_assessments ADD COLUMN assessment_task_id TEXT REFERENCES assessment_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_tasks_club_team_term
  ON assessment_tasks (club_id, team_id, term_label, starts_on, due_on);

CREATE INDEX IF NOT EXISTS idx_player_assessments_task_student
  ON player_assessments (club_id, assessment_task_id, student_id, assessed_at);

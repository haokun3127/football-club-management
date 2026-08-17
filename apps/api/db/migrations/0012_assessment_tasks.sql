CREATE TABLE IF NOT EXISTS assessment_tasks (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  starts_on TEXT NOT NULL,
  due_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (due_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_assessment_tasks_club_dates
  ON assessment_tasks (club_id, starts_on, due_on, id);

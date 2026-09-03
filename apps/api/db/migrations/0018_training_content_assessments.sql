CREATE TABLE IF NOT EXISTS training_content_assessments (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  training_project_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  note TEXT,
  assessed_by_coach_id TEXT NOT NULL,
  assessed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, event_id, student_id, training_project_id)
);

CREATE INDEX IF NOT EXISTS idx_training_content_assessments_event
  ON training_content_assessments (club_id, event_id, student_id, training_project_id);

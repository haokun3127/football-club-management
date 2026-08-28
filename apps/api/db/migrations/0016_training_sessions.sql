CREATE TABLE training_sessions (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('team', 'small_group', 'private', 'specialty')),
  session_plan_id TEXT REFERENCES session_plans(id) ON DELETE SET NULL,
  intensity TEXT CHECK (intensity IS NULL OR intensity IN ('low', 'medium', 'high')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, event_id)
);

CREATE INDEX idx_training_sessions_club_event
  ON training_sessions (club_id, event_id);

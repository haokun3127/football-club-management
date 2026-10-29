CREATE TABLE IF NOT EXISTS training_content_assessment_revisions (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  PRIMARY KEY (club_id, event_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  match_type TEXT NOT NULL,
  opponent_name TEXT,
  home_score REAL,
  away_score REAL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, event_id)
);

CREATE TABLE IF NOT EXISTS match_events (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  type TEXT NOT NULL,
  student_id TEXT NOT NULL,
  minute INTEGER,
  linked_metric_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE INDEX IF NOT EXISTS idx_match_events_club_match_created
  ON match_events (club_id, match_id, created_at, id);

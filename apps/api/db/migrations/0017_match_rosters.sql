CREATE TABLE IF NOT EXISTS match_rosters (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  team_id TEXT,
  started INTEGER NOT NULL,
  minutes_played INTEGER,
  position TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE INDEX IF NOT EXISTS idx_match_rosters_club_match_student
  ON match_rosters (club_id, match_id, student_id);

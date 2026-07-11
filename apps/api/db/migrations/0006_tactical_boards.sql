CREATE TABLE tactical_boards (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  formation_name TEXT NOT NULL,
  pitch_type TEXT NOT NULL,
  players_json TEXT NOT NULL,
  updated_by_coach_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, event_id),
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX idx_tactical_boards_club_event ON tactical_boards(club_id, event_id);

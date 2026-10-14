CREATE TABLE coach_assignments (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id),
  coach_id TEXT NOT NULL REFERENCES coach_profiles(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  role TEXT NOT NULL CHECK(role IN ('head_coach','assistant_coach','guest_coach')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(club_id, team_id, coach_id)
);

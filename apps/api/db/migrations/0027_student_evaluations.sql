CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_club_identity ON teams (club_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_club_identity ON student_profiles (club_id, id);
-- A current evaluation and its immutable snapshots belong to one team/student pair.
CREATE TABLE IF NOT EXISTS student_evaluations (
  club_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  state_json TEXT NOT NULL,
  PRIMARY KEY (club_id, team_id, student_id),
  FOREIGN KEY (club_id, team_id) REFERENCES teams (club_id, id),
  FOREIGN KEY (club_id, student_id) REFERENCES student_profiles (club_id, id)
);

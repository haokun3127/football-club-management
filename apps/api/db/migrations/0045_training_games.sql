-- Training games are additive. Existing matches, attendance and financial facts are untouched.
CREATE TABLE training_games (
  club_id TEXT NOT NULL,
  id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  state TEXT NOT NULL CHECK (state IN ('draft', 'completed', 'voided')),
  root_json TEXT NOT NULL,
  PRIMARY KEY (club_id, id),
  FOREIGN KEY (club_id) REFERENCES clubs(id),
  FOREIGN KEY (event_id) REFERENCES calendar_events(id)
);
CREATE INDEX training_games_by_event ON training_games (club_id, event_id);
CREATE TABLE training_game_participants (
  club_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('A', 'B')),
  name_snapshot TEXT NOT NULL,
  PRIMARY KEY (club_id, game_id, student_id),
  FOREIGN KEY (club_id, game_id) REFERENCES training_games(club_id, id)
);
CREATE TABLE training_game_events (
  club_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  event_json TEXT NOT NULL,
  PRIMARY KEY (club_id, game_id, id),
  FOREIGN KEY (club_id, game_id) REFERENCES training_games(club_id, id)
);
CREATE TABLE training_game_revisions (
  club_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  revision_json TEXT NOT NULL,
  PRIMARY KEY (club_id, game_id, revision),
  UNIQUE (club_id, event_id, request_id),
  FOREIGN KEY (club_id, game_id) REFERENCES training_games(club_id, id)
);

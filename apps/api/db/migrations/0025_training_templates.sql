CREATE TABLE training_templates (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id),
  owner_user_id TEXT NOT NULL REFERENCES user_accounts(id),
  visibility TEXT NOT NULL CHECK(visibility IN ('private','club')),
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX training_templates_club ON training_templates(club_id,owner_user_id);

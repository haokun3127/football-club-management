CREATE TABLE backoffice_credentials (
  club_id TEXT NOT NULL REFERENCES clubs(id),
  username TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user_accounts(id),
  password_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (club_id, username),
  UNIQUE (club_id, user_id)
);
CREATE TABLE backoffice_sessions (
  token_hash TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  username TEXT NOT NULL,
  user_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (club_id, username) REFERENCES backoffice_credentials(club_id, username)
);
CREATE INDEX backoffice_sessions_user ON backoffice_sessions(club_id, user_id);
CREATE TABLE backoffice_login_attempts (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

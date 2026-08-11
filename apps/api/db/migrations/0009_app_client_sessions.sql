CREATE TABLE IF NOT EXISTS app_client_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  app_client_id TEXT NOT NULL REFERENCES club_app_clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  membership_id TEXT NOT NULL REFERENCES club_user_memberships(id) ON DELETE CASCADE,
  active_role TEXT CHECK (active_role IN ('parent', 'coach') OR active_role IS NULL),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_client_sessions_token
  ON app_client_sessions (token_hash);

CREATE INDEX IF NOT EXISTS idx_app_client_sessions_scope
  ON app_client_sessions (club_id, app_client_id, user_id, membership_id, expires_at);

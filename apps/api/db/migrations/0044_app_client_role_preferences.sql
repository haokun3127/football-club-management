CREATE TABLE IF NOT EXISTS app_client_role_preferences (
 id TEXT PRIMARY KEY,
 club_id TEXT NOT NULL REFERENCES clubs(id),
 app_client_id TEXT NOT NULL REFERENCES club_app_clients(id),
 user_id TEXT NOT NULL REFERENCES user_accounts(id),
 default_role TEXT CHECK(default_role IN ('parent','coach')),
 last_active_role TEXT CHECK(last_active_role IN ('parent','coach')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(club_id,app_client_id,user_id)
);

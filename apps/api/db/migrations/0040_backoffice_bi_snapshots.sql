CREATE TABLE backoffice_bi_snapshots (
 id TEXT PRIMARY KEY, club_id TEXT NOT NULL REFERENCES clubs(id), actor_id TEXT NOT NULL REFERENCES user_accounts(id),
 topic TEXT NOT NULL, filters_json TEXT NOT NULL, data_json TEXT NOT NULL, fact_version TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX idx_backoffice_bi_snapshots_club ON backoffice_bi_snapshots(club_id,created_at);

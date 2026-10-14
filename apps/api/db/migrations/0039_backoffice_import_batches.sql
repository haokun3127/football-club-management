CREATE TABLE backoffice_import_batches (
 id TEXT PRIMARY KEY, club_id TEXT NOT NULL REFERENCES clubs(id), actor_id TEXT NOT NULL REFERENCES user_accounts(id),
 resource_key TEXT NOT NULL, source_name TEXT NOT NULL, mapping_version TEXT NOT NULL, blank_policy TEXT NOT NULL CHECK(blank_policy IN ('preserve','clear')),
 fields_json TEXT NOT NULL, rows_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX idx_backoffice_import_batches_club ON backoffice_import_batches(club_id,created_at);

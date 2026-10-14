CREATE TABLE backoffice_standard_versions (
 id TEXT PRIMARY KEY,
 club_id TEXT NOT NULL REFERENCES clubs(id),
 family_id TEXT NOT NULL,
 version TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('draft','active','archived')),
 definition_json TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(club_id,family_id,version)
);
CREATE INDEX backoffice_standard_club ON backoffice_standard_versions(club_id,status);

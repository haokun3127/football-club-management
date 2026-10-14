CREATE TABLE assessment_mapping_versions (
 id TEXT PRIMARY KEY,
 club_id TEXT NOT NULL REFERENCES clubs(id),
 test_item_id TEXT NOT NULL REFERENCES assessment_test_items(id),
 stage TEXT NOT NULL CHECK(stage IN ('raw_score','score_grade')),
 status TEXT NOT NULL CHECK(status IN ('draft','active','archived')),
 definition_json TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX assessment_mapping_versions_scope ON assessment_mapping_versions(club_id,test_item_id,stage,status);

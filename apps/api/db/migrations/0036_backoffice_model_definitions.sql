CREATE TABLE backoffice_model_definitions (
 template_version_id TEXT PRIMARY KEY REFERENCES assessment_template_versions(id),
 club_id TEXT NOT NULL REFERENCES clubs(id),
 definition_json TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX backoffice_model_definitions_scope ON backoffice_model_definitions(club_id,template_version_id);

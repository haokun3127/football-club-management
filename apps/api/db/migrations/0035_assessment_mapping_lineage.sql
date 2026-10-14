ALTER TABLE assessment_metric_bindings ADD COLUMN score_mapping_version_id TEXT REFERENCES assessment_mapping_versions(id);
ALTER TABLE assessment_metric_bindings ADD COLUMN grade_mapping_version_id TEXT REFERENCES assessment_mapping_versions(id);
ALTER TABLE assessment_raw_results ADD COLUMN mapping_json TEXT;

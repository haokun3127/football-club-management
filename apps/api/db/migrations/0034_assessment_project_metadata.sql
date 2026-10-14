ALTER TABLE assessment_test_items ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive'));
ALTER TABLE assessment_test_items ADD COLUMN tags_json TEXT;
ALTER TABLE assessment_test_items ADD COLUMN applicability TEXT;
ALTER TABLE assessment_test_items ADD COLUMN precision INTEGER CHECK(precision IS NULL OR (precision >= 0 AND precision <= 8));
ALTER TABLE assessment_test_items ADD COLUMN minimum_value REAL;
ALTER TABLE assessment_test_items ADD COLUMN maximum_value REAL;
ALTER TABLE assessment_test_items ADD COLUMN direction TEXT CHECK(direction IS NULL OR direction IN ('higher','lower','neutral'));

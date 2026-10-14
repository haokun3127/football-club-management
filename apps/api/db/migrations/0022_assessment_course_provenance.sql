-- Historical results retain null course provenance; never invent a historical course.
ALTER TABLE assessment_raw_results ADD COLUMN event_id TEXT REFERENCES calendar_events(id);
ALTER TABLE assessment_raw_results ADD COLUMN occurred_at TEXT;
ALTER TABLE assessment_raw_results ADD COLUMN recorded_at TEXT;

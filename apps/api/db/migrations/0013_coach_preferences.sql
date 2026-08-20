ALTER TABLE coach_profiles ADD COLUMN accepts_private_lessons INTEGER NOT NULL DEFAULT 1;
ALTER TABLE coach_profiles ADD COLUMN availability_json TEXT;

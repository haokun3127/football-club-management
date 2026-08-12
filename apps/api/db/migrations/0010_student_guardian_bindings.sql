CREATE TABLE IF NOT EXISTS student_guardian_bindings (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  is_primary_contact INTEGER NOT NULL CHECK (is_primary_contact IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_guardian_bindings_parent
  ON student_guardian_bindings (club_id, parent_id, student_id);

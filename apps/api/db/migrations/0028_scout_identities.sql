CREATE TABLE IF NOT EXISTS person_identities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  encrypted_document TEXT NOT NULL,
  masked_document TEXT NOT NULL,
  encryption_version TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS identity_key_versions (
  version TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS person_identity_digests (
  key_version TEXT NOT NULL REFERENCES identity_key_versions(version),
  digest TEXT NOT NULL,
  person_id TEXT NOT NULL REFERENCES person_identities(id),
  PRIMARY KEY (key_version, digest),
  UNIQUE (person_id, key_version)
);
CREATE TABLE IF NOT EXISTS club_player_identities (
  club_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  person_id TEXT NOT NULL REFERENCES person_identities(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (club_id, student_id),
  UNIQUE (club_id, person_id),
  FOREIGN KEY (club_id, student_id) REFERENCES student_profiles(club_id, id)
);
CREATE TABLE IF NOT EXISTS scout_profiles (
  club_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'enrolled')),
  PRIMARY KEY (club_id, student_id),
  FOREIGN KEY (club_id, student_id) REFERENCES club_player_identities(club_id, student_id)
);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL,
  locale TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_accounts (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone TEXT,
  roles_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS club_user_memberships (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  roles_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_user_memberships_club_user
  ON club_user_memberships (club_id, user_id, status);

CREATE TABLE IF NOT EXISTS parent_profiles (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parent_profiles_club_user
  ON parent_profiles (club_id, user_id);

CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'unspecified')),
  dominant_foot TEXT CHECK (dominant_foot IN ('left', 'right', 'both', 'unknown')),
  current_level TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_club
  ON student_profiles (club_id);

CREATE TABLE IF NOT EXISTS coach_profiles (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialties_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coach_profiles_club_user
  ON coach_profiles (club_id, user_id, status);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('introductory', 'development', 'advanced', 'elite')),
  default_coach_id TEXT,
  default_location_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (default_coach_id) REFERENCES coach_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teams_club_status
  ON teams (club_id, status);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  is_primary_team INTEGER NOT NULL CHECK (is_primary_team IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'graduated', 'left')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, team_id, student_id, starts_at)
);

CREATE INDEX IF NOT EXISTS idx_team_members_club_team
  ON team_members (club_id, team_id, status);

CREATE INDEX IF NOT EXISTS idx_team_members_club_student
  ON team_members (club_id, student_id, status);

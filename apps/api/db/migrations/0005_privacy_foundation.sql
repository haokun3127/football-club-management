CREATE TABLE IF NOT EXISTS privacy_field_policies (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('student', 'parent', 'coach', 'user', 'external_record')),
  data_class TEXT NOT NULL CHECK (data_class IN ('public', 'internal', 'personal', 'sensitive', 'minor_sensitive')),
  visible_to_roles_json TEXT NOT NULL,
  exportable INTEGER NOT NULL CHECK (exportable IN (0, 1)),
  retention_category TEXT NOT NULL,
  redaction_mode TEXT NOT NULL CHECK (redaction_mode IN ('none', 'mask', 'hide', 'summary_only')),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_privacy_field_policies_club_active
  ON privacy_field_policies (club_id, active, data_class);

CREATE TABLE IF NOT EXISTS privacy_notice_versions (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content_ref TEXT,
  effective_at TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, version)
);

CREATE INDEX IF NOT EXISTS idx_privacy_notice_versions_club_active
  ON privacy_notice_versions (club_id, active, effective_at);

CREATE TABLE IF NOT EXISTS student_consent_records (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN (
    'core_training_service',
    'schedule_attendance',
    'assessment_metrics',
    'match_stats',
    'insurance_lesson_status',
    'media_capture',
    'media_public_share',
    'ai_performance_analysis',
    'ai_video_editing',
    'marketing_contact'
  )),
  status TEXT NOT NULL CHECK (status IN ('granted', 'withdrawn', 'expired')),
  notice_version_id TEXT REFERENCES privacy_notice_versions(id) ON DELETE SET NULL,
  guardian_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
  relationship TEXT,
  source TEXT NOT NULL CHECK (source IN ('admin_recorded', 'parent_self_service', 'external_import')),
  evidence_ref TEXT,
  granted_at TEXT,
  withdrawn_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, student_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_student_consent_records_student
  ON student_consent_records (club_id, student_id, status);

CREATE TABLE IF NOT EXISTS consent_events (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('grant', 'withdraw')),
  actor_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
  record_id TEXT REFERENCES student_consent_records(id) ON DELETE SET NULL,
  occurred_at TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_events_student
  ON consent_events (club_id, student_id, occurred_at);

CREATE TABLE IF NOT EXISTS privacy_audit_logs (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  field_keys_json TEXT NOT NULL,
  data_classes_json TEXT NOT NULL,
  purpose TEXT NOT NULL,
  request_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_logs_club_created
  ON privacy_audit_logs (club_id, created_at);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_logs_target
  ON privacy_audit_logs (club_id, target_type, target_id);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('correction', 'deletion', 'withdraw_consent', 'restrict_processing', 'export_copy')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  requested_by_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
  resolved_by_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
  description TEXT,
  resolution_note TEXT,
  requested_at TEXT NOT NULL,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_student
  ON privacy_requests (club_id, student_id, status);

CREATE TABLE IF NOT EXISTS privacy_retention_policies (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  data_class TEXT NOT NULL CHECK (data_class IN ('public', 'internal', 'personal', 'sensitive', 'minor_sensitive')),
  retention_days INTEGER,
  action TEXT NOT NULL CHECK (action IN ('retain', 'anonymize', 'delete_after_review')),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, category)
);

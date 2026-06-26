CREATE TABLE IF NOT EXISTS student_contacts (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT,
  wechat TEXT,
  is_primary_contact INTEGER NOT NULL CHECK (is_primary_contact IN (0, 1)),
  receives_notifications INTEGER NOT NULL CHECK (receives_notifications IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_contacts_club_student
  ON student_contacts (club_id, student_id, is_primary_contact);

CREATE TABLE IF NOT EXISTS student_operational_profiles (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  external_ref TEXT,
  id_document_hash TEXT,
  region TEXT,
  school TEXT,
  acquisition_channel TEXT,
  student_status TEXT,
  communication_stage TEXT,
  responsible_coach_id TEXT REFERENCES coach_profiles(id) ON DELETE SET NULL,
  insurance_expires_at TEXT,
  total_checkins INTEGER,
  latest_checkin_at TEXT,
  total_recharges INTEGER,
  lesson_balance REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_operational_profiles_club_status
  ON student_operational_profiles (club_id, student_status, region, school);

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  value_kind TEXT NOT NULL,
  required INTEGER NOT NULL CHECK (required IN (0, 1)),
  options_json TEXT,
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, target, key)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  value_text TEXT,
  value_number REAL,
  value_boolean INTEGER CHECK (value_boolean IN (0, 1)),
  value_date TEXT,
  value_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, definition_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_target
  ON custom_field_values (club_id, target_type, target_id);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('training', 'match', 'other')),
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT,
  recurrence_rule_json TEXT,
  location_id TEXT,
  primary_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  owner_coach_id TEXT REFERENCES coach_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_club_time
  ON calendar_events (club_id, starts_at, ends_at, status);

CREATE TABLE IF NOT EXISTS event_participants (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, event_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_club_student
  ON event_participants (club_id, student_id, status);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  uri TEXT NOT NULL,
  checksum TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  payment_type TEXT,
  amount REAL,
  lesson_hours REAL,
  proof_attachment_id TEXT REFERENCES attachments(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  external_ref TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_club_student
  ON payment_events (club_id, student_id, occurred_at, status);

CREATE TABLE IF NOT EXISTS payment_reviews (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  payment_event_id TEXT NOT NULL REFERENCES payment_events(id) ON DELETE CASCADE,
  review_stage TEXT NOT NULL,
  reviewer_name TEXT,
  reviewed_at TEXT,
  approved INTEGER CHECK (approved IN (0, 1)),
  actual_received REAL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_credit_ledger (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES calendar_events(id) ON DELETE SET NULL,
  payment_event_id TEXT REFERENCES payment_events(id) ON DELETE SET NULL,
  occurred_at TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('credit', 'debit', 'adjustment', 'external_snapshot')),
  lesson_delta REAL NOT NULL,
  balance_after REAL,
  source TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_credit_ledger_club_student
  ON lesson_credit_ledger (club_id, student_id, occurred_at);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  purchased_at TEXT,
  expires_at TEXT NOT NULL,
  policy_number TEXT,
  provider TEXT,
  sport TEXT,
  approved INTEGER CHECK (approved IN (0, 1)),
  external_ref TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_club_expiry
  ON insurance_policies (club_id, student_id, expires_at);

CREATE TABLE IF NOT EXISTS communication_logs (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  channel TEXT,
  stage TEXT,
  contact_name TEXT,
  operator_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  next_follow_up_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_club_student
  ON communication_logs (club_id, student_id, occurred_at);

CREATE TABLE IF NOT EXISTS ability_metrics (
  id TEXT PRIMARY KEY,
  catalog_scope TEXT NOT NULL CHECK (catalog_scope IN ('system', 'club')),
  scope_club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  base_item_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  dimension_id TEXT NOT NULL,
  value_kind TEXT NOT NULL,
  metric_kind TEXT NOT NULL,
  unit TEXT,
  max_score REAL,
  source_kinds_json TEXT,
  version TEXT,
  status TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((catalog_scope = 'system' AND scope_club_id IS NULL) OR (catalog_scope = 'club' AND scope_club_id IS NOT NULL)),
  UNIQUE (catalog_scope, scope_club_id, code, version)
);

CREATE TABLE IF NOT EXISTS metric_graph_versions (
  id TEXT PRIMARY KEY,
  catalog_scope TEXT NOT NULL CHECK (catalog_scope IN ('system', 'club')),
  scope_club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  base_item_id TEXT,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((catalog_scope = 'system' AND scope_club_id IS NULL) OR (catalog_scope = 'club' AND scope_club_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS metric_dependencies (
  id TEXT PRIMARY KEY,
  catalog_scope TEXT NOT NULL CHECK (catalog_scope IN ('system', 'club')),
  scope_club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  base_item_id TEXT,
  graph_version_id TEXT NOT NULL REFERENCES metric_graph_versions(id) ON DELETE CASCADE,
  output_metric_id TEXT NOT NULL REFERENCES ability_metrics(id) ON DELETE CASCADE,
  input_metric_id TEXT NOT NULL REFERENCES ability_metrics(id) ON DELETE CASCADE,
  formula_id TEXT,
  weight REAL,
  role TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((catalog_scope = 'system' AND scope_club_id IS NULL) OR (catalog_scope = 'club' AND scope_club_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_metric_dependencies_graph_output
  ON metric_dependencies (graph_version_id, output_metric_id, sort_order);

CREATE TABLE IF NOT EXISTS metric_views (
  id TEXT PRIMARY KEY,
  catalog_scope TEXT NOT NULL CHECK (catalog_scope IN ('system', 'club')),
  scope_club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  base_item_id TEXT,
  graph_version_id TEXT NOT NULL REFERENCES metric_graph_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((catalog_scope = 'system' AND scope_club_id IS NULL) OR (catalog_scope = 'club' AND scope_club_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS metric_view_nodes (
  id TEXT PRIMARY KEY,
  catalog_scope TEXT NOT NULL CHECK (catalog_scope IN ('system', 'club')),
  scope_club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  base_item_id TEXT,
  view_id TEXT NOT NULL REFERENCES metric_views(id) ON DELETE CASCADE,
  metric_id TEXT REFERENCES ability_metrics(id) ON DELETE SET NULL,
  parent_view_node_id TEXT REFERENCES metric_view_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((catalog_scope = 'system' AND scope_club_id IS NULL) OR (catalog_scope = 'club' AND scope_club_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS assessment_templates (
  id TEXT PRIMARY KEY,
  catalog_scope TEXT NOT NULL CHECK (catalog_scope IN ('system', 'club')),
  scope_club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  base_item_id TEXT,
  name TEXT NOT NULL,
  age_group TEXT,
  team_level TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((catalog_scope = 'system' AND scope_club_id IS NULL) OR (catalog_scope = 'club' AND scope_club_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS assessment_template_versions (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  graph_version_id TEXT REFERENCES metric_graph_versions(id) ON DELETE SET NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, template_id, version)
);

CREATE TABLE IF NOT EXISTS assessment_metric_bindings (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  template_version_id TEXT NOT NULL REFERENCES assessment_template_versions(id) ON DELETE CASCADE,
  metric_id TEXT NOT NULL REFERENCES ability_metrics(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('input', 'output', 'reference', 'display_only')),
  formula_id TEXT,
  test_item_id TEXT,
  max_score REAL,
  weight REAL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessment_metric_bindings_version
  ON assessment_metric_bindings (club_id, template_version_id, sort_order);

CREATE TABLE IF NOT EXISTS assessment_test_items (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  metric_id TEXT NOT NULL REFERENCES ability_metrics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value_kind TEXT NOT NULL,
  unit TEXT,
  protocol TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_assessments (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  template_version_id TEXT REFERENCES assessment_template_versions(id) ON DELETE SET NULL,
  assessed_by_coach_id TEXT NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
  assessed_at TEXT NOT NULL,
  event_id TEXT REFERENCES calendar_events(id) ON DELETE SET NULL,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_raw_results (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES player_assessments(id) ON DELETE CASCADE,
  test_item_id TEXT NOT NULL REFERENCES assessment_test_items(id) ON DELETE CASCADE,
  metric_id TEXT NOT NULL REFERENCES ability_metrics(id) ON DELETE CASCADE,
  value_json TEXT NOT NULL,
  recorded_by_coach_id TEXT REFERENCES coach_profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_scores (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES player_assessments(id) ON DELETE CASCADE,
  metric_id TEXT NOT NULL REFERENCES ability_metrics(id) ON DELETE CASCADE,
  value_json TEXT NOT NULL,
  normalized_score REAL,
  raw_result_id TEXT REFERENCES assessment_raw_results(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_metric_records (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  metric_id TEXT NOT NULL REFERENCES ability_metrics(id) ON DELETE CASCADE,
  value_json TEXT NOT NULL,
  source TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  event_id TEXT REFERENCES calendar_events(id) ON DELETE SET NULL,
  assessment_id TEXT REFERENCES player_assessments(id) ON DELETE SET NULL,
  template_version_id TEXT REFERENCES assessment_template_versions(id) ON DELETE SET NULL,
  raw_result_id TEXT REFERENCES assessment_raw_results(id) ON DELETE SET NULL,
  source_record_id TEXT,
  recorded_by_coach_id TEXT REFERENCES coach_profiles(id) ON DELETE SET NULL,
  visibility TEXT,
  confidence REAL,
  note TEXT,
  lineage_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_player_metric_records_club_student
  ON player_metric_records (club_id, student_id, metric_id, occurred_at);

CREATE TABLE IF NOT EXISTS derived_metric_definitions (
  id TEXT PRIMARY KEY,
  catalog_scope TEXT NOT NULL CHECK (catalog_scope IN ('system', 'club')),
  scope_club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  base_item_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  output_metric_id TEXT NOT NULL REFERENCES ability_metrics(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  input_metric_ids_json TEXT NOT NULL,
  version TEXT NOT NULL,
  weights_json TEXT,
  input_scale REAL,
  max_score REAL,
  rounding TEXT,
  input_window_days INTEGER,
  output_unit TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((catalog_scope = 'system' AND scope_club_id IS NULL) OR (catalog_scope = 'club' AND scope_club_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS metric_lineages (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  output_record_id TEXT NOT NULL REFERENCES player_metric_records(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES derived_metric_definitions(id) ON DELETE CASCADE,
  definition_version TEXT NOT NULL,
  input_record_ids_json TEXT NOT NULL,
  computed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS external_system_connections (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'disabled')),
  config_json TEXT NOT NULL,
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_external_system_connections_club_status
  ON external_system_connections (club_id, status);

CREATE TABLE IF NOT EXISTS club_app_clients (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('wechat_miniprogram', 'wechat_official_account', 'douyin', 'video_account', 'xiaohongshu', 'admin_portal')),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'disabled')),
  app_id TEXT,
  client_key TEXT NOT NULL,
  theme_json TEXT,
  navigation_json TEXT,
  role_entrypoints_json TEXT,
  feature_overrides_json TEXT,
  visibility_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, client_key),
  UNIQUE (club_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_club_app_clients_club_status
  ON club_app_clients (club_id, status);

CREATE TABLE IF NOT EXISTS external_table_mappings (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES external_system_connections(id) ON DELETE CASCADE,
  external_table_key TEXT NOT NULL,
  target_type TEXT NOT NULL,
  mapping_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  config_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, connection_id, external_table_key, mapping_version)
);

CREATE INDEX IF NOT EXISTS idx_external_table_mappings_club_connection
  ON external_table_mappings (club_id, connection_id, status);

CREATE TABLE IF NOT EXISTS external_sync_policies (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES external_system_connections(id) ON DELETE CASCADE,
  table_mapping_id TEXT REFERENCES external_table_mappings(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'disabled')),
  trigger_mode TEXT NOT NULL CHECK (trigger_mode IN ('manual', 'scheduled')),
  schedule_json TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'bidirectional')),
  apply_policy TEXT NOT NULL CHECK (apply_policy IN ('manual_confirm', 'auto_apply_valid')),
  conflict_policy TEXT NOT NULL CHECK (conflict_policy IN ('manual_review', 'external_wins', 'system_wins')),
  writeback_policy TEXT NOT NULL CHECK (writeback_policy IN ('disabled', 'status_only')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_external_sync_policies_club_connection_status
  ON external_sync_policies (club_id, connection_id, status);

CREATE TABLE IF NOT EXISTS external_field_mappings (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  table_mapping_id TEXT NOT NULL REFERENCES external_table_mappings(id) ON DELETE CASCADE,
  external_field_key TEXT NOT NULL,
  target_field_key TEXT NOT NULL,
  target_field_kind TEXT NOT NULL,
  required INTEGER NOT NULL CHECK (required IN (0, 1)),
  transform_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, table_mapping_id, external_field_key)
);

CREATE INDEX IF NOT EXISTS idx_external_field_mappings_club_table
  ON external_field_mappings (club_id, table_mapping_id);

CREATE TABLE IF NOT EXISTS external_sync_runs (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES external_system_connections(id) ON DELETE CASCADE,
  table_mapping_id TEXT REFERENCES external_table_mappings(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TEXT,
  finished_at TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  imported_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  error_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_external_sync_runs_club_connection
  ON external_sync_runs (club_id, connection_id, created_at);

CREATE INDEX IF NOT EXISTS idx_external_sync_runs_club_status
  ON external_sync_runs (club_id, status, created_at);

CREATE TABLE IF NOT EXISTS external_raw_records (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES external_system_connections(id) ON DELETE CASCADE,
  table_mapping_id TEXT REFERENCES external_table_mappings(id) ON DELETE SET NULL,
  sync_run_id TEXT REFERENCES external_sync_runs(id) ON DELETE SET NULL,
  external_record_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'confirmed', 'rejected', 'linked')),
  validation_errors_json TEXT,
  normalized_preview_json TEXT,
  imported_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (connection_id, external_record_id, payload_hash)
);

CREATE INDEX IF NOT EXISTS idx_external_raw_records_club_status
  ON external_raw_records (club_id, review_status, created_at);

CREATE INDEX IF NOT EXISTS idx_external_raw_records_club_sync_run
  ON external_raw_records (club_id, sync_run_id);

CREATE TABLE IF NOT EXISTS external_record_links (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  raw_record_id TEXT NOT NULL REFERENCES external_raw_records(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  link_status TEXT NOT NULL CHECK (link_status IN ('confirmed', 'rejected', 'superseded')),
  confirmed_by TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
  confirmed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_external_record_links_club_raw
  ON external_record_links (club_id, raw_record_id, link_status);

CREATE INDEX IF NOT EXISTS idx_external_record_links_club_target
  ON external_record_links (club_id, target_type, target_id);

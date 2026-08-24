CREATE TABLE session_plans (
  id TEXT PRIMARY KEY,
  catalog_scope TEXT NOT NULL CHECK (catalog_scope IN ('system', 'club')),
  catalog_club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  base_item_id TEXT,
  name TEXT NOT NULL,
  objective_ids_json TEXT NOT NULL,
  metric_ids_json TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (catalog_scope = 'system' AND catalog_club_id IS NULL)
    OR (catalog_scope = 'club' AND catalog_club_id IS NOT NULL)
  )
);

CREATE INDEX idx_session_plans_catalog_club
  ON session_plans (catalog_scope, catalog_club_id, updated_at, id);

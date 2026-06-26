CREATE TABLE IF NOT EXISTS http_idempotency_records (
  key TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  payload TEXT NOT NULL,
  content_type TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_http_idempotency_records_expires
  ON http_idempotency_records (expires_at);

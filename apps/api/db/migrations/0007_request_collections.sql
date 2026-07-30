CREATE TABLE private_lesson_requests (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  goals_json TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL,
  requested_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX idx_private_lesson_requests_club ON private_lesson_requests(club_id, student_id, created_at);

CREATE TABLE event_change_requests (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  new_starts_at TEXT,
  new_venue TEXT,
  note TEXT,
  status TEXT NOT NULL,
  requested_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE INDEX idx_event_change_requests_club ON event_change_requests(club_id, event_id, created_at);

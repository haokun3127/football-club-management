-- Training participation facts are independent of lesson balances and payments.
CREATE TABLE IF NOT EXISTS training_records (
  club_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  state_json TEXT NOT NULL,
  PRIMARY KEY (club_id, event_id, student_id),
  FOREIGN KEY (club_id, event_id, student_id)
    REFERENCES event_participants (club_id, event_id, student_id)
);

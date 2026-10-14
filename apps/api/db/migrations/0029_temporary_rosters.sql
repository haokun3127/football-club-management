CREATE TABLE temporary_event_participants (
  club_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0,1)),
  revision INTEGER NOT NULL CHECK (revision > 0),
  history_json TEXT NOT NULL CHECK (json_valid(history_json)),
  PRIMARY KEY (club_id,event_id,student_id),
  FOREIGN KEY (club_id,event_id,student_id) REFERENCES event_participants(club_id,event_id,student_id)
);

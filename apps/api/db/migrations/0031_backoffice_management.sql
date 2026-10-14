CREATE TABLE training_locations (
  id TEXT NOT NULL, club_id TEXT NOT NULL REFERENCES clubs(id),
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(club_id,id)
);
CREATE TABLE club_terms (
  id TEXT NOT NULL, club_id TEXT NOT NULL REFERENCES clubs(id),
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(club_id,id)
);
CREATE TABLE content_articles (
  id TEXT NOT NULL, club_id TEXT NOT NULL REFERENCES clubs(id),
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(club_id,id)
);
CREATE TABLE training_drills (
  id TEXT NOT NULL, club_id TEXT NOT NULL REFERENCES clubs(id),
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(club_id,id)
);
CREATE TABLE backoffice_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, club_id TEXT NOT NULL REFERENCES clubs(id), resource TEXT NOT NULL, record_id TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES user_accounts(id), occurred_at TEXT NOT NULL, action TEXT NOT NULL,
 before_json TEXT, after_json TEXT, request_id TEXT NOT NULL
);
CREATE INDEX idx_backoffice_audit_record ON backoffice_audit(club_id,resource,record_id,id);
CREATE TABLE backoffice_grants (
 club_id TEXT NOT NULL REFERENCES clubs(id), user_id TEXT NOT NULL REFERENCES user_accounts(id),
 capability TEXT NOT NULL CHECK(capability IN ('sensitive','export','assessment','service','finance')),
 PRIMARY KEY(club_id,user_id,capability)
);
CREATE TABLE backoffice_mutations (
 club_id TEXT NOT NULL REFERENCES clubs(id), actor_user_id TEXT NOT NULL REFERENCES user_accounts(id), request_id TEXT NOT NULL,
 request_hash TEXT NOT NULL, response_json TEXT NOT NULL CHECK(json_valid(response_json)),
 PRIMARY KEY(club_id,actor_user_id,request_id)
);

ALTER TABLE coach_assignments ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive'));

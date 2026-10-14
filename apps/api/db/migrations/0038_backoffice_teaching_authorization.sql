ALTER TABLE backoffice_grants RENAME TO backoffice_grants_v1;
CREATE TABLE backoffice_grants (
 club_id TEXT NOT NULL REFERENCES clubs(id),
 user_id TEXT NOT NULL REFERENCES user_accounts(id),
 capability TEXT NOT NULL CHECK(capability IN ('sensitive','export','assessment','assessment_entry','service','finance')),
 PRIMARY KEY(club_id,user_id,capability)
);
INSERT INTO backoffice_grants SELECT club_id,user_id,capability FROM backoffice_grants_v1;
DROP TABLE backoffice_grants_v1;

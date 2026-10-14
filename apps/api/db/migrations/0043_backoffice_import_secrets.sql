CREATE TABLE backoffice_import_secrets (club_id TEXT NOT NULL REFERENCES clubs(id), raw_id TEXT NOT NULL, encrypted_identity TEXT NOT NULL, PRIMARY KEY(club_id,raw_id));

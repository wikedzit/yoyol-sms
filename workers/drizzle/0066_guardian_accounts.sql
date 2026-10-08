ALTER TABLE guardians ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX guardians_school_user ON guardians (school_id, user_id);

ALTER TABLE invitations ADD COLUMN guardian_id INTEGER REFERENCES guardians(id) ON DELETE SET NULL;

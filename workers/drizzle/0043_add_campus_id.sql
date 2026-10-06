ALTER TABLE students ADD COLUMN campus_id integer REFERENCES campus(id) ON DELETE SET NULL;
ALTER TABLE teachers ADD COLUMN campus_id integer REFERENCES campus(id) ON DELETE SET NULL;

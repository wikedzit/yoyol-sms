ALTER TABLE school_memberships ADD COLUMN teacher_id integer;
ALTER TABLE school_memberships ADD COLUMN student_id integer;

CREATE TABLE IF NOT EXISTS student_guardians (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  student_id integer NOT NULL,
  user_id integer NOT NULL,
  FOREIGN KEY (school_id) REFERENCES school(id) ON DELETE cascade,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE cascade,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS student_guardians_student_user
  ON student_guardians (student_id, user_id);

CREATE TABLE mod_attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  form_class_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  term_id INTEGER,
  attendance_date TEXT NOT NULL,
  status TEXT NOT NULL,
  comment TEXT,
  teacher_id INTEGER,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_attendance_records_student_date
  ON mod_attendance_records (student_id, attendance_date);

CREATE INDEX mod_attendance_records_school_id ON mod_attendance_records (school_id);

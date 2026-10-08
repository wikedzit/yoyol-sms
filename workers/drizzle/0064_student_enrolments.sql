CREATE TABLE student_enrolments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  form_class_id INTEGER REFERENCES form_classes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'enrolled',
  move_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX student_enrolments_student_year
  ON student_enrolments (student_id, academic_year_id);

INSERT INTO student_enrolments (
  school_id,
  student_id,
  academic_year_id,
  form_class_id,
  status,
  created_at,
  updated_at
)
SELECT
  school_id,
  id,
  academic_year_id,
  form_class_id,
  'enrolled',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM students
WHERE school_id IS NOT NULL AND academic_year_id IS NOT NULL;

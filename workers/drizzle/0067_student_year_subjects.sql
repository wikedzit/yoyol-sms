CREATE TABLE student_year_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  combination_id INTEGER REFERENCES subject_combinations(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX student_year_subjects_unique
  ON student_year_subjects (student_id, academic_year_id, subject_id);

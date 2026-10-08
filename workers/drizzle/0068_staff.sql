ALTER TABLE teachers ADD COLUMN middle_name TEXT;
ALTER TABLE teachers ADD COLUMN staff_type TEXT NOT NULL DEFAULT 'teaching';

CREATE TABLE teaching_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  form_class_id INTEGER NOT NULL REFERENCES form_classes(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX teaching_assignments_unique
  ON teaching_assignments (teacher_id, academic_year_id, subject_id, form_class_id);

CREATE TABLE mod_timetable_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_timetable_periods_school_name
  ON mod_timetable_periods (school_id, name);

CREATE TABLE mod_timetable_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year_id INTEGER NOT NULL,
  form_class_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  period_id INTEGER NOT NULL,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_timetable_entries_teacher
  ON mod_timetable_entries (school_id, academic_year_id, day, period_id, teacher_id);

CREATE UNIQUE INDEX mod_timetable_entries_class
  ON mod_timetable_entries (school_id, academic_year_id, day, period_id, form_class_id);

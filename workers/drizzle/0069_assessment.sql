CREATE TABLE assessment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX assessment_types_school_key ON assessment_types (school_id, key);

CREATE TABLE grading_scales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL REFERENCES academic_levels(id) ON DELETE CASCADE,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  assessment_type_id INTEGER NOT NULL REFERENCES assessment_types(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  grade_label TEXT NOT NULL,
  comment TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX results_one_entry
  ON results (student_id, term_id, subject_id, assessment_type_id);

CREATE TABLE result_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  released_at INTEGER
);

CREATE UNIQUE INDEX result_releases_school_term ON result_releases (school_id, term_id);

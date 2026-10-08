CREATE TABLE mod_leadership_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  retired INTEGER NOT NULL DEFAULT 0,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_leadership_positions_school_name
  ON mod_leadership_positions (school_id, name);

CREATE TABLE mod_leadership_appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  ended INTEGER NOT NULL DEFAULT 0,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

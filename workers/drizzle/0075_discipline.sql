CREATE TABLE mod_discipline_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_discipline_types_school_name
  ON mod_discipline_types (school_id, name);

CREATE TABLE mod_discipline_severities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_discipline_severities_school_name
  ON mod_discipline_severities (school_id, name);

CREATE TABLE mod_discipline_incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  type_id INTEGER NOT NULL,
  severity_id INTEGER NOT NULL,
  teacher_id INTEGER,
  description TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

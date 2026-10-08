CREATE TABLE mod_clubs_clubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  patron_id INTEGER NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_clubs_clubs_school_name
  ON mod_clubs_clubs (school_id, name);

CREATE TABLE mod_clubs_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_clubs_memberships_year
  ON mod_clubs_memberships (school_id, club_id, student_id, academic_year_id);

CREATE TABLE mod_clubs_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  teacher_id INTEGER,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

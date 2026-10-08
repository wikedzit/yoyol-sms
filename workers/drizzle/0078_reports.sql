CREATE TABLE mod_reports_previews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  csv_text TEXT NOT NULL,
  summary TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_reports_previews_school_user
  ON mod_reports_previews (school_id, created_by);

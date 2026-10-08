CREATE TABLE subject_combinations (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer REFERENCES school(id) ON DELETE SET NULL,
  level_id integer NOT NULL REFERENCES academic_levels(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE UNIQUE INDEX subject_combinations_school_name_unique ON subject_combinations (school_id, name);

CREATE TABLE combination_subjects (
  combination_id integer NOT NULL REFERENCES subject_combinations(id) ON DELETE CASCADE,
  subject_id integer NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_id integer REFERENCES school(id) ON DELETE SET NULL,
  PRIMARY KEY (combination_id, subject_id)
);

-- Child records belong to a school. school.owner_user_id stays as the founding account.
-- school_themes names owner_user_id in a table-level foreign key, which SQLite
-- cannot drop in place, so that table is rebuilt.

PRAGMA foreign_keys=OFF;

DROP INDEX IF EXISTS students_owner_admission_number;
DROP INDEX IF EXISTS subjects_owner_code_unique;
DROP INDEX IF EXISTS academic_years_owner_name_unique;
DROP INDEX IF EXISTS academic_levels_owner_type_unique;
DROP INDEX IF EXISTS teachers_owner_user_id_idx;
DROP INDEX IF EXISTS students_owner_user_id_idx;
DROP INDEX IF EXISTS classes_owner_user_id_idx;
DROP INDEX IF EXISTS notices_owner_user_id_idx;
DROP INDEX IF EXISTS grades_owner_user_id_idx;
DROP INDEX IF EXISTS academic_levels_owner_user_id_idx;
DROP INDEX IF EXISTS academic_streams_owner_user_id_idx;
DROP INDEX IF EXISTS academic_forms_owner_user_id_idx;
DROP INDEX IF EXISTS form_classes_owner_user_id_idx;
DROP INDEX IF EXISTS subjects_owner_user_id_idx;
DROP INDEX IF EXISTS academic_years_owner_user_id_idx;
DROP INDEX IF EXISTS school_themes_school_key;

CREATE TABLE school_themes_next (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  theme_key text NOT NULL,
  name_en text NOT NULL,
  name_sw text NOT NULL,
  tokens_json text NOT NULL,
  is_active integer DEFAULT 0 NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  FOREIGN KEY (school_id) REFERENCES school(id) ON UPDATE no action ON DELETE cascade
);

INSERT INTO school_themes_next (
  id, school_id, theme_key, name_en, name_sw, tokens_json, is_active, created_at, updated_at
)
SELECT id, school_id, theme_key, name_en, name_sw, tokens_json, is_active, created_at, updated_at
FROM school_themes;

DROP TABLE school_themes;
ALTER TABLE school_themes_next RENAME TO school_themes;
CREATE UNIQUE INDEX school_themes_school_key ON school_themes (school_id, theme_key);

ALTER TABLE grades ADD COLUMN status text NOT NULL DEFAULT 'Active';

ALTER TABLE teachers DROP COLUMN owner_user_id;
ALTER TABLE students DROP COLUMN owner_user_id;
ALTER TABLE classes DROP COLUMN owner_user_id;
ALTER TABLE notices DROP COLUMN owner_user_id;
ALTER TABLE grades DROP COLUMN owner_user_id;
ALTER TABLE academic_levels DROP COLUMN owner_user_id;
ALTER TABLE academic_streams DROP COLUMN owner_user_id;
ALTER TABLE academic_forms DROP COLUMN owner_user_id;
ALTER TABLE form_classes DROP COLUMN owner_user_id;
ALTER TABLE subjects DROP COLUMN owner_user_id;
ALTER TABLE academic_years DROP COLUMN owner_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS students_school_admission_number
  ON students (school_id, admission_number)
  WHERE admission_number IS NOT NULL AND admission_number <> '';
CREATE UNIQUE INDEX IF NOT EXISTS subjects_school_code_unique ON subjects (school_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_school_name_unique ON academic_years (school_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS academic_levels_school_type_unique ON academic_levels (school_id, type);

PRAGMA foreign_keys=ON;

ALTER TABLE students ADD COLUMN admission_number text;

CREATE UNIQUE INDEX IF NOT EXISTS students_owner_admission_number
  ON students (owner_user_id, admission_number)
  WHERE admission_number IS NOT NULL AND admission_number <> '';

-- Tenant rows gain school_id. owner_user_id stays, and screens still filter by it.
-- Back-fill only when that owner has exactly one school.

ALTER TABLE teachers ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE academic_levels ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE academic_streams ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE academic_forms ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE form_classes ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE form_classes ADD COLUMN campus_id integer REFERENCES campus(id) ON DELETE SET NULL;
ALTER TABLE subjects ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE academic_years ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE terms ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE notices ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE grades ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;

UPDATE teachers
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = teachers.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = teachers.owner_user_id) = 1;

UPDATE classes
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = classes.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = classes.owner_user_id) = 1;

UPDATE academic_levels
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = academic_levels.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = academic_levels.owner_user_id) = 1;

UPDATE academic_streams
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = academic_streams.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = academic_streams.owner_user_id) = 1;

UPDATE academic_forms
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = academic_forms.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = academic_forms.owner_user_id) = 1;

UPDATE form_classes
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = form_classes.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = form_classes.owner_user_id) = 1;

UPDATE subjects
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = subjects.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = subjects.owner_user_id) = 1;

UPDATE academic_years
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = academic_years.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = academic_years.owner_user_id) = 1;

UPDATE terms
SET school_id = (
  SELECT academic_years.school_id FROM academic_years WHERE academic_years.id = terms.academic_year_id
)
WHERE school_id IS NULL;

UPDATE notices
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = notices.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = notices.owner_user_id) = 1;

UPDATE grades
SET school_id = (
  SELECT students.school_id FROM students WHERE students.id = grades.student_id
)
WHERE school_id IS NULL AND EXISTS (
  SELECT 1 FROM students WHERE students.id = grades.student_id AND students.school_id IS NOT NULL
);

UPDATE grades
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = grades.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = grades.owner_user_id) = 1;

UPDATE students
SET school_id = (
  SELECT school.id FROM school WHERE school.owner_user_id = students.owner_user_id
)
WHERE school_id IS NULL
  AND (SELECT COUNT(*) FROM school WHERE school.owner_user_id = students.owner_user_id) = 1;

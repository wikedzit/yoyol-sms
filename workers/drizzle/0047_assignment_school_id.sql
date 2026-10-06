-- Assignment rows take the school from the record they belong to.
ALTER TABLE teacher_subjects ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE class_subjects ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE student_subjects ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE teacher_classes ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;
ALTER TABLE teacher_form_classes ADD COLUMN school_id integer REFERENCES school(id) ON DELETE SET NULL;

UPDATE teacher_subjects
SET school_id = (
  SELECT teachers.school_id FROM teachers WHERE teachers.id = teacher_subjects.teacher_id
)
WHERE school_id IS NULL;

UPDATE class_subjects
SET school_id = (
  SELECT classes.school_id FROM classes WHERE classes.id = class_subjects.class_id
)
WHERE school_id IS NULL;

UPDATE student_subjects
SET school_id = (
  SELECT students.school_id FROM students WHERE students.id = student_subjects.student_id
)
WHERE school_id IS NULL;

UPDATE teacher_classes
SET school_id = (
  SELECT teachers.school_id FROM teachers WHERE teachers.id = teacher_classes.teacher_id
)
WHERE school_id IS NULL;

UPDATE teacher_form_classes
SET school_id = (
  SELECT form_classes.school_id FROM form_classes WHERE form_classes.id = teacher_form_classes.form_class_id
)
WHERE school_id IS NULL;

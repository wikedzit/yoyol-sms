DROP TABLE class_subjects;
DROP TABLE teacher_classes;
ALTER TABLE students DROP COLUMN class_id;
ALTER TABLE teachers DROP COLUMN department_id;
DROP TABLE classes;

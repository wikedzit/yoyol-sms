CREATE TABLE form_class_subjects (
  form_class_id integer NOT NULL REFERENCES form_classes(id) ON DELETE CASCADE,
  subject_id integer NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_id integer REFERENCES school(id) ON DELETE SET NULL,
  assigned_at integer NOT NULL,
  PRIMARY KEY (form_class_id, subject_id)
);

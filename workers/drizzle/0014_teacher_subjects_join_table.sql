-- Create teacher_subjects join table for many-to-many relationship
CREATE TABLE IF NOT EXISTS `teacher_subjects` (
  `teacher_id` integer NOT NULL,
  `subject_id` integer NOT NULL,
  `assigned_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY(`teacher_id`, `subject_id`),
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);


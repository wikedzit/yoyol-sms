PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_student_subjects` (
	`student_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`assigned_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`student_id`, `subject_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_student_subjects`("student_id", "subject_id", "assigned_at") SELECT "student_id", "subject_id", "assigned_at" FROM `student_subjects`;--> statement-breakpoint
DROP TABLE `student_subjects`;--> statement-breakpoint
ALTER TABLE `__new_student_subjects` RENAME TO `student_subjects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
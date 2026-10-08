CREATE TABLE `student_subjects` (
	`student_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`assigned_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`student_id`, `subject_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `class_subjects` (
	`class_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`assigned_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`class_id`, `subject_id`),
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);

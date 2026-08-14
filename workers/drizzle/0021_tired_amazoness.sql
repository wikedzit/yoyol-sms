CREATE TABLE IF NOT EXISTS `semesters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`semester_number` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`year_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `semester_subjects` (
	`semester_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`assigned_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`semester_id`, `subject_id`),
	FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `years` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year_number` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`course_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);

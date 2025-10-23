CREATE TABLE `teachers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teacher_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`subject` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address` text,
	`qualification` text,
	`gender` text NOT NULL,
	`experience` integer,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_teacher_id_unique` ON `teachers` (`teacher_id`);
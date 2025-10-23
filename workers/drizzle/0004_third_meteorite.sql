CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`head_of_department` text,
	`total_student` integer DEFAULT 0 NOT NULL,
	`total_faculty` integer DEFAULT 0 NOT NULL,
	`description` text,
	`established_date` text,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_code_unique` ON `departments` (`code`);
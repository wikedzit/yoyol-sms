CREATE TABLE `subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subjectName` text NOT NULL,
	`code` text NOT NULL,
	`departments` text NOT NULL,
	`instructor` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_unique` ON `subjects` (`code`);
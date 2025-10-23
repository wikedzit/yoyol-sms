PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subjectName` text NOT NULL,
	`code` text NOT NULL,
	`departments` text NOT NULL,
	`instructor` text NOT NULL,
	`description` text,
	`enrolledStudents` integer DEFAULT 0,
	`status` text DEFAULT 'Active',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_subjects`("id", "subjectName", "code", "departments", "instructor", "description", "enrolledStudents", "status", "created_at", "updated_at") SELECT "id", "subjectName", "code", "departments", "instructor", "description", "enrolledStudents", "status", "created_at", "updated_at" FROM `subjects`;--> statement-breakpoint
DROP TABLE `subjects`;--> statement-breakpoint
ALTER TABLE `__new_subjects` RENAME TO `subjects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_unique` ON `subjects` (`code`);
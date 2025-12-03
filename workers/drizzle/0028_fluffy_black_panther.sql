PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subjectName` text NOT NULL,
	`code` text NOT NULL,
	`instructor` text NOT NULL,
	`description` text,
	`enrolledStudents` integer DEFAULT 0,
	`status` text DEFAULT 'Active',
	`stream_id` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`stream_id`) REFERENCES `academic_streams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_subjects`("id", "subjectName", "code", "instructor", "description", "enrolledStudents", "status", "stream_id", "created_at", "updated_at") SELECT "id", "subjectName", "code", "instructor", "description", "enrolledStudents", "status", NULL, "created_at", "updated_at" FROM `subjects`;--> statement-breakpoint
DROP TABLE `subjects`;--> statement-breakpoint
ALTER TABLE `__new_subjects` RENAME TO `subjects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_unique` ON `subjects` (`code`);

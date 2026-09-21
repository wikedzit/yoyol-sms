PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_school` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`motto` text,
	`registration_number` text,
	`logo_url` text,
	`primary_color` text DEFAULT '#2563eb',
	`secondary_color` text DEFAULT '#0f172a',
	`owner_user_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_school`("id", "name", "address", "phone", "email", "motto", "registration_number", "logo_url", "primary_color", "secondary_color", "owner_user_id", "created_at", "updated_at") SELECT "id", "name", "address", "phone", "email", "motto", "registration_number", "logo_url", "primary_color", "secondary_color", "owner_user_id", "created_at", "updated_at" FROM `school`;--> statement-breakpoint
DROP TABLE `school`;--> statement-breakpoint
ALTER TABLE `__new_school` RENAME TO `school`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `students` ADD `admission_number` text;--> statement-breakpoint
CREATE UNIQUE INDEX `students_owner_admission_number_unique` ON `students` (`owner_user_id`,`admission_number`);--> statement-breakpoint
CREATE INDEX `students_owner_user_id_idx` ON `students` (`owner_user_id`);
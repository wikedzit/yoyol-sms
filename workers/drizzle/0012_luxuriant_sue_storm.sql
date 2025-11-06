PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_teachers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`subject` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`qualification` text,
	`gender` text NOT NULL,
	`experience` integer,
	`status` text DEFAULT 'Active' NOT NULL,
	`department_id` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_teachers`("id", "first_name", "last_name", "subject", "email", "phone", "address", "qualification", "gender", "experience", "status", "department_id", "created_at", "updated_at") SELECT "id", "first_name", "last_name", "subject", "email", "phone", "address", "qualification", "gender", "experience", "status", "department_id", "created_at", "updated_at" FROM `teachers`;--> statement-breakpoint
DROP TABLE `teachers`;--> statement-breakpoint
ALTER TABLE `__new_teachers` RENAME TO `teachers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
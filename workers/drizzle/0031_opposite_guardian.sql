CREATE TABLE `school` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`motto` text,
	`registration_number` text,
	`logo_url` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP TABLE `departments`;--> statement-breakpoint
DROP TABLE `faculties`;--> statement-breakpoint
DROP TABLE `courses`;--> statement-breakpoint
DROP TABLE `years`;--> statement-breakpoint
DROP TABLE `semesters`;--> statement-breakpoint
DROP TABLE `semester_subjects`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`level` text NOT NULL,
	`section` text DEFAULT 'General',
	`year` integer NOT NULL,
	`department_id` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_classes`("id", "name", "level", "section", "year", "department_id", "created_at", "updated_at") SELECT "id", "name", "level", "section", "year", "department_id", "created_at", "updated_at" FROM `classes`;--> statement-breakpoint
DROP TABLE `classes`;--> statement-breakpoint
ALTER TABLE `__new_classes` RENAME TO `classes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
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
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_teachers`("id", "first_name", "last_name", "subject", "email", "phone", "address", "qualification", "gender", "experience", "status", "department_id", "created_at", "updated_at") SELECT "id", "first_name", "last_name", "subject", "email", "phone", "address", "qualification", "gender", "experience", "status", "department_id", "created_at", "updated_at" FROM `teachers`;--> statement-breakpoint
DROP TABLE `teachers`;--> statement-breakpoint
ALTER TABLE `__new_teachers` RENAME TO `teachers`;
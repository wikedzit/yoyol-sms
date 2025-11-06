PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`level` text NOT NULL,
	`section` text DEFAULT 'General',
	`year` integer NOT NULL,
	`department_id` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_classes`("id", "name", "level", "section", "year", "department_id", "created_at", "updated_at") SELECT "id", "name", "level", "section", "year", NULL, "created_at", "updated_at" FROM `classes`;--> statement-breakpoint
DROP TABLE `classes`;--> statement-breakpoint
ALTER TABLE `__new_classes` RENAME TO `classes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;

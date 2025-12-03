PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_grades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`stream_id` integer NOT NULL,
	`form_id` integer NOT NULL,
	`teacher_id` integer,
	`score` integer NOT NULL,
	`grade` text NOT NULL,
	`remarks` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stream_id`) REFERENCES `academic_streams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`form_id`) REFERENCES `academic_forms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_grades`("id", "student_id", "subject_id", "stream_id", "form_id", "teacher_id", "score", "grade", "remarks", "created_at", "updated_at") SELECT "id", "student_id", "subject_id", "stream_id", "form_id", "teacher_id", "score", "grade", "remarks", "created_at", "updated_at" FROM `grades`;--> statement-breakpoint
DROP TABLE `grades`;--> statement-breakpoint
ALTER TABLE `__new_grades` RENAME TO `grades`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS `teacher_classes` (
	`teacher_id` integer NOT NULL,
	`class_id` integer NOT NULL,
	`assigned_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`teacher_id`, `class_id`),
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);

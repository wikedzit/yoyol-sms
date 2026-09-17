CREATE TABLE IF NOT EXISTS `teacher_form_classes` (
	`teacher_id` integer NOT NULL,
	`form_class_id` integer NOT NULL,
	`assigned_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`teacher_id`, `form_class_id`),
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`form_class_id`) REFERENCES `form_classes`(`id`) ON UPDATE no action ON DELETE cascade
);

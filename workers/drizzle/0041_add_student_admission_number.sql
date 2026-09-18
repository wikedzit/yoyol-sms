ALTER TABLE `students` ADD `admission_number` text;--> statement-breakpoint
CREATE UNIQUE INDEX `students_owner_admission_number_unique` ON `students` (`owner_user_id`, `admission_number`);

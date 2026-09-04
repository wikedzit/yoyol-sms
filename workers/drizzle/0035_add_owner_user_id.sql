-- Each signed-in account owns its own copy of school data.
-- Existing rows are assigned to the first user so local/dev data is kept.

ALTER TABLE `school` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `teachers` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `students` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `classes` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `notices` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `grades` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `academic_levels` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `academic_streams` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `academic_forms` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `form_classes` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `subjects` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `academic_years` ADD `owner_user_id` integer REFERENCES `users`(`id`) ON DELETE cascade;--> statement-breakpoint

UPDATE `school` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `teachers` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `students` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `classes` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `notices` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `grades` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `academic_levels` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `academic_streams` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `academic_forms` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `form_classes` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `subjects` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint
UPDATE `academic_years` SET `owner_user_id` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1) WHERE `owner_user_id` IS NULL AND EXISTS (SELECT 1 FROM `users`);--> statement-breakpoint

DROP INDEX IF EXISTS `subjects_code_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_owner_code_unique` ON `subjects` (`owner_user_id`, `code`);--> statement-breakpoint
DROP INDEX IF EXISTS `academic_years_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `academic_years_owner_name_unique` ON `academic_years` (`owner_user_id`, `name`);--> statement-breakpoint
CREATE UNIQUE INDEX `academic_levels_owner_type_unique` ON `academic_levels` (`owner_user_id`, `type`);--> statement-breakpoint

CREATE INDEX `school_owner_user_id_idx` ON `school` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `teachers_owner_user_id_idx` ON `teachers` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `students_owner_user_id_idx` ON `students` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `classes_owner_user_id_idx` ON `classes` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `notices_owner_user_id_idx` ON `notices` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `grades_owner_user_id_idx` ON `grades` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `academic_levels_owner_user_id_idx` ON `academic_levels` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `academic_streams_owner_user_id_idx` ON `academic_streams` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `academic_forms_owner_user_id_idx` ON `academic_forms` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `form_classes_owner_user_id_idx` ON `form_classes` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `subjects_owner_user_id_idx` ON `subjects` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `academic_years_owner_user_id_idx` ON `academic_years` (`owner_user_id`);

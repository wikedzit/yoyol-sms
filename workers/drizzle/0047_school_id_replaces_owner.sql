-- School is the tenant. Copy each owner's school onto the row, then remove owner_user_id.

ALTER TABLE `classes` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `notices` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `academic_levels` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `academic_streams` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `academic_forms` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `form_classes` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `subjects` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `grades` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `academic_years` ADD `school_id` integer REFERENCES `school`(`id`) ON DELETE restrict;--> statement-breakpoint

UPDATE `classes` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `classes`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `notices` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `notices`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `academic_levels` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `academic_levels`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `academic_streams` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `academic_streams`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `academic_forms` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `academic_forms`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `form_classes` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `form_classes`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `subjects` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `subjects`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `grades` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `grades`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `academic_years` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `academic_years`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `students` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `students`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `teachers` SET `school_id` = (
  SELECT `school`.`id` FROM `school`
  WHERE `school`.`owner_user_id` = `teachers`.`owner_user_id`
  ORDER BY `school`.`id` ASC LIMIT 1
) WHERE `school_id` IS NULL;--> statement-breakpoint

DROP INDEX `subjects_owner_code_unique`;--> statement-breakpoint
DROP INDEX `academic_years_owner_name_unique`;--> statement-breakpoint
DROP INDEX `academic_levels_owner_type_unique`;--> statement-breakpoint
DROP INDEX `school_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `teachers_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `students_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `classes_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `notices_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `grades_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `academic_levels_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `academic_streams_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `academic_forms_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `form_classes_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `subjects_owner_user_id_idx`;--> statement-breakpoint
DROP INDEX `academic_years_owner_user_id_idx`;--> statement-breakpoint

CREATE UNIQUE INDEX `subjects_school_code_unique` ON `subjects` (`school_id`, `code`);--> statement-breakpoint
CREATE UNIQUE INDEX `academic_years_school_name_unique` ON `academic_years` (`school_id`, `name`);--> statement-breakpoint
CREATE UNIQUE INDEX `academic_levels_school_type_unique` ON `academic_levels` (`school_id`, `type`);--> statement-breakpoint

ALTER TABLE `school` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `teachers` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `students` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `classes` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `notices` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `grades` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `academic_levels` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `academic_streams` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `academic_forms` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `form_classes` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `subjects` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `academic_years` DROP COLUMN `owner_user_id`;

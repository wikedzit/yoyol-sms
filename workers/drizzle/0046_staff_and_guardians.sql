-- Staff and guardians are real people a membership can point at.
-- Administrator memberships receive a staff row. Student guardian names become guardian rows.

CREATE TABLE `staff` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `user_id` integer,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `email` text,
  `phone` text,
  `job_title` text NOT NULL,
  `status` text DEFAULT 'Active' NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint

CREATE UNIQUE INDEX `staff_school_user_unique` ON `staff` (`school_id`, `user_id`);--> statement-breakpoint

CREATE TABLE `guardians` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `user_id` integer,
  `first_name` text NOT NULL,
  `last_name` text DEFAULT '' NOT NULL,
  `email` text,
  `phone` text,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint

CREATE TABLE `student_guardians` (
  `student_id` integer NOT NULL,
  `guardian_id` integer NOT NULL,
  PRIMARY KEY (`student_id`, `guardian_id`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint

INSERT INTO `staff` (
  `school_id`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `job_title`, `status`
)
SELECT
  `school_memberships`.`school_id`,
  `users`.`id`,
  COALESCE(NULLIF(TRIM(`users`.`first_name`), ''), 'School'),
  COALESCE(NULLIF(TRIM(`users`.`last_name`), ''), 'Administrator'),
  `users`.`email`,
  `users`.`phone`,
  CASE `roles`.`key`
    WHEN 'admin' THEN 'Administrator'
    WHEN 'teacher' THEN 'Teacher'
    WHEN 'finance' THEN 'Finance officer'
    ELSE 'Staff'
  END,
  'Active'
FROM `school_memberships`
JOIN `users` ON `users`.`id` = `school_memberships`.`user_id`
JOIN `roles` ON `roles`.`id` = `school_memberships`.`role_id`
WHERE `roles`.`key` IN ('admin', 'teacher', 'finance');--> statement-breakpoint

INSERT INTO `staff` (
  `school_id`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `job_title`, `status`
)
SELECT
  `teachers`.`school_id`,
  NULL,
  `teachers`.`first_name`,
  `teachers`.`last_name`,
  `teachers`.`email`,
  `teachers`.`phone`,
  'Teacher',
  `teachers`.`status`
FROM `teachers`
WHERE `teachers`.`school_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `staff`
    WHERE `staff`.`school_id` = `teachers`.`school_id`
      AND LOWER(COALESCE(`staff`.`email`, '')) = LOWER(COALESCE(`teachers`.`email`, ''))
  );--> statement-breakpoint

UPDATE `staff`
SET `user_id` = (
  SELECT `users`.`id` FROM `users`
  WHERE LOWER(`users`.`email`) = LOWER(`staff`.`email`)
  LIMIT 1
)
WHERE `user_id` IS NULL
  AND `email` IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM `users`
    WHERE LOWER(`users`.`email`) = LOWER(`staff`.`email`)
  )
  AND NOT EXISTS (
    SELECT 1 FROM `staff` AS `other`
    WHERE `other`.`school_id` = `staff`.`school_id`
      AND `other`.`user_id` = (
        SELECT `users`.`id` FROM `users`
        WHERE LOWER(`users`.`email`) = LOWER(`staff`.`email`)
        LIMIT 1
      )
  );--> statement-breakpoint

UPDATE `school_memberships`
SET `staff_id` = (
  SELECT `staff`.`id` FROM `staff`
  WHERE `staff`.`school_id` = `school_memberships`.`school_id`
    AND `staff`.`user_id` = `school_memberships`.`user_id`
  LIMIT 1
)
WHERE `staff_id` IS NULL;--> statement-breakpoint

INSERT INTO `guardians` (`school_id`, `first_name`, `last_name`, `phone`)
SELECT
  `students`.`school_id`,
  CASE
    WHEN INSTR(TRIM(`students`.`guardian_name`), ' ') = 0 THEN TRIM(`students`.`guardian_name`)
    ELSE SUBSTR(TRIM(`students`.`guardian_name`), 1, INSTR(TRIM(`students`.`guardian_name`), ' ') - 1)
  END,
  CASE
    WHEN INSTR(TRIM(`students`.`guardian_name`), ' ') = 0 THEN ''
    ELSE LTRIM(SUBSTR(TRIM(`students`.`guardian_name`), INSTR(TRIM(`students`.`guardian_name`), ' ') + 1))
  END,
  NULLIF(TRIM(`students`.`guardian_phone`), '')
FROM `students`
WHERE `students`.`school_id` IS NOT NULL
  AND TRIM(COALESCE(`students`.`guardian_name`, '')) != ''
  AND `students`.`id` = (
    SELECT MIN(`other`.`id`) FROM `students` AS `other`
    WHERE `other`.`school_id` = `students`.`school_id`
      AND LOWER(TRIM(`other`.`guardian_name`)) = LOWER(TRIM(`students`.`guardian_name`))
      AND COALESCE(TRIM(`other`.`guardian_phone`), '') = COALESCE(TRIM(`students`.`guardian_phone`), '')
  );--> statement-breakpoint

INSERT INTO `student_guardians` (`student_id`, `guardian_id`)
SELECT `students`.`id`, `guardians`.`id`
FROM `students`
JOIN `guardians`
  ON `guardians`.`school_id` = `students`.`school_id`
 AND LOWER(TRIM(
   `guardians`.`first_name` || CASE
     WHEN `guardians`.`last_name` = '' THEN ''
     ELSE ' ' || `guardians`.`last_name`
   END
 )) = LOWER(TRIM(`students`.`guardian_name`))
 AND COALESCE(`guardians`.`phone`, '') = COALESCE(NULLIF(TRIM(`students`.`guardian_phone`), ''), '')
WHERE TRIM(COALESCE(`students`.`guardian_name`, '')) != '';--> statement-breakpoint

UPDATE `school_memberships`
SET `guardian_id` = (
  SELECT `guardians`.`id` FROM `guardians`
  WHERE `guardians`.`school_id` = `school_memberships`.`school_id`
    AND `guardians`.`user_id` = `school_memberships`.`user_id`
  LIMIT 1
)
WHERE `guardian_id` IS NULL
  AND EXISTS (
    SELECT 1 FROM `guardians`
    WHERE `guardians`.`school_id` = `school_memberships`.`school_id`
      AND `guardians`.`user_id` = `school_memberships`.`user_id`
  );--> statement-breakpoint

CREATE TABLE `school_memberships_next` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `user_id` integer NOT NULL,
  `role_id` integer NOT NULL,
  `staff_id` integer,
  `student_id` integer,
  `guardian_id` integer,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint

INSERT INTO `school_memberships_next` (
  `id`, `school_id`, `user_id`, `role_id`, `staff_id`, `student_id`, `guardian_id`, `status`, `created_at`
)
SELECT
  `id`, `school_id`, `user_id`, `role_id`, `staff_id`, `student_id`, `guardian_id`, `status`, `created_at`
FROM `school_memberships`;--> statement-breakpoint

DROP TABLE `school_memberships`;--> statement-breakpoint

ALTER TABLE `school_memberships_next` RENAME TO `school_memberships`;--> statement-breakpoint

CREATE UNIQUE INDEX `school_memberships_school_user_unique` ON `school_memberships` (`school_id`, `user_id`);

-- School memberships, per-school roles, and the permission registry.
-- Existing owners become the administrator of each school they already own.

CREATE TABLE `permissions` (
  `key` text PRIMARY KEY NOT NULL,
  `extension_key` text NOT NULL,
  `label` text NOT NULL,
  `description` text
);--> statement-breakpoint

CREATE TABLE `roles` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `key` text NOT NULL,
  `name` text NOT NULL,
  `is_system` integer NOT NULL DEFAULT 0,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint

CREATE UNIQUE INDEX `roles_school_key_unique` ON `roles` (`school_id`, `key`);--> statement-breakpoint

CREATE TABLE `role_permissions` (
  `role_id` integer NOT NULL,
  `permission_key` text NOT NULL,
  PRIMARY KEY (`role_id`, `permission_key`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`permission_key`) REFERENCES `permissions`(`key`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint

CREATE TABLE `school_memberships` (
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
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint

CREATE UNIQUE INDEX `school_memberships_school_user_unique` ON `school_memberships` (`school_id`, `user_id`);--> statement-breakpoint

INSERT INTO `permissions` (`key`, `extension_key`, `label`, `description`) VALUES
  ('school.school.read', 'school', 'View school', 'Read the current school profile.'),
  ('school.school.create', 'school', 'Create school', 'Create another school for this account.'),
  ('school.school.update', 'school', 'Update school', 'Change the current school profile.'),
  ('school.school.delete', 'school', 'Delete school', 'Delete a school this account belongs to.'),
  ('school.role.delete', 'school', 'Delete role', 'Delete a custom role. System roles cannot be deleted.'),
  ('students.student.read', 'students', 'View students', 'Read student records in the current school.'),
  ('students.student.create', 'students', 'Add student', 'Add a student to the current school.'),
  ('students.student.update', 'students', 'Update student', 'Change a student in the current school.'),
  ('students.student.delete', 'students', 'Delete student', 'Remove a student from the current school.'),
  ('teachers.teacher.read', 'teachers', 'View teachers', 'Read teacher records in the current school.'),
  ('teachers.teacher.create', 'teachers', 'Add teacher', 'Add a teacher to the current school.'),
  ('teachers.teacher.update', 'teachers', 'Update teacher', 'Change a teacher in the current school.'),
  ('teachers.teacher.delete', 'teachers', 'Delete teacher', 'Remove a teacher from the current school.'),
  ('finance.payment.record', 'finance', 'Record payment', 'Record a payment. The finance module uses this later.');--> statement-breakpoint

INSERT INTO `roles` (`school_id`, `key`, `name`, `is_system`)
SELECT `id`, 'admin', 'Administrator', 1 FROM `school`
UNION ALL
SELECT `id`, 'teacher', 'Teacher', 1 FROM `school`
UNION ALL
SELECT `id`, 'finance', 'Finance officer', 1 FROM `school`
UNION ALL
SELECT `id`, 'student', 'Student', 1 FROM `school`
UNION ALL
SELECT `id`, 'parent', 'Parent', 1 FROM `school`;--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `permission_key`)
SELECT `roles`.`id`, `permissions`.`key`
FROM `roles`
CROSS JOIN `permissions`
WHERE `roles`.`key` = 'admin';--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `permission_key`)
SELECT `roles`.`id`, `permissions`.`key`
FROM `roles`
JOIN `permissions` ON `permissions`.`key` IN (
  'school.school.read',
  'students.student.read',
  'teachers.teacher.read'
)
WHERE `roles`.`key` = 'teacher';--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `permission_key`)
SELECT `roles`.`id`, `permissions`.`key`
FROM `roles`
JOIN `permissions` ON `permissions`.`key` IN (
  'school.school.read',
  'finance.payment.record'
)
WHERE `roles`.`key` = 'finance';--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `permission_key`)
SELECT `roles`.`id`, 'school.school.read'
FROM `roles`
WHERE `roles`.`key` IN ('student', 'parent');--> statement-breakpoint

INSERT INTO `school_memberships` (`school_id`, `user_id`, `role_id`, `status`)
SELECT `school`.`id`, `school`.`owner_user_id`, `roles`.`id`, 'active'
FROM `school`
JOIN `roles` ON `roles`.`school_id` = `school`.`id` AND `roles`.`key` = 'admin'
WHERE `school`.`owner_user_id` IS NOT NULL;--> statement-breakpoint

ALTER TABLE `teachers` ADD `school_id` integer REFERENCES `school`(`id`);--> statement-breakpoint

UPDATE `teachers`
SET `school_id` = (
  SELECT `school`.`id`
  FROM `school`
  WHERE `school`.`owner_user_id` = `teachers`.`owner_user_id`
  ORDER BY `school`.`id`
  LIMIT 1
)
WHERE `school_id` IS NULL;--> statement-breakpoint

UPDATE `students`
SET `school_id` = (
  SELECT `school`.`id`
  FROM `school`
  WHERE `school`.`owner_user_id` = `students`.`owner_user_id`
  ORDER BY `school`.`id`
  LIMIT 1
)
WHERE `school_id` IS NULL;

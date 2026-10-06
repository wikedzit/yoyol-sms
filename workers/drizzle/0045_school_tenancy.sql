-- Phase 1 tenancy. Existing screens still filter by owner_user_id.
-- These rows record that the school owner is the admin of that school.
CREATE TABLE IF NOT EXISTS `roles` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `key` text NOT NULL,
  `name` text NOT NULL,
  `is_system` integer DEFAULT 1 NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_school_key ON roles (school_id, key);

CREATE TABLE IF NOT EXISTS `school_memberships` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `user_id` integer NOT NULL,
  `role_id` integer NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict
);

CREATE UNIQUE INDEX IF NOT EXISTS school_memberships_school_user
  ON school_memberships (school_id, user_id);

CREATE TABLE IF NOT EXISTS `school_extensions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `extension_key` text NOT NULL,
  `status` text NOT NULL,
  `installed_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS school_extensions_school_key
  ON school_extensions (school_id, extension_key);

INSERT INTO roles (school_id, key, name, is_system)
SELECT id, 'admin', 'Admin', 1 FROM school
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.school_id = school.id AND roles.key = 'admin');

INSERT INTO roles (school_id, key, name, is_system)
SELECT id, 'teacher', 'Teacher', 1 FROM school
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.school_id = school.id AND roles.key = 'teacher');

INSERT INTO roles (school_id, key, name, is_system)
SELECT id, 'finance', 'Finance', 1 FROM school
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.school_id = school.id AND roles.key = 'finance');

INSERT INTO roles (school_id, key, name, is_system)
SELECT id, 'student', 'Student', 1 FROM school
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.school_id = school.id AND roles.key = 'student');

INSERT INTO roles (school_id, key, name, is_system)
SELECT id, 'parent', 'Parent', 1 FROM school
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.school_id = school.id AND roles.key = 'parent');

INSERT INTO school_memberships (school_id, user_id, role_id, status, created_at)
SELECT school.id, school.owner_user_id, roles.id, 'active', CAST(strftime('%s', 'now') AS integer) * 1000
FROM school
INNER JOIN roles ON roles.school_id = school.id AND roles.key = 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM school_memberships
  WHERE school_memberships.school_id = school.id
    AND school_memberships.user_id = school.owner_user_id
);

INSERT INTO school_extensions (school_id, extension_key, status, installed_at)
SELECT id, 'themes', 'enabled', CAST(strftime('%s', 'now') AS integer) * 1000
FROM school
WHERE NOT EXISTS (
  SELECT 1 FROM school_extensions
  WHERE school_extensions.school_id = school.id
    AND school_extensions.extension_key = 'themes'
);

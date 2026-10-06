-- Journal name for academic levels. Safe to re-apply: tables and seed rows
-- are created only when missing.
CREATE TABLE IF NOT EXISTS `academic_levels` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `description` text,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `academic_streams` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `level_id` integer NOT NULL REFERENCES `academic_levels`(`id`) ON DELETE CASCADE,
  `level_type` text NOT NULL,
  `color` text NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `academic_forms` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `number` integer NOT NULL,
  `stream_id` integer NOT NULL REFERENCES `academic_streams`(`id`) ON DELETE CASCADE,
  `level_id` integer NOT NULL REFERENCES `academic_levels`(`id`) ON DELETE CASCADE,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `form_classes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `form_id` integer NOT NULL REFERENCES `academic_forms`(`id`) ON DELETE CASCADE,
  `stream_id` integer NOT NULL REFERENCES `academic_streams`(`id`) ON DELETE CASCADE,
  `level_id` integer NOT NULL REFERENCES `academic_levels`(`id`) ON DELETE CASCADE,
  `student_count` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO `academic_levels` (`name`, `type`, `description`)
SELECT 'O-Level', 'o-level', 'Ordinary Level Education (Form 1-4)'
WHERE NOT EXISTS (SELECT 1 FROM `academic_levels` WHERE `type` = 'o-level');

INSERT INTO `academic_levels` (`name`, `type`, `description`)
SELECT 'A-Level', 'a-level', 'Advanced Level Education (Form 5-6)'
WHERE NOT EXISTS (SELECT 1 FROM `academic_levels` WHERE `type` = 'a-level');

-- Academic Levels table (O-Level, A-Level)
CREATE TABLE IF NOT EXISTS `academic_levels` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `description` text,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Academic Streams table (Science, Arts, Business)
CREATE TABLE IF NOT EXISTS `academic_streams` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `level_id` integer NOT NULL REFERENCES `academic_levels`(`id`) ON DELETE CASCADE,
  `level_type` text NOT NULL,
  `color` text NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Academic Forms table (Form 1-6)
CREATE TABLE IF NOT EXISTS `academic_forms` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `number` integer NOT NULL,
  `stream_id` integer NOT NULL REFERENCES `academic_streams`(`id`) ON DELETE CASCADE,
  `level_id` integer NOT NULL REFERENCES `academic_levels`(`id`) ON DELETE CASCADE,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Form Classes table (3A, 3B, 3C, etc.)
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

-- Seed default levels
INSERT INTO `academic_levels` (`name`, `type`, `description`) VALUES 
  ('O-Level', 'o-level', 'Ordinary Level Education (Form 1-4)'),
  ('A-Level', 'a-level', 'Advanced Level Education (Form 5-6)');


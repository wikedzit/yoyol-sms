-- Academic Years table
CREATE TABLE IF NOT EXISTS `academic_years` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL UNIQUE,
  `start_date` text NOT NULL,
  `end_date` text NOT NULL,
  `status` text DEFAULT 'upcoming' NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Terms table (nested under an Academic Year)
CREATE TABLE IF NOT EXISTS `terms` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `academic_year_id` integer NOT NULL REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `term_number` integer NOT NULL,
  `start_date` text NOT NULL,
  `end_date` text NOT NULL,
  `is_current` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

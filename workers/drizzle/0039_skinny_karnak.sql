-- Journal name for the campus table. A school can already have campuses
-- from an earlier hand-written migration, so this only creates the table
-- when it is missing.
CREATE TABLE IF NOT EXISTS `campus` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `name` text NOT NULL,
  `code` text,
  `address` text,
  `phone` text,
  `email` text,
  `is_main` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);

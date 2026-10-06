-- Core storage for uploaded site themes. The themes plugin validates the
-- package. The core keeps the rows so a plugin never opens the database.
CREATE TABLE IF NOT EXISTS `school_themes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `school_id` integer NOT NULL,
  `owner_user_id` integer NOT NULL,
  `theme_key` text NOT NULL,
  `name_en` text NOT NULL,
  `name_sw` text NOT NULL,
  `tokens_json` text NOT NULL,
  `is_active` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS school_themes_school_key
  ON school_themes (school_id, theme_key);

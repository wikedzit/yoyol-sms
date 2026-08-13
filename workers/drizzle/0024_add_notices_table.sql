-- Duplicate of 0024_oval_star_brand.sql (kept for journals that already track this file).
-- Use IF NOT EXISTS so fresh local resets do not fail with "table already exists".
CREATE TABLE IF NOT EXISTS `notices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`date` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

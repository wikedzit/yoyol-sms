ALTER TABLE `subjects` ADD `status` text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `subjects` ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `subjects` ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL;
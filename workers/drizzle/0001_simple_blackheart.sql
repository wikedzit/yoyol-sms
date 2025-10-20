ALTER TABLE `classes` ADD `level` text NOT NULL;--> statement-breakpoint
ALTER TABLE `classes` ADD `section` text DEFAULT 'General';--> statement-breakpoint
ALTER TABLE `classes` ADD `year` integer NOT NULL;
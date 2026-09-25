-- The app inserts campus_id, but no earlier migration added the column.
-- Nullable so existing rows stay valid, and a deleted campus clears the link.
ALTER TABLE `students` ADD `campus_id` integer REFERENCES `campus`(`id`) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `teachers` ADD `campus_id` integer REFERENCES `campus`(`id`) ON DELETE set null;

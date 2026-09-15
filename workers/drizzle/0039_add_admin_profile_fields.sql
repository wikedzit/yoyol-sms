-- Migration: Add dynamic administrator profile and account fields.

ALTER TABLE `users` ADD COLUMN `job_title` text;
ALTER TABLE `users` ADD COLUMN `staff_id` text;
ALTER TABLE `users` ADD COLUMN `bio` text;
ALTER TABLE `users` ADD COLUMN `account_status` text DEFAULT 'active';
ALTER TABLE `users` ADD COLUMN `last_login_at` integer;
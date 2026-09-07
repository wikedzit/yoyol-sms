-- Migration: Add phone and preferred_language to users
-- Applies to every role — a UI/contact preference tied to the login
-- account itself, not to a role-specific record.

ALTER TABLE `users` ADD COLUMN `phone` text;
ALTER TABLE `users` ADD COLUMN `preferred_language` text DEFAULT 'en';

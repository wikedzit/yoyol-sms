-- Migration: Add first_name and last_name to users
-- Nullable: existing accounts (Admin, Finance, etc.) have no name on file
-- yet, and Teacher/Student accounts keep their name on their own table
-- (teachers.firstName/lastName, students.firstName/lastName) instead.

ALTER TABLE `users` ADD COLUMN `first_name` text;
ALTER TABLE `users` ADD COLUMN `last_name` text;

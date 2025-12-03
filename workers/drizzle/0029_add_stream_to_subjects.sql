-- Migration: Add stream column to subjects table

-- Add new stream column with default value
ALTER TABLE `subjects` ADD COLUMN `stream` text NOT NULL DEFAULT 'General';

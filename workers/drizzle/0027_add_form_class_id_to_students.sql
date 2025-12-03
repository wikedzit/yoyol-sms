-- Migration: Add form_class_id to students table for school-based structure
-- This allows students to be assigned to formClasses (O-Level/A-Level structure)

ALTER TABLE students ADD COLUMN form_class_id INTEGER REFERENCES form_classes(id) ON DELETE CASCADE;


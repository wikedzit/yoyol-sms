# Academics

Levels, subjects, and classrooms. This module ships with the system.

## Package

This folder follows the kernel extension layout:

- `yoyol.extension.json` declares the module
- `entrypoint.ts` is the bundled entrypoint
- `locales/` has English and Swahili
- `schema/` holds the migrations for the tables this module owns

The kernel lists every valid folder on the Extensions page. Required modules stay on.

## Tables

`schema/001_initial.json` creates `academic_levels`, `academic_streams`, `academic_forms`, `form_classes`, `subjects`, `classes`, and `class_subjects`.

The kernel adds `school_id`, `created_at`, `updated_at`, and `created_by` to every module table. Those columns are not repeated here. Academic years and terms stay with the kernel, next to the school record.

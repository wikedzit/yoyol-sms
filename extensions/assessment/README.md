# Assessment

Grades for a school. This module ships with the system and needs Academics, Students, and Staff.

## Package

This folder follows the kernel extension layout:

- `yoyol.extension.json` declares the module
- `entrypoint.ts` is the bundled entrypoint
- `locales/` has English and Swahili
- `schema/` holds the migrations for the tables this module owns

## Tables

`schema/001_initial.json` creates `grades`.

Marks for a year and term live in `results`, with `assessment_types`, `grading_scales`, and `result_releases`. The grades screen still reads `grades`.

A grade points at a student, a subject, a stream, a form, and a teacher. The kernel adds `school_id`, `created_at`, `updated_at`, and `created_by`.

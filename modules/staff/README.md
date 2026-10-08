# Staff

Teacher and staff records. This module ships with the system and needs Academics.

## Package

This folder follows the kernel extension layout:

- `yoyol.extension.json` declares the module
- `entrypoint.ts` is the bundled entrypoint
- `locales/` has English and Swahili
- `schema/` holds the migrations for the tables this module owns

## Tables

`schema/001_initial.json` creates `teachers`, `teacher_classes`, `teacher_subjects`, and `teacher_form_classes`.

The live staff record is the `teachers` row, with a `staff_type`. Year assignments live in `teaching_assignments`. The free-text `subject` column remains.

Class and subject links point at Academics. The kernel adds `school_id`, `created_at`, `updated_at`, and `created_by`.

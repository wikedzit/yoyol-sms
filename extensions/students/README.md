# Students

Student records for one school. This module ships with the system and needs Academics.

## Package

This folder follows the kernel extension layout:

- `yoyol.extension.json` declares the module
- `entrypoint.ts` is the bundled entrypoint
- `locales/` has English and Swahili
- `schema/` holds the migrations for the tables this module owns

## Tables

`schema/001_initial.json` creates `students`, `student_guardians`, and `student_subjects`.

The live student record also stores a middle name. A blank admission number is filled from the school format `admissionNumberFormat`, which defaults to `{year}-{seq:4}`. Each academic year has its own row in `student_enrolments`, so a later class does not erase the earlier one. Promoting a class writes the next year and marks the old row promoted. The final form, Form 4 at O-Level and Form 6 at A-Level, is marked graduated instead. Guardians live in `guardians` and link through `guardian_students`, which stores the relationship and one primary contact per student. An admin can invite a guardian who has an email. Accepting the invitation gives them the parent role and shows only the students linked to that guardian. Results, attendance, and invoices are not stored yet, so those views wait for their modules. Subject choices for a student are stored per academic year in `student_year_subjects`. Saving replaces the active year, including when the choice is an A-Level combination, and leaves every other year in place. A student account opens `/portal` and sees that profile, the active-year class, those subjects, and any `student.profile.tabs` contribution. Results, attendance, timetable, and calendar appear there when those modules add a tab. The older `guardian_name` and `guardian_phone` columns on the student row remain until the student form stops using them. Class and subject links point at Academics. The kernel adds `school_id`, `created_at`, `updated_at`, and `created_by`.

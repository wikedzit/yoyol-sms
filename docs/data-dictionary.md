# Data dictionary

Generated from the Drizzle SQL migrations and the extension schema files.
Module tables are created as `mod_<extension>_<table>`, with hyphens in the extension key turned into underscores.

## Kernel and app tables

- `0000_early_colleen_wing.sql`: `classes`, `students`
- `0002_exotic_drax.sql`: `teachers`
- `0004_third_meteorite.sql`: `departments`
- `0005_late_nightshade.sql`: `subjects`
- `0008_certain_lorna_dane.sql`: `__new_subjects`
- `0011_dear_captain_america.sql`: `__new_teachers`
- `0012_luxuriant_sue_storm.sql`: `__new_teachers`
- `0013_lyrical_shinobi_shaw.sql`: `__new_classes`
- `0014_common_zzzax.sql`: `teacher_subjects`
- `0015_red_carnage.sql`: `student_subjects`, `class_subjects`
- `0016_huge_surge.sql`: `teacher_classes`
- `0017_stale_darkstar.sql`: `faculties`
- `0019_supreme_slayback.sql`: `courses`
- `0020_watery_doctor_doom.sql`: `years`
- `0021_tired_amazoness.sql`: `semesters`, `semester_subjects`
- `0022_lonely_wolfpack.sql`: `__new_student_subjects`
- `0023_sleepy_ironclad.sql`: `grades`
- `0024_oval_star_brand.sql`: `notices`
- `0025_tiresome_zeigeist.sql`: `users`
- `0026_dapper_banshee.sql`: `academic_levels`, `academic_streams`, `academic_forms`, `form_classes`
- `0028_fluffy_black_panther.sql`: `__new_subjects`
- `0030_useful_clint_barton.sql`: `__new_grades`
- `0031_opposite_guardian.sql`: `school`, `__new_classes`, `__new_teachers`
- `0033_tricky_speedball.sql`: `academic_years`, `terms`
- `0038_smiling_wolfpack.sql`: `teacher_form_classes`
- `0039_skinny_karnak.sql`: `campus`
- `0044_school_themes.sql`: `school_themes`
- `0045_school_tenancy.sql`: `roles`, `school_memberships`, `school_extensions`
- `0048_permissions.sql`: `permissions`, `role_permissions`
- `0049_record_scope.sql`: `student_guardians`
- `0050_identity.sql`: `sessions`, `sign_in_attempts`, `audit_events`, `invitations`, `password_resets`
- `0051_school_scope.sql`: `school_themes_next`
- `0052_extension_registry.sql`: `extensions`, `extension_versions`, `extension_migrations`, `extension_settings`, `hook_registrations`, `event_subscriptions`
- `0054_domain_events.sql`: `domain_events`, `extension_exports`
- `0055_notifications.sql`: `notifications`
- `0057_form_class_subjects.sql`: `form_class_subjects`
- `0058_subject_combinations.sql`: `subject_combinations`, `combination_subjects`
- `0064_student_enrolments.sql`: `student_enrolments`
- `0065_guardians.sql`: `guardians`, `guardian_students`
- `0067_student_year_subjects.sql`: `student_year_subjects`
- `0068_staff.sql`: `teaching_assignments`
- `0069_assessment.sql`: `assessment_types`, `grading_scales`, `results`, `result_releases`
- `0070_calendar_events.sql`: `calendar_events`
- `0071_attendance.sql`: `mod_attendance_records`
- `0072_finance.sql`: `mod_finance_fee_items`, `mod_finance_structures`, `mod_finance_invoices`, `mod_finance_lines`, `mod_finance_payments`, `mod_finance_allocations`, `mod_finance_receipts`, `mod_finance_provider_payments`
- `0073_timetable.sql`: `mod_timetable_periods`, `mod_timetable_entries`
- `0074_lesson_plans.sql`: `mod_lesson_plans_templates`, `mod_lesson_plans_plans`
- `0075_discipline.sql`: `mod_discipline_types`, `mod_discipline_severities`, `mod_discipline_incidents`
- `0076_clubs.sql`: `mod_clubs_clubs`, `mod_clubs_memberships`, `mod_clubs_activities`
- `0077_leadership.sql`: `mod_leadership_positions`, `mod_leadership_appointments`
- `0078_reports.sql`: `mod_reports_previews`
- `0079_publishers.sql`: `trusted_publishers`, `revoked_extension_versions`

## Extension tables

- `academics`: `mod_academics_academic_levels`, `mod_academics_academic_streams`, `mod_academics_academic_forms`, `mod_academics_form_classes`, `mod_academics_subjects`, `mod_academics_classes`, `mod_academics_class_subjects`, `mod_academics_form_class_subjects`, `mod_academics_subject_combinations`, `mod_academics_combination_subjects`
- `assessment`: `mod_assessment_grades`
- `attendance`: `mod_attendance_records`
- `clubs`: `mod_clubs_clubs`, `mod_clubs_memberships`, `mod_clubs_activities`
- `discipline`: `mod_discipline_types`, `mod_discipline_severities`, `mod_discipline_incidents`
- `finance`: `mod_finance_fee_items`, `mod_finance_structures`, `mod_finance_invoices`, `mod_finance_lines`, `mod_finance_payments`, `mod_finance_allocations`, `mod_finance_receipts`, `mod_finance_provider_payments`
- `leadership`: `mod_leadership_positions`, `mod_leadership_appointments`
- `lesson-plans`: `mod_lesson_plans_templates`, `mod_lesson_plans_plans`
- `notices`: `mod_notices_notices`
- `reports`: `mod_reports_previews`
- `staff`: `mod_staff_teachers`, `mod_staff_teacher_classes`, `mod_staff_teacher_subjects`, `mod_staff_teacher_form_classes`
- `students`: `mod_students_students`, `mod_students_student_guardians`, `mod_students_student_subjects`
- `timetable`: `mod_timetable_periods`, `mod_timetable_entries`

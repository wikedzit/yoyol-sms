# Reports

Ships with the system. The page at `/x/reports` is a view document built from `dashboard.widgets`. An admin can preview a CSV for students, staff, or fee structures, then save it, and can download the same lists.

Physical table: `mod_reports_previews`. The preview is replaced each time the same person previews again, and it is removed after a successful save.

Student import writes the person only. It does not enrol them or create an invoice. Fee import refuses a class and fee item that already have an amount for the active year, so it does not change that amount.

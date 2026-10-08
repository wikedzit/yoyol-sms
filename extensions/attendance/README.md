# Attendance

Daily attendance for a class. This module ships with the system and needs Academics, Students, and Staff.

## Package

This folder follows the kernel extension layout:

- `yoyol.extension.json` declares the module
- `entrypoint.ts` is the bundled entrypoint
- `locales/` has English and Swahili
- `schema/` holds the migrations for the tables this module owns

## Tables

`schema/001_initial.json` creates `records`. The compiled table is `mod_attendance_records`.

A row is one student on one date: present, absent, or late, with an optional comment. The same student and date stay one row.

## Pages

`/x/attendance` is the view document. It lists classes and the term rates. A class page records the day. Marking the class present fills every student, and a later save changes only the exceptions.

An absence publishes `attendance.record.marked_absent`. When absence alerts are on, the primary guardian gets an in-app message if they have an account. Otherwise a linked parent account is notified. SMS and email stay deferred.

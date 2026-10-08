# Notices

School notices. This module ships with the system.

## Package

This folder follows the kernel extension layout:

- `yoyol.extension.json` declares the module
- `entrypoint.ts` is the bundled entrypoint
- `locales/` has English and Swahili
- `schema/` holds the migrations for the tables this module owns

## Tables

`schema/001_initial.json` creates `notices`.

School events live in `calendar_events`. A text note stands in for a file. Upcoming events are added to the dashboard from this module.

The kernel adds `school_id`, `created_at`, `updated_at`, and `created_by`.

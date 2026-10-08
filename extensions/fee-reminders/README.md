# Fee reminders

A job that records an SMS or email for guardians of students with an outstanding balance.

An administrator runs it from `/x/fee-reminders`. A daily clock is not configured, so the schedule stays with the deferred cron work. Voided invoices are skipped. The amount is the billed total minus payments already allocated.

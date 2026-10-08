# Absence alerts

Subscribes to `attendance.record.marked_absent` and records an SMS or email for each guardian who has a phone or email address.

The notice uses the linked user's preferred language. English is used when the guardian has no account. The in-app absence message from attendance stays as it is.

The SMS and email plugins must be on, and each needs a sender, before a receipt is stored.

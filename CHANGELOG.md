# Changelog

This project follows Semantic Versioning. A tagged release is `vMAJOR.MINOR.PATCH`.

The release workflow on a `v*` tag runs the kernel tests, prints the traceability report, builds the app, and checks that this file mentions the tag. It does not publish a Docker image. That image waits until a container build exists.

## Unreleased

- Extension command: `pnpm ext create`, `validate`, `build`, `pack`, and `sign`.
- SMS, email, absence alerts, and fee reminders record a receipt and do not call a gateway.
- Package upload stays hidden when the Worker Loader binding is absent.

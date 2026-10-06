# 0007. Synchronous hooks and asynchronous events

- Status: Accepted
- Date: 2026-10-02

## Context

Extensions need to react to and shape what happens elsewhere: send an SMS when a student
is marked absent (SRS FR-8.3), create invoices when a student is enrolled, add a tab to the
student profile. WordPress solves this with actions and filters that run in-process.

For installed extensions every call crosses an isolate boundary (ADR 0004), so running many
extensions synchronously inside a request would make requests slow and fragile.

## Decision

Provide two mechanisms with different guarantees.

### Hooks (synchronous, in-request)

- Used when the result is needed before the response: validation (`student.beforeCreate`),
  value filtering (`student.displayName`), UI slots (`student.profile.tabs`).
- The core defines a small, documented set of hooks. Modules may define new hooks in their
  own namespace.
- Each handler has a time budget (default 50 ms, configurable per hook). A handler that
  times out or throws is skipped, logged with the correlation id (SRS OB-2, OB-9), and
  never fails the request unless the hook is declared `blocking` (validation hooks only).
- Handlers run in a deterministic order: `priority` (lower first), then extension key.

### Events (asynchronous, durable)

- Used for side effects: notifications, invoices, analytics, integrations.
- The emitting code writes the event to `domain_events` in the **same transaction** as the
  business change (transactional outbox). A dispatcher delivers events through Cloudflare
  Queues to every subscribed extension, with retries and a dead-letter state.
- Delivery is at least once. Handlers must be idempotent and receive `event.id` for that.
- Event names are past tense and namespaced: `students.student.enrolled`,
  `attendance.record.marked_absent`, `finance.payment.confirmed`.

## Consequences

- No extension can slow down or break an unrelated user request with side-effect work.
- Most WordPress-style "actions" become events; only a few "filters" remain hooks.
- `domain_events`, the dispatcher and the Queue binding are part of the kernel. On the Node
  target the dispatcher polls the outbox table instead of using Queues.

# 0003. The core owns all data access for extensions

- Status: Proposed
- Date: 2026-10-02

## Context

Modules need their own tables. Installed modules are untrusted code (ADR 0004, ADR 0005)
handling minors' personal data and payments (SRS 13, DP-8). SRS DB-1 to DB-7 also require
one schema layer, Drizzle ORM, behind a database adapter that works on both D1 and
PostgreSQL.

If extensions opened their own connections or used their own ORM, the core could not
enforce tenancy, permissions, auditing or portability.

## Decision

1. **Extensions never receive a database binding, connection string or driver.** The core
   holds the `DatabaseAdapter` (SRS 6.2.3) and is the only code that talks to D1 or Postgres.
2. **Extensions receive a scoped Drizzle instance.** `@yoyol/sdk` creates Drizzle with the
   `sqlite-proxy` driver (or the Postgres proxy driver), whose callback sends each statement
   to the core's data service. In bundled mode this is a function call; in installed mode it
   is an RPC call from the sandbox.
3. **The data service enforces, per statement:**
   - the statement only touches tables owned by the calling module (`mod_<key>_*`);
   - every read and write is scoped to the current `school_id`;
   - statements are parameterised (SRS SEC-11);
   - access to sensitive data is written to the audit log (SRS DP-6, OB-10).
4. **Core data is read through core APIs, not SQL.** A module that needs students calls
   `core.students.list()` or `core.students.get(id)`, gated by capabilities the administrator
   approved (for example `core.students:read`, `core.guardians.contact:read`). This keeps
   field-level privacy rules in one place.
5. **Module tables are declared, not hand-written.** Modules ship dialect-neutral schema
   operations (see the specification). The core generates DDL for SQLite and PostgreSQL,
   prefixes table names, and adds `school_id`, `created_at` and `updated_at`. Raw SQL
   migrations are permitted for bundled modules only.
6. **Module tables may reference core tables** by foreign key (for example
   `references: "core.students"`). Core tables never reference module tables.

## Consequences

- One security boundary for data, independent of who wrote the extension.
- Every module is portable to Postgres without the author writing Postgres SQL.
- Extra latency per query in installed mode (an RPC hop within the same Cloudflare
  location). Modules should batch with `data.batch()` where possible.
- The proxy driver hands the core only the SQL text and parameters, so the data service must
  parse each statement (SQLite and PostgreSQL dialects) and verify that:
  - every referenced table is on the module's allow-list;
  - each `SELECT`, `UPDATE` and `DELETE` on a module table has a top-level
    `school_id = ?` predicate bound to the current school;
  - each `INSERT` sets `school_id` to the current school.

  The SDK adds these predicates automatically, so authors do not write them. Any statement
  the checker cannot verify is rejected. Bundled modules use the same path so the checker is
  exercised by trusted code first.
- Alternative kept open: one D1 database per school would enforce tenancy physically and
  remove the predicate check, at the cost of cross-school reporting and more databases to
  migrate. Revisit if the checker proves too restrictive.

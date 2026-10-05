# 0003. The core owns all database access for extensions

- Status: Proposed
- Date: 2026-10-02

## Context

Modules need their own tables. YOYOL must run on both Cloudflare D1 and PostgreSQL (SRS DB-1 to
DB-7, NFR-6). It also holds personal data about minors, so an extension must not be able to read
records it was not granted (SRS DP-8, SEC-9).

If each extension opened its own connection, chose its own ORM, or wrote raw dialect-specific
SQL, tenancy and auditing would depend on every extension author getting them right, and
third-party extensions could not support both databases.

## Decision

1. Extensions never receive a database binding, connection string, or driver. The kernel holds
   the only `DatabaseAdapter`.
2. Extensions get a **scoped Drizzle instance** from the SDK (`ctx.data`).
   - Bundled extensions get a Drizzle instance bound directly to the adapter, wrapped in
     tenant scoping.
   - Installed extensions get a Drizzle instance built on the `sqlite-proxy` driver. Each query
     is sent over RPC to the kernel's Data Service, which executes it.
3. The Data Service enforces, for every statement:
   - The extension may only touch tables carrying its own prefix (`ext_<key>_`).
   - `school_id` is always bound to the current tenant.
   - Writes run inside the request's transaction.
   - Reads of tables marked sensitive are written to the audit log.
4. Core entities (students, guardians, staff, academics) are **not** queried directly. They are
   read and written through typed core APIs (`ctx.core.students.list()`), each gated by a
   capability the school admin granted (see the specification).
5. Module tables are declared in a dialect-neutral schema format inside the package. The kernel
   generates DDL for D1 and PostgreSQL, adds `school_id`, `created_at`, and `updated_at`, and
   records each applied migration per school. Raw SQL migrations are permitted for bundled
   extensions only.
6. Module tables may hold foreign keys to core entity ids. Core tables never reference
   extension tables.

## Consequences

- One extension package supports both databases.
- Tenancy and audit cannot be forgotten by an extension author.
- Statement checking needs an SQL parser in the Data Service. It must be well tested and must
  fail closed: any statement it cannot classify is rejected.
- Reports that join module data with core data go through core APIs or core-provided read
  views. This costs some query flexibility in exchange for data-protection guarantees.
- `drizzle.config.ts` and `wrangler d1 migrations apply` are replaced by a kernel migrator that
  understands per-extension, per-school migrations.

# 0002. School-based tenancy and a permission registry

- Status: Accepted
- Date: 2026-10-02

## Context

Every tenant table currently carries `owner_user_id -> users.id ON DELETE CASCADE`, and every
service filters by the signed-in user's id. As a result:

- a teacher, finance officer, student or parent who signs in owns no rows and sees nothing,
  so SRS FR-1.3, FR-1.5 and SEC-9 cannot be met;
- deleting the account that created the school deletes the whole school;
- `users.role` is free text and the only authorization check is `isAdminRole()`.

Extensions make this worse, not better: every extension query needs a reliable answer to
"which school is this request for, and what may this caller do?"

## Decision

1. **The school is the tenant.** Every tenant-owned table, in the core and in every module,
   has a non-null `school_id`. The data service (ADR 0003) injects and enforces it.
2. **Users join schools through memberships.**
   `school_memberships (id, school_id, user_id, role_id, staff_id?, student_id?, guardian_id?, status)`.
   One user may belong to several schools and may hold a different role in each.
3. **Roles are data, permissions are registered.**
   - `roles (id, school_id, key, name, is_system)`
   - `permissions (key, extension_key, label, description)`
   - `role_permissions (role_id, permission_key)`

   Permission keys are namespaced by extension: `students.student.create`,
   `finance.payment.record`. Extensions register their permissions when enabled and declare
   default roles; administrators may change the mapping afterwards.
4. **System roles** `admin`, `teacher`, `finance`, `student` and `parent` (SRS 2.3) are seeded
   per school and cannot be deleted.
5. **Records about minors and money use `ON DELETE RESTRICT`**, not cascade. Removal goes
   through explicit archive or purge flows that write to the audit log.

## Consequences

- This is a prerequisite for the extension work and is scheduled first.
- A data migration is needed: create one school membership per existing owner, back-fill
  `school_id` from `owner_user_id` (one school per owner today), then drop `owner_user_id`.
- Route loaders and actions check permissions with `can(permissionKey)` rather than role
  names, so new extensions do not require changes to existing checks.

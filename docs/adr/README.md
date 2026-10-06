# Architecture Decision Records

Significant technical decisions for YOYOL are recorded here, as required by SRS DR-5.
Each record states the context, the decision, and its consequences. Records are never
rewritten after acceptance; a later record supersedes an earlier one instead.

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-pluggable-extension-architecture.md) | Pluggable extension architecture (core, modules, plugins) | Accepted |
| [0002](0002-school-based-tenancy-and-permissions.md) | School-based tenancy and a permission registry | Accepted |
| [0003](0003-core-owns-data-access.md) | The core owns all data access for extensions | Accepted |
| [0004](0004-extension-runtime-hosts.md) | Installed extensions run in Cloudflare Dynamic Workers first | Accepted |
| [0005](0005-signed-extensions-only.md) | Only signed extensions can be installed | Accepted |
| [0006](0006-view-documents-for-extension-ui.md) | View documents for installed extension UI | Accepted |
| [0007](0007-hooks-and-events.md) | Synchronous hooks and asynchronous events | Accepted |
| [0008](0008-theme-packages.md) | Site themes are uploaded token packages | Accepted |

The full extension contract lives in [docs/extensions](../extensions/specification.md).
Adoption of these decisions is tracked in the
[pluggable architecture plan](../plans/adopt-pluggable-architecture.md).

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
## Decision
## Consequences
```

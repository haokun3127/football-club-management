# Secure production identity and isolated dual-role test accounts

## Goal

Restore reliable WeChat login for three user-authorized test identities while removing production debug authentication and preserving parent privacy boundaries.

## Requirements

- Production business app-client routes must not authorize from `X-User-Id`; only a valid Bearer app-client session may authorize requests.
- Development and test servers may explicitly enable header identity for local smoke checks without changing the production entrypoint.
- Phone matching is deterministic: only one active user with an active club membership may match. Zero or multiple candidates are rejected without an arbitrary selection.
- A manual, fixed-ID, transactional import creates three isolated dual-role accounts. Each has active `parent` and `coach` memberships, its own parent profile, two isolated children with guardian bindings, and an isolated coach/team scope.
- Test-phone values are read only from private runtime environment variables. They must not appear in source, tests, committed documentation, logs, or command output.
- Import and rollback use a file SQLite database only. `import --dry-run` is read-only, including migration state; a mutating import or rollback requires the exact confirmation flag. Confirmed import additionally requires a runtime-only backup attestation set after the separately approved restricted backup.
- Rollback uses the canonical fixed manifest only. It does not accept caller-supplied account or side-effect identifiers and must preserve unrelated club data.
- This task must not run against production, write a production database, SSH to a server, restart services, or deploy. Those actions require a separate user-authorized deployment task after backup planning.

## Acceptance Criteria

- Production header-only requests cannot read parent or coach BFF data; explicitly configured development header tests still pass.
- Phone resolution rejects zero-match, inactive, and ambiguous records without selecting an identity.
- A fresh file SQLite test proves import dry-run, confirmed import, idempotent re-run, and confirmed rollback, with no phone values in the command result.
- Three imported identities can select parent and coach Bearer sessions; parents see only their own two children, coaches see only their own two-player team, and response payloads omit phone fields.
- Rollback removes operation-owned rows and scenario effects while preserving unrelated seeded club rows.
- Focused regressions, API typecheck/build, full API tests, root check, task validation, and `git diff --check` pass before any commit.

## Notes

- This is backend/security work only. Figma and visual acceptance are not in scope.
- Production backup, import, restart, and device-side WeChat verification remain a separate operation and are not evidence from this code task.

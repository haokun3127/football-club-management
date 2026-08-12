# Implementation plan

1. [completed] Add failing API tests for production header-only rejection, exact phone-match behavior, isolated three-account role/privacy expectations, and controlled CLI behavior.
2. [completed] Implement production resolver configuration and exact phone-match guard without changing explicitly configured development behavior.
3. [completed] Add the fixed-ID transactional import/rollback operation with no startup side effect and a controlled file-SQLite CLI.
4. [completed] Add focused persistence/restart tests, dry-run migration-state coverage, API typecheck, build, and focused regressions.
5. [completed] Terra reviewed the diff, tests, CLI confirmation boundary, and rollback ownership boundary. The review added backup attestation, lock-before-write preflight plus lock-internal recheck, and canonical rollback ownership validation.
6. [pending, separate authorized deployment task] Create a restricted server backup and record only non-secret operational metadata.
7. [pending, separate authorized deployment task] Run a reviewed import, bounded aggregate readback, API restart, and post-restart readback.
8. [completed] Update progress, handover, and code-spec records without phones, tokens, passwords, secrets, or deployment claims.

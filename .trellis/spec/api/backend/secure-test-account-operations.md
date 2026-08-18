# Secure Test-Account Operations

## Scenario: Chongqing Talent isolated dual-role account operation

### 1. Scope / Trigger

- Trigger: a separately authorized operator needs to create or remove the seven fixed Chongqing Talent test-account scopes in a file-backed SQLite database.
- This operation is never a startup seed and must not run from a route handler.
- Deployment, backup, server access, and production execution are outside the command implementation and require their own reviewed runbook.

### 2. Signatures

- `pnpm --filter @football-club/api secure-test-accounts -- import --dry-run`
- `pnpm --filter @football-club/api secure-test-accounts -- import --confirm-secure-cq-talent-test-accounts`
- `pnpm --filter @football-club/api secure-test-accounts -- rollback --confirm-secure-cq-talent-test-accounts`
- `runSecureCqTalentTestAccountCommand(args, environment)` returns `{ operation, status, accountCount }`.

### 3. Contracts

- Required private environment keys: `DATABASE_URL` and `SECURE_CQ_TALENT_TEST_PHONE_1` through `SECURE_CQ_TALENT_TEST_PHONE_7`. A confirmed import additionally requires `SECURE_CQ_TALENT_TEST_ACCOUNTS_BACKUP_ATTESTED=1`, set only after the operator has completed the separately approved restricted backup.
- `DATABASE_URL` must identify a file database; `:memory:` is rejected for the command.
- Test phones are runtime-only. They must not be logged or included in result objects, source-controlled data, fixtures, documentation, manifests, or commit messages.
- Import creates only the canonical fixed IDs. Re-running a complete installation returns `already_present`.
- Dry-run performs read-only validation and must not change SQLite rows, schema migration state, or files.
- Rollback constructs the canonical manifest internally and supplies no caller-provided side effects. It may only remove rows derived from canonical account scopes.

### 4. Validation & Error Matrix

- Missing file `DATABASE_URL` or `:memory:` -> error; do not open an in-memory command target.
- Unknown operation, extra flags, or missing confirmation -> error; no database mutation.
- `import --dry-run` -> `dry_run` or `already_present`; no migration and no mutation.
- Confirmed import without backup attestation -> error; no mutation.
- Confirmed import with backup attestation -> migrate then `imported` or `already_present`.
- Confirmed rollback with no complete canonical installation -> error; do not report a false successful rollback.
- Ambiguous, duplicate, inactive, or conflicting phone/account rows -> error; transaction rolls back without partial rows.

### 5. Good / Base / Bad Cases

- Good: seven runtime phones import to seven separate parent/coach account scopes; every parent session sees only its two guardian-bound students, while the matching coach session sees only its own eight-player team.
- Base: a complete matching installation re-runs as `already_present` without duplicating records.
- Bad: a command accepts arbitrary IDs or prints a manifest/phone/token in its result; this expands deletion scope or leaks identity data.

### 6. Tests Required

- CLI test asserts confirmation for mutation, backup attestation, exact result projection, file-database enforcement, empty-install rollback rejection, and dry-run migration-count stability.
- Import test asserts seven isolated dual-role scopes, two guardian bindings per parent, eight-player coach teams, relative historical/current/future calendars, attendance, lesson history, eight-dimensional assessments, matches, tactical boards, idempotency, and conflict/partial-install rejection.
- BFF test asserts real Bearer role switching, parent and coach scoping, and absence of phone fields in projected payloads.
- Rollback test asserts canonical-manifest rejection for tampering, namespace checks for direct rollback tests, owned-row cleanup, and unrelated-row preservation.

### 7. Wrong vs Correct

#### Wrong

```ts
migrate(database);
if (args.includes("--dry-run")) return preview(database);
```

This writes migration state during a supposedly read-only preview.

#### Correct

```ts
if (isDryRun) return preview(database);
migrate(database);
return confirmedMutation(database);
```

The read-only path never migrates or mutates the target file.

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
- Import creates only the canonical fixed IDs. Re-running a complete, current installation returns `already_present`; a complete installation whose rolling demonstration window or controlled display copy is stale returns `refreshed` after the confirmed operation updates only its canonical rows.
- Dry-run performs read-only validation and must not change SQLite rows, schema migration state, or files.
- Rollback constructs the canonical manifest internally and supplies no caller-provided side effects. It may only remove rows derived from canonical account scopes.

### 4. Validation & Error Matrix

- Missing file `DATABASE_URL` or `:memory:` -> error; do not open an in-memory command target.
- Unknown operation, extra flags, or missing confirmation -> error; no database mutation.
- `import --dry-run` -> `dry_run` or `already_present`; no migration and no mutation.
- Confirmed import without backup attestation -> error; no mutation.
- Confirmed import with backup attestation -> migrate then `imported`, `refreshed`, or `already_present`.
- Confirmed rollback with no complete canonical installation -> error; do not report a false successful rollback.
- Ambiguous, duplicate, inactive, or conflicting phone/account rows -> error; transaction rolls back without partial rows.

### 5. Good / Base / Bad Cases

- Good: seven runtime phones import to seven separate parent/coach account scopes; every parent session sees only its two guardian-bound students, while the matching coach session sees only its own eight-player team.
- Base: a complete matching installation that still matches its rolling calendar and controlled display copy re-runs as `already_present` without duplicating records.
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

## Scenario: Legacy operational-profile idempotency

### 1. Scope / Trigger

- Trigger: a legacy secure slot already has a valid `student_operational_profiles` row for a guardian-bound student, but its row ID does not match the current canonical demo-record ID.
- The importer must preserve that legacy row. It must neither overwrite it nor report a complete installation as incomplete solely because its opaque profile ID differs.

### 2. Signatures

- `hasOperationalProfilesForGuardianStudents(database, account): boolean`
- SQLite uniqueness boundary: `student_operational_profiles(club_id, student_id)`.

### 3. Contracts

- Completeness checks for guardian operational profiles are semantic: each of the two guardian-bound student IDs must have exactly one profile in the slot's club.
- Canonical IDs remain the IDs inserted for fresh slots and remain valid rollback-manifest metadata; they are not a required identity proof for a pre-existing unique row.
- The importer must continue to use conflict-safe insertion so a legacy row is retained rather than replaced.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Both guardian students have profiles in the correct club, with canonical or legacy IDs | Treat the operational-profile part of the demo scope as complete. |
| Either guardian student has no profile in the correct club | Treat the scope as incomplete; a confirmed import may add the missing canonical row. |
| A profile belongs to another club | Do not count it as complete. |
| A complete scope has legacy profile IDs | Return `already_present`; do not replace or delete the legacy rows. |

### 5. Good / Base / Bad Cases

- Good: a prior secure slot retains two legacy profile IDs for its two guardian students; a re-run returns `already_present` and both IDs remain unchanged.
- Base: a fresh installation uses canonical profile IDs and a re-run remains `already_present`.
- Bad: requiring canonical profile IDs after the table's uniqueness constraint has retained an older row, causing every later confirmed import to return `imported` without meaningful mutation.

### 6. Tests Required

- Import the seven-slot fixture, replace the first slot's two canonical operational profiles with legacy-ID rows carrying the same club/student pairs, then re-run import.
- Assert result status is `already_present`.
- Assert both legacy IDs exist and the removed canonical IDs are not re-created.

### 7. Wrong vs Correct

#### Wrong

```ts
hasRows(database, "student_operational_profiles", records.operationalProfileIds)
```

This mistakes an importer-owned opaque ID for the database's real uniqueness contract.

#### Correct

```ts
SELECT COUNT(*) FROM student_operational_profiles
WHERE club_id = ? AND student_id IN (?, ?)
```

This checks the two guardian students' semantic operational-profile presence while preserving valid legacy rows.

## Scenario: Rolling Chinese demo refresh

### 1. Scope / Trigger

- Trigger: operator-supplied test accounts must remain demonstrable on a real device after their initial import date has passed.
- This applies only to the canonical `cq-talent-secure-test-*` rows. It must not update normal club data or a valid legacy operational profile.

### 2. Signatures

- `importSecureCqTalentTestAccounts(database, { phones, now })`
- `hasCurrentDemoData(database, manifest, now)`
- Result status: `imported | refreshed | already_present`.

### 3. Contracts

- A current demo set contains calendar records in each of the current and preceding two calendar weeks, plus upcoming training/match records for continued preview.
- A current demo set contains five completed training sessions across those three calendar weeks. Each one has all eight team participants and a canonical `lesson_credit_ledger` debit per participant, so C5 history is populated by database-backed records rather than client-side placeholders.
- Every calendar date is derived from the invocation timestamp, never hard-coded to a historical week.
- User-facing canonical data (account, parent, coach, team, student, activity, assessment, match, tactical-board, private-lesson, insurance, and communication copy) is Chinese.
- Storage/API enum values remain their contract values (for example `friendly`, `league`, participant status); the mini-program display boundary maps any visible enum to Chinese rather than changing the API contract.
- Refresh may upsert only the operation's canonical IDs. If a guardian student has a legacy operational profile under the table's `(club_id, student_id)` uniqueness boundary, retain it.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Complete scope has calendar dates outside the rolling window or stale canonical display copy | Confirmed import returns `refreshed` and updates only canonical rows. |
| Complete scope matches the rolling window and controlled labels | Return `already_present`; do not write rows. |
| `--dry-run` finds stale data | Return `dry_run`; do not mutate or migrate. |
| A legacy operational profile occupies its unique student slot | Preserve it; do not replace it to force canonical copy. |
| A visible API enum would otherwise appear raw in the mini-program | Translate at the client presentation boundary; do not store a localized enum. |

### 5. Good / Base / Bad Cases

- Good: a re-run on Wednesday, August 19, 2026 keeps events in the weeks beginning August 3, August 10, and August 17, while still providing upcoming records.
- Base: an unchanged current set returns `already_present` and does not duplicate data.
- Bad: considering five old event rows sufficient forever, or writing `友谊赛` into a `match_type` field whose contract is the enum `friendly`.

### 6. Tests Required

- Import once with an older `now`, then import with a later `now`; assert the result is `refreshed`, the rolling calendar weeks move, and canonical names/copy contain no English display words.
- Assert five completed training events cover the current and preceding two calendar weeks, contain eight participants each, and yield forty matching debit ledger rows per secure team.
- Preserve the existing partial eight-player upgrade and legacy operational-profile idempotency tests.
- Mini-program API normalization test asserts `friendly`, `league`, `cup`, and `internal` display as Chinese labels.

### 7. Wrong vs Correct

#### Wrong

```ts
if (hasCompleteDemoData(database, manifest)) return alreadyPresent;
```

This treats row count as freshness and leaves a real-device demo stuck in an old week.

#### Correct

```ts
if (hasCurrentDemoData(database, manifest, now)) return alreadyPresent;
return refreshCanonicalDemoRows(database, manifest, now);
```

The importer distinguishes a complete scope from a current, presentation-ready one.

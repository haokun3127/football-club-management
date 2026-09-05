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

- Good: seven runtime phones import to seven separate parent/coach account scopes; every parent session sees only its two guardian-bound students, while the matching coach session sees its own 19-player team with 11 starters and 8 substitutes for tactical-board demonstration.
- Base: a complete matching installation that still matches its rolling calendar and controlled display copy re-runs as `already_present` without duplicating records.
- Bad: a command accepts arbitrary IDs or prints a manifest/phone/token in its result; this expands deletion scope or leaks identity data.

### 6. Tests Required

- CLI test asserts confirmation for mutation, backup attestation, exact result projection, file-database enforcement, empty-install rollback rejection, and dry-run migration-count stability.
- Import test asserts seven isolated dual-role scopes, two guardian bindings per parent, 19-player coach teams with 11 starters and 8 substitutes, relative historical/current/future calendars, attendance, lesson history, eight-dimensional assessments, matches, tactical boards, idempotency, and conflict/partial-install rejection.
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
- A current demo set contains five completed training sessions across those three calendar weeks. Each one has all 19 team participants and a canonical `lesson_credit_ledger` debit per participant, so C5 history is populated by database-backed records rather than client-side placeholders.
- The current ledger shape is one opening credit plus five canonical training debits per roster student: 6 rows per student and 114 rows per slot. A slot therefore has 95 completed-training debit rows; read-only production audits must enumerate the suffixed IDs `-debit-1` through `-debit-5`, not the retired unsuffixed `-debit` IDs.
- Every calendar date is derived from the invocation timestamp, never hard-coded to a historical week.
- A canonical upcoming activity must start after the invocation timestamp. A refresh run later in a day must move the next scheduled training forward instead of producing an immediately stale `scheduled` activity.
- Eligible legacy secure-demo activities must be state-reconciled only inside the exact `club_id + cq-talent-secure-test slot ID prefix + (primary_team_id OR owner_coach_id)` scope for the same slot. This accommodates early secure records that retained an old team association while still belonging to the exact test coach. Ended activities become `completed`, future activities remain `scheduled`, pending historical participation becomes a final attendance state, and any linked match follows its activity state. Ordinary club data and another secure slot's team or coach remain untouched.
- User-facing canonical data (account, parent, coach, team, student, activity, assessment, match, tactical-board, private-lesson, insurance, and communication copy) is Chinese.
- Storage/API enum values remain their contract values (for example `friendly`, `league`, participant status); the mini-program display boundary maps any visible enum to Chinese rather than changing the API contract.
- Refresh may upsert only the operation's canonical IDs. The sole cleanup exception is a legacy duplicate training activity whose ID exactly matches `event-cq-talent-secure-test-<slot>-daily-%` and whose club plus team-or-coach ownership matches that same secure slot; refresh deletes that activity and its event-linked demo artifacts. If a guardian student has a legacy operational profile under the table's `(club_id, student_id)` uniqueness boundary, retain it.
- When the rolling settlement schema supersedes canonical ledger IDs, refresh must remove only the exact retired fixed IDs for the same secure slot before writing the new IDs. It must never delete by broad `student_id`, event, source, or name predicates because those can include coach-created records.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Complete scope has calendar dates outside the rolling window or stale canonical display copy | Confirmed import returns `refreshed` and updates only canonical rows. |
| Complete scope matches the rolling window and controlled labels | Return `already_present`; do not write rows. |
| `--dry-run` finds stale data | Return `dry_run`; do not mutate or migrate. |
| A legacy operational profile occupies its unique student slot | Preserve it; do not replace it to force canonical copy. |
| A complete slot retains retired `lesson-ledger-cq-talent-secure-test-<slot>-<student>-debit` rows | Return `refreshed`, remove only those exact retired IDs, and preserve the current five-session ledger rows. |
| A complete slot retains a scoped `daily-*` legacy training activity | Return `refreshed`, remove only that activity's event-linked demo artifacts, and preserve another team's or another slot's similarly named activity. |
| An ended secure-demo activity is still `scheduled`, or its participant is still invited/confirmed/pending leave | Return `refreshed`, reconcile only the exact secure slot/team activity namespace to final activity and attendance states. |
| A visible API enum would otherwise appear raw in the mini-program | Translate at the client presentation boundary; do not store a localized enum. |

### 5. Good / Base / Bad Cases

- Good: a re-run on Wednesday, August 19, 2026 keeps events in the weeks beginning August 3, August 10, and August 17, while still providing upcoming records.
- Base: an unchanged current set returns `already_present` and does not duplicate data.
- Bad: considering five old event rows sufficient forever, or writing `友谊赛` into a `match_type` field whose contract is the enum `friendly`.
- Bad: leaving a production audit helper on the retired one-debit-per-student contract; it reports a false database failure even when the rolling five-session import and BFF readback are correct.

### 6. Tests Required

- Import once with an older `now`, then import with a later `now`; assert the result is `refreshed`, the rolling calendar weeks move, and canonical names/copy contain no English display words.
- Assert five completed training events cover the current and preceding two calendar weeks, contain nineteen participants each, and yield ninety-five matching debit ledger rows per secure team.
- Seed the eight retired fixed settlement IDs into an otherwise-current slot; assert rerun returns `refreshed` and removes those IDs without affecting the current canonical ledger rows.
- Seed a same-slot `daily-*` duplicate with a participant plus a same-prefix activity for another team; assert rerun removes only the scoped duplicate and its participant.
- Preserve the existing partial nineteen-player upgrade and legacy operational-profile idempotency tests.
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

## Scenario: Legacy secure-demo venue repair

### 1. Scope / Trigger

- Trigger: a legacy calendar activity created for a secure Chongqing Talent demo slot has no `location_id`, causing the BFF to omit `venue` and the mini-program to display the missing-location fallback.
- This repair is limited to secure-demo activity IDs and the owning slot's exact team. Older generated records can have no `owner_coach_id`, so the repair must not require it. It must not fill missing locations for normal club activities.

### 2. Signatures

- `hasCurrentDemoData(database, manifest, now)`
- `importSecureCqTalentTestAccounts(database, { phones, now })`
- `backfillLegacyDemoActivityVenues(database, account, now)`

### 3. Contracts

- A `NULL location_id` makes an otherwise-complete secure slot stale, so the confirmed importer returns `refreshed` rather than `already_present`.
- Eligible legacy activities match all of: `club_id`, `event-cq-talent-secure-test-<slot>-%` ID namespace, `primary_team_id`, and `location_id IS NULL`.
- Training and other eligible activities receive `venue-cq-talent-sport-uni`; matches receive `venue-cq-talent-jiulongpo`. The seeded venue catalogue resolves those IDs to Chinese venue names at the BFF boundary.
- The repair never creates a venue, modifies a non-null location, or broadens to another team, coach, club, or ID namespace.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Canonical activities and eligible legacy activity all have locations | Import returns `already_present`; no rows change. |
| Eligible legacy activity has `NULL location_id` | Import returns `refreshed` and fills the type-appropriate existing venue ID. |
| Activity has the secure-looking name but another team | Leave it untouched. |
| Normal-club activity has `NULL location_id` | Leave it untouched. |

### 5. Good / Base / Bad Cases

- Good: an old secure training record gets the existing indoor training venue and appears with its Chinese venue name in the coach workbench.
- Base: current canonical activities retain their configured location IDs unchanged.
- Bad: `UPDATE calendar_events SET location_id = ... WHERE location_id IS NULL`; this would modify real club data outside the secure operation.

### 6. Tests Required

- Regression test inserts one matching legacy secure activity and one unrelated team's missing-location activity, reruns the importer, and asserts only the matching activity changes.
- Existing BFF test continues to assert that the three controlled venue IDs resolve to Chinese names.
- Production audit reports only aggregate `allActivitiesHaveVenue` and `venueNamesChinese` booleans; it must not print phones, tokens, or database paths.

### 7. Wrong vs Correct

#### Wrong

```ts
database.prepare("UPDATE calendar_events SET location_id = ? WHERE location_id IS NULL").run(venueId);
```

#### Correct

```ts
database.prepare(`
  UPDATE calendar_events
  SET location_id = ?
  WHERE club_id = ? AND id LIKE ? AND primary_team_id = ?
    AND location_id IS NULL
`).run(venueId, clubId, namespace, account.teamId);
```

The exact ownership predicates keep a demo-data repair from modifying ordinary club records.

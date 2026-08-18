# Secure test-account hardening handover — 2026-08-12

## 2026-08-18 addendum — seven detailed dual-role demo scopes

- The controlled operation now covers seven isolated, fixed-ID parent/coach scopes. Each parent is guardian-scoped to exactly two students; the corresponding coach is scoped to that account's own eight-player team.
- Each scope adds relative historical, current, and future training/match calendar data; eight-player attendance; lesson-credit history; eight-dimensional assessment raw results, normalized scores, metric records and lineage; completed and scheduled matches with events; and one persisted tactical board. The two parent-visible students also receive operational, insurance, private-lesson, and communication records.
- Required private runtime keys are `DATABASE_URL` and `SECURE_CQ_TALENT_TEST_PHONE_1` through `SECURE_CQ_TALENT_TEST_PHONE_7`. Values remain runtime-only and must not appear in source, fixtures, docs, logs, shell history, screenshots, or commits.
- This addendum changes no production state by itself. Production import still requires the separate restricted SQLite backup (main file plus WAL/SHM), dry-run, one-time authorization, confirmed import, API-only restart, health check, and role-scoped readback.

## Scope completed locally

- Production entrypoint no longer accepts header-only identity; local development explicitly enters through `apps/api/src/dev.ts`.
- Phone resolution is limited to a unique active user plus active club membership.
- Migration `0010_student_guardian_bindings.sql` and repository hydration support persisted guardian bindings.
- The original three-slot operation has been extended by the 2026-08-18 addendum to seven isolated, fixed-ID parent/coach test-account scopes, imported transactionally from runtime-only phone environment variables.
- The controlled CLI accepts only `import --dry-run`, confirmed import, and confirmed rollback. Its result is only `{ operation, status, accountCount }`.
- Dry-run is read-only, including SQLite migration state. Rollback refuses an absent/incomplete installation and uses only the canonical manifest with no externally supplied side-effect IDs.
- Bearer BFF regression covers pending role selection, parent/coach isolation, and phone-field omission.

## Commands

```powershell
# read-only preflight
pnpm --filter @football-club/api secure-test-accounts -- import --dry-run

# mutation requires the exact confirmation flag and a private backup attestation
pnpm --filter @football-club/api secure-test-accounts -- import --confirm-secure-cq-talent-test-accounts
pnpm --filter @football-club/api secure-test-accounts -- rollback --confirm-secure-cq-talent-test-accounts
```

Required private runtime keys: `DATABASE_URL` and `SECURE_CQ_TALENT_TEST_PHONE_1` through `SECURE_CQ_TALENT_TEST_PHONE_7`. Confirmed import also requires `SECURE_CQ_TALENT_TEST_ACCOUNTS_BACKUP_ATTESTED=1`, set only after the separately authorized backup. Do not place their values in source, shell history, tickets, docs, screenshots, logs, or commits.

## Verification performed locally (original 2026-08-12 batch)

- Focused secure-account test: 11 files / 103 tests passed.
- API typecheck and API build passed.
- Final local verification: domain `8 files / 19 tests`, mini-program `54 files / 306 tests`, and API `11 files / 103 tests` all passed; root typecheck, task-context validation, and `git diff --check` also passed. A prior root-script attempt had a transient mini-program Vitest worker exit despite all of its assertions passing; the isolated mini-program rerun was clean, and the final package-by-package results above are the completion evidence.

## 2026-08-18 local expansion verification

- Focused seven-slot secure-account test: `14/14` passed.
- API typecheck and API build passed.
- Final serial root check exited `0`: domain `19/19`, mini-program `332/332`, API `108/108`. `git diff --check` passed.

## Not performed

- No SSH, server access, production database access, backup, import, rollback, deployment, restart, or real device login occurred in this task.
- Production execution needs its own explicitly authorized runbook: verify target/volume, make a restricted backup including WAL/SHM, run dry-run, obtain a one-shot approval, run confirmed import, make bounded non-secret readback checks, restart only the API, then read back again.

## Files owned by this task

- `.trellis/tasks/08-12-secure-production-test-accounts/`
- `.trellis/spec/api/backend/secure-test-account-operations.md`
- `apps/api/db/migrations/0010_student_guardian_bindings.sql`
- `apps/api/src/dev.ts`
- `apps/api/src/ops/secure-cq-talent-test-accounts*.ts`
- `apps/api/src/ops/rollback-secure-cq-talent-test-accounts.ts`
- `apps/api/test/auth-context.test.ts`
- `apps/api/test/secure-cq-talent-test-accounts.test.ts`
- Related task-owned edits in `apps/api/src/auth/context.ts`, `apps/api/src/index.ts`, `apps/api/src/persistence/`, `apps/api/src/store.ts`, and their focused API tests.

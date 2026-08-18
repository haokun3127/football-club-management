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

## 2026-08-18 production execution (continuation)

- A restricted production SQLite backup was made before mutation; the main file was retained in the server-only backup location and the WAL/SHM state was recorded privately. Runtime phone values remained only in root-owned server environment files.
- The production dry-run returned only `{"operation":"import","status":"dry_run","accountCount":7}`. After explicit operator confirmation, the confirmed import returned only `{"operation":"import","status":"imported","accountCount":7}`.
- Only `cq-talent-api` was restarted after the write. Both the internal health probe and `https://cqtc.pomi.tech/health` returned HTTP 200.
- A bounded HTTPS BFF readback then created 14 short-lived, role-specific bearer sessions and deleted those exact session rows after verification. Every slot returned only its two parent-bound children, all five canonical events, and eight latest growth metrics for `parent`; its own eight-member roster, five canonical workbench events, eight radar metrics, and a saved eight-player tactical board for `coach`. Response projections did not contain phone fields.
- This is production API readback evidence, not real-device WeChat login evidence. A subsequent code-only release must re-run the controlled dry-run and expect `already_present`; real-device authorization, first role choice, and role switching remain required before declaring the production demo operation fully closed.

## 2026-08-18 authorized code-only release

- API releases `afd20e0` and `30d2869` were pushed to `dev`; `30d2869` was built from the committed Git tree and deployed as the running `cq-talent-api` image. The release changes only the secure importer's legacy operational-profile completeness check and related documentation; it does not re-import, seed, or overwrite production demo records.
- A new restricted SQLite snapshot was created before the container change, retaining the server-private WAL/SHM state. The previous API image remains tagged for controlled rollback. Only the API container was recreated.
- The first health poll used a zero-delay retry loop and elapsed before Node completed startup. Read-only diagnosis then confirmed the release container exited `0`, listened only on the loopback-published API port, and served the internal health route. Internal and public HTTPS health each returned HTTP `200` after startup.
- The deployed CLI dry-run returned `already_present` for all seven slots. A bounded BFF re-read again verified two parent children and eight latest metrics per slot, plus an eight-member coach roster, eight latest radar metrics, and one saved eight-player tactical board per slot. The exact temporary verification sessions were deleted in cleanup.
- This remains server-side evidence only. The seven physical-device authorization/role-switch checks in the table above are still pending.

## Real-device verification checklist (seven anonymous slots)

Run this once for each operator-supplied phone, recording only the slot number and pass/fail outcome in the operator's private acceptance record. Do not put the phone, authorization code, bearer token, screenshot containing personal data, or session payload in this repository.

1. On a physical phone, force-close the mini program, reopen it, and use the real WeChat phone authorization control once. Do not retry automatically after a cancellation or rate-limit message.
2. Confirm the first authenticated response offers both `parent` and `coach`, then choose `parent`. Verify that the home/schedule and growth pages show exactly two children for this slot, five current demo calendar entries across the supplied date window, and an eight-dimension growth view. Verify no other slot's children are visible.
3. Use the in-app role-switch entry to choose `coach`. Verify that the schedule/workbench, team, student radar, attendance, training plan, match and tactical-board pages all load. The team must contain exactly eight players; the scheduled match must show a saved 4-3-3 board with eight players.
4. Switch back to `parent`, then exit the current session using the in-app logout entry. Reopen and authorize again; confirm the expected role picker and role isolation still apply.
5. Mark the slot as accepted only when both roles complete the above path without a fallback identity, fabricated data, or cross-slot visibility. A server-side BFF readback is supporting evidence only; it does not replace this physical-device step.

| Slot | Real WeChat authorization | Parent scope | Coach scope | Role switch / re-login | Operator sign-off |
| --- | --- | --- | --- | --- | --- |
| 1 | pending | pending | pending | pending | pending |
| 2 | pending | pending | pending | pending | pending |
| 3 | pending | pending | pending | pending | pending |
| 4 | pending | pending | pending | pending | pending |
| 5 | pending | pending | pending | pending | pending |
| 6 | pending | pending | pending | pending | pending |
| 7 | pending | pending | pending | pending | pending |

## Original task boundary (historical)

- The original 2026-08-12 code-only task did not itself access the server. The explicitly authorized 2026-08-18 production import/readback and later code-only release are recorded above and supersede this historical boundary for current deployment evidence.
- Real-device WeChat authorization, first role selection, role switching and visual acceptance have not been performed by these server operations.

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

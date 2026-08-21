# Seven Phone-Bound Demo Accounts Implementation Plan

> **For agentic workers:** Execute this plan inline with the Trellis task checkpoints; do not use a public seed or client fixture.

**Goal:** Configure seven runtime-supplied WeChat phone identities as isolated parent+coach test accounts with extensive backend-backed demo data.

**Architecture:** Extend the canonical secure-account operation to seven deterministic slots and make the confirmed import transactionally ensure both base identity and namespaced demo data. Preserve parent privacy by binding only two students to each parent while giving each coach an eight-player team roster. Production mutation is performed only after a restricted SQLite backup and dry-run.

**Tech Stack:** TypeScript, Node `node:sqlite`, Fastify BFF, Vitest, pnpm 10.33.0, Dockerized Ubuntu API, SQLite WAL.

## Global Constraints

- Runtime phone values never enter source, docs, logs, screenshots, fixtures, commit messages, or returned JSON.
- The operation accepts exactly seven unique runtime phone values and only the canonical fixed IDs.
- Existing user-owned dirty files remain untouched and are never staged with `git add -A`.
- Parent projections remain limited to guardian bindings; coach projections remain club/team scoped.
- Confirmed production mutation requires a restricted backup including WAL/SHM and `SECURE_CQ_TALENT_TEST_ACCOUNTS_BACKUP_ATTESTED=1`.
- No startup seed, public route, fake session, fake role, or client-only data is allowed.

## Task 1: Extend canonical seven-slot manifest and import semantics

**Files:**
- Modify: `apps/api/src/ops/secure-cq-talent-test-accounts.ts`
- Modify: `apps/api/src/ops/secure-cq-talent-test-accounts-command.ts`
- Modify: `apps/api/src/ops/secure-cq-talent-test-accounts-cli.ts`
- Modify: `apps/api/src/ops/rollback-secure-cq-talent-test-accounts.ts`
- Test: `apps/api/test/secure-cq-talent-test-accounts.test.ts`

**Interfaces:**
- `readSecureCqTalentTestAccountPhones(environment)` returns a seven-element tuple.
- The canonical manifest contains slots `1..7`; slots `1..3` keep their existing IDs and slot `4..7` use the same deterministic ID pattern.
- Confirmed import accepts existing complete slots and inserts only missing slots; partial/incompatible rows still abort.

- [ ] Add a failing test asserting seven runtime phones, seven manifest entries, and a rerun that reports `already_present` without duplicate base rows.
- [ ] Add a failing test for the production-shaped partial state: slots 1–3 already exist, slots 4–7 are absent; confirmed import must insert only slots 4–7.
- [ ] Implement the seven-slot tuple validation and per-slot existing/absent decision inside the existing transaction.
- [ ] Update rollback canonical-manifest validation from version 1/three slots to the new version and seven slots, retaining side-effect namespace checks.
- [ ] Run `npx --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/secure-cq-talent-test-accounts.test.ts` and confirm the focused suite passes.

## Task 2: Ensure extensive per-slot demo data

**Files:**
- Modify: `apps/api/src/ops/secure-cq-talent-test-accounts.ts`
- Modify: `apps/api/test/secure-cq-talent-test-accounts.test.ts`

**Interfaces:**
- Confirmed import invokes an idempotent `ensureSecureCqTalentDemoData(database, manifest, now)` before commit.
- Demo rows use only fixed `cq-talent-secure-test-` namespaces and do not change non-demo rows.

- [ ] Add failing assertions for eight team members, two guardian bindings, dynamic scheduled dates after the supplied `now`, assessment/raw/score rows, matches/match events, tactical board, lesson ledger, insurance, private lessons, and communication logs.
- [ ] Insert six coach-only synthetic students per slot and exactly two guardian bindings; prove the extra six have no binding to that slot parent.
- [ ] Insert historical/current/future training and match events, eight participants per demo event, and deterministic attendance statuses.
- [ ] Insert one assessment per guardian student with linked raw results and normalized scores, plus metric records for the entire roster.
- [ ] Insert completed/scheduled match rows, match events, and one tactical board for the scheduled match.
- [ ] Insert parent-facing lesson/insurance/private-lesson/communication demo records and make every insert idempotent.
- [ ] Verify the read-side store/repository can hydrate the inserted rows after reopening the SQLite file.

## Task 3: Local verification and bounded commit

**Files:**
- Modify: `.trellis/tasks/08-18-production-three-phone-demo-data/*`
- Modify: `docs/current/progress.md`
- Modify: `docs/current/agent-handover-2026-08-12-secure-test-accounts.md`

- [ ] Run API focused tests, typecheck, build, root check, and `git diff --check`.
- [ ] Inspect `git diff --stat` and `git diff --name-only`; stage only task-owned paths.
- [ ] Commit the local operation/test/doc batch separately from any pre-existing dirty work.

## Task 4: Production backup, import, restart, and readback

**Files:**
- No production credentials or phone values are written to repository files.
- Use an ephemeral operator-side command based on `tmp/prod-verify/` patterns; do not commit it.

- [ ] Verify the current container, mounted volume, database path, and API health without writing.
- [ ] Create a restricted backup that preserves the SQLite database plus WAL/SHM and record its private path.
- [ ] Run seven-phone dry-run; inspect only status/count; then set the one-shot backup attestation.
- [ ] Run confirmed import, restart only `cq-talent-api`, and verify `https://cqtc.pomi.tech/health` returns 200.
- [ ] Use temporary authenticated parent and coach sessions to read bounded counts for every slot, then provide the user a real-device checklist.

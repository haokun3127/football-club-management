# Production demo data for seven phone-bound accounts

## Goal

Provide seven operator-supplied WeChat phone identities with isolated, durable parent+coach test scopes so real-device preview can exercise both role experiences using backend-backed demo data.

## Confirmed requirements

- All seven runtime phone values supplied by the operator map to separate fixed test-account slots and receive both `parent` and `coach` roles.
- Existing slots 1–3 and their current data must remain valid; new slots 4–7 must be added without changing unrelated clubs, users, or ordinary seed data.
- Every slot must have two guardian-bound students visible to the parent role and an eight-student coach roster; the six additional coach-only students must not gain a guardian binding to that slot's parent.
- Every slot must have current/future and historical calendar records, participant attendance states, training/lesson history, ability metric records, at least one persisted assessment with raw results and scores, a completed and scheduled match with match events, and a saved tactical board.
- Demo dates must be relative to the execution time so the real-device schedule is not frozen in an old week. On August 18, 2026, at least one scheduled item must remain after August 18, 2026.
- The operation must be explicit, file-database-only, transactionally idempotent, and protected by a restricted SQLite backup including WAL/SHM before mutation.
- Runtime phone values are private inputs only. They must not appear in source, fixtures, docs, logs, command output, commit messages, or result payloads. Demo profile labels remain synthetic and non-identifying.
- Parent reads must remain guardian-scoped to the two bound students; coach reads may see only the slot's own club/team roster and records.

## Out of scope

- No public import route, startup seed, client-side fixture, fake session, fake role, or fake API response.
- No changes to ordinary development seed data or unrelated production accounts.
- No visual Figma changes in this data operation; true-device visual acceptance happens after API readback.

## Acceptance criteria

- [ ] A dry-run validates exactly seven unique runtime phones and reports only operation status/count, without mutating the file database.
- [ ] A confirmed run accepts a complete existing slots 1–3 installation plus missing slots 4–7, and is safe to rerun after all seven slots are present.
- [ ] Each slot has one active membership, parent profile, coach profile, team, eight students, two guardian bindings, eight team members, historical/current/future events, and eight participants per demo event.
- [ ] Parent BFF returns exactly two students for each slot; coach BFF returns the eight-player roster and non-empty attendance, training, assessment, match, and tactical-board data.
- [ ] Reopening the database and restarting the API preserves all imported rows and saved tactical-board data.
- [ ] A scoped rollback rejects incomplete/tampered manifests and removes only the canonical seven-slot rows plus namespaced demo side effects.
- [ ] Focused tests, API typecheck/build, root check, and `git diff --check` pass before production execution.
- [ ] Production execution records backup path/attestation privately, restarts only the API, returns health 200, and supplies a per-phone parent/coach real-device verification checklist without exposing phone values in repository artifacts.

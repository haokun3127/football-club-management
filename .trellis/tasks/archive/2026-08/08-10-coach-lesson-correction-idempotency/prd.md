# Implement safe idempotent C5.1 lesson correction

## Goal

Implement C5.1 Lesson Correction (`93:765`) from Figma file `zZ6wKyOHKcO4UYXDd9jGwv` as a truthful, safe, idempotent coach workflow. The page must use real event members and lesson ledgers, and the supporting API must reject unsafe correction requests.

## Requirements

- Page route: `/pages/coach/lesson-correction/index?id=<eventId>`.
- Load the real coach workbench and lesson confirmation in parallel. Display and submit only the `studentId` intersection; any read failure disables correction.
- The correction API accepts only `studentId`, `lessonDelta` (`-0.5` or `0.5`), and optional `reason`, plus a required bounded `Idempotency-Key`. It rejects a client-provided actor ID.
- The server derives the actor from the authenticated request, verifies coach access, verifies the event, and verifies that the student belongs to the event. It returns stable failures for invalid member, invalid delta, missing key, and same-key/different-payload conflicts.
- The server derives a stable ledger `sourceId` from club/event/student/actor/idempotency key; replay with the same payload returns the prior result without another adjustment. No migration, Store, or persistence repository change is permitted.
- The UI permits only 0.5 increments. It has no fabricated “system difference,” sample names, avatars, balances, or implied anomaly source.
- On a multi-student save, send pending rows in stable order, stop at the first error, retain the same key for uncertain retries, re-read both sources, and show a safe partial-save state. Only an all-success save may navigate away.
- WXML consumes precomputed TypeScript view data and uses no array/string helper calls.

## Acceptance Criteria

- [x] Server rejects non-members, invalid delta, missing or conflicting idempotency keys, and client actor values without writing the ledger.
- [x] Same key and payload is a replay after an in-memory and a reopened SQLite store; it produces one ledger entry.
- [x] Server-side ledger actor equals the authenticated user, never a client field.
- [x] Page uses only the dual-read student intersection and actual balances, with no fabricated anomaly data.
- [x] Page keeps ±0.5 edits and keys stable across failed retries, stops after partial failure, re-reads, and does not navigate on partial failure.
- [x] Focused API/miniprogram tests, package typechecks/build, `git diff --check`, and code-spec update pass.
- [ ] Device screenshot comparison is intentionally non-blocking under the current all-pages goal and is not claimed as complete.

## Notes

- Figma source: `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-765`.
- Existing `apps/api/src/store.ts`, `apps/api/src/persistence/**`, migrations, assessment work, and unrelated page/config changes are protected in-flight work and must not be changed or staged.
- `apps/api/test/server.test.ts` already contains unrelated unstaged work. Any compatibility edit must be isolated with `git add -p`, and new safety tests belong in a separate test file.

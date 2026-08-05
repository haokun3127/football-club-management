# Implement: Coach Attendance SQLite Persistence

## Ordered Steps

1. Add the file-backed persistence regression in `apps/api/test/persistence.test.ts`: save status and a non-empty note, close the first database, reopen the same path with `seed:true`, read the event detail, and assert participant uniqueness, preservation, and isolation of other participants.
2. Run the focused persistence test to capture RED against the current in-memory `PersistentApiStore` behavior.
3. Add `apps/api/src/persistence/calendar-repositories.ts`; register it in `platform-persistence.ts`, seed calendar events before participants, and make seed writes insert-if-absent.
4. Override `PersistentApiStore` participant/event reads and writes so event details and student timelines use SQLite-backed data while preserving service behavior and lesson debit rules.
5. Extend `apps/api/test/server.test.ts` for coach success, parent/no-scope coach `403`, idempotency replay/conflict `409`, and present/late debit source IDs.
6. Update only `apps/miniprogram-cq-talent/utils/api.ts` and `api.test.mjs` to normalize backend participant `status` and `note` fields.
7. Run API persistence/server tests, API typecheck and build, mini-program tests/typecheck, and `git diff --check`.
8. Use an outside-repository file `DATABASE_URL`; perform PUT with a non-empty note, record the confirmed API PID, build, stop only that PID, restart `dist/index.js` with the same database, and GET/read back the same status/note.
9. Attempt the real coach C4 workbench readback. If a trusted `375×812` screenshot can be obtained, compare it with `zZ6wKyOHKcO4UYXDd9jGwv / 93:665 / C4 Attendance`; otherwise report visual acceptance as pending.

## Review Gates

- Do not edit migrations, attendance page WXML/WXSS/index.ts, P1, login, screenshot tooling, Figma, project configuration, icons, WPS files, or unrelated dirty paths.
- Do not commit. Report RED/GREEN evidence, edited files, restart readback, C4 evidence, and unrecognized dirty files.

## Execution Evidence (2026-08-05)

- RED: the file-backed restart regression found zero rows for the original `(club_id, event_id, student_id)` participant after reopening a seeded database, proving the old path kept attendance only in memory.
- GREEN: `CalendarRepository` now owns calendar-event and participant seed/read/write operations; seed writes are insert-if-absent and attendance writes upsert only `status`, `note`, and `updated_at` by the participant natural key.
- Verification: focused persistence and attendance-contract regressions passed; the API package passed `5 files / 66 tests`, API typecheck and build passed, and the mini-program package passed typecheck plus `8 files / 45 tests`.
- Restart proof: a temporary file database at `C:\Users\ASUS\AppData\Local\Temp\cq-talent-attendance-restart-verified-0905591a3c2a4215ad0f20787339db96.sqlite` accepted `present` with a non-empty note; confirmed PID `30684` running `node dist/index.js` was stopped, PID `11864` restarted against the same database, and GET read back the same status/note with exactly one `event-training-1-student-1` attendance debit of `-1`.
- C4 visual acceptance remains pending: no trusted real-coach `375x812` DevTools/device screenshot was captured in this batch.

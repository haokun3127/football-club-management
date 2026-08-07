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
- 实施前的“Do not commit”约束已被授权提交 `6526fe4` 取代；本任务状态仍为 `in_progress`，不归档。继续报告 RED/GREEN 证据、编辑文件、重启读回、C4 证据和未识别脏文件。

## Execution Evidence (2026-08-05)

- RED: the file-backed restart regression found zero rows for the original `(club_id, event_id, student_id)` participant after reopening a seeded database, proving the old path kept attendance only in memory.
- GREEN: `CalendarRepository` now owns calendar-event and participant seed/read/write operations; seed writes are insert-if-absent and attendance writes upsert only `status`, `note`, and `updated_at` by the participant natural key.
- Verification: focused persistence and attendance-contract regressions passed; the API package passed `5 files / 66 tests`, API typecheck and build passed, and the mini-program package passed typecheck plus `8 files / 45 tests`.
- Restart proof: a temporary file database at `C:\Users\ASUS\AppData\Local\Temp\cq-talent-attendance-restart-verified-0905591a3c2a4215ad0f20787339db96.sqlite` accepted `present` with a non-empty note; confirmed PID `30684` running `node dist/index.js` was stopped, PID `11864` restarted against the same database, and GET read back the same status/note with exactly one `event-training-1-student-1` attendance debit of `-1`.
- C4 visual acceptance remains pending: no trusted real-coach `375x812` DevTools/device screenshot was captured in this batch.

## Production Deployment Evidence (2026-08-05)

- Commit `6526fe4` is deployed in container `cq-talent-api` from `/opt/cq-talent-releases/6526fe4`; `/opt/cq-talent-api` remains as a non-Git working tree. SQLite uses named volume `cq-talent-api-data`.
- The production API is bound only to `127.0.0.1:3000`; Nginx TLS proxies `cqtc.pomi.tech` to that listener. HTTPS `/health` returned `200`, and OpenAPI exposes `/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/attendance`.
- This production check proves health and route reachability only. It does not prove a real coach PUT, production same-database restart readback, or C4 visual acceptance. Local file-backed SQLite restart readback remains a separate verified proof.
- Backup locations, the actual SQLite file path, environment paths/values, and credentials are intentionally not recorded. No C4 visual evidence was obtained, and the task remains `in_progress`.

## Production Persistence Verification (2026-08-07)

- Plan reviewed under the Sol/Terra gate (Terra: conditional approval, 10 conditions accepted). Pre-write local code review established: attendance PUT is an upsert by `(eventId, studentId)`; the lesson-debit side effect fires only for `present`/`late` and is idempotent per sourceId (`store.ts` `recordEventParticipants` / `recordLessonAdjustment` early-return on existing `lesson-ledger-debit-{eventId}-{studentId}`); no DELETE attendance endpoint exists, so restore = PUT of original values. Production build `9720b40` was confirmed via `git merge-base --is-ancestor` to contain the attendance SQLite commit `6526fe4`.
- Target selection: `event-training-1` / `student-1`, a seed event owned by seed coach `coach-1`. Production pre-write snapshot showed status `confirmed`, no note, `updatedAt=2026-06-25T00:00:00.000Z`, and the student lesson ledger at balance 0 with 0 entries. `x-user-id: user-coach-1` was verified to resolve to the seed coach identity (`role=coach`, `coachId=coach-1`), confirming Nginx preserves the header; no real historical course data was involved.
- Write (2026-08-07T02:08:37Z, server Date header baseline 02:05:58Z): PUT with status unchanged (`confirmed`) plus marker note `prod-verify-2026-08-07` returned `200`; immediate GET read back the same record. Ledger remained balance 0 / 0 entries — zero billing side effect by construction.
- Restart proof: the production container `cq-talent-api` (previously `Up 12 hours`) was restarted once over SSH; local `127.0.0.1:3000/health` returned `200` after 18s. Post-restart HTTPS GET read back the identical record including the marker note and the same `updatedAt` — this is the production same-database restart readback that was previously missing. Conclusion: production coach attendance writes persist in the SQLite named volume, under the single-container/single-upstream assumption observed (`docker ps` showed one `cq-talent-api` container).
- Restore: PUT with `note: ""` returned `200`; GET confirmed the marker cleared and status still `confirmed`; final `/health` `200` at 02:10:20Z. Known residual differences versus the pre-write snapshot, honestly recorded: `note` is now an empty string instead of absent, and `updatedAt` is `2026-08-07T02:10:20.120Z`.
- Boundaries: this batch proves production attendance PUT → restart → readback persistence only. It does not prove real WeChat login, role routing, real phone binding, or C4 `375x812` visual acceptance; those remain pending. Raw request/response JSON evidence is kept locally under the gitignored `tmp/prod-verify/` directory.

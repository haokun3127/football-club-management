# C4 real-data coverage audit

All entries below are server-seeded, SQLite-persisted records enabled only by `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`; no mini-program mock is used.

| Inspection area | API / persisted source | Current acceptance coverage |
| --- | --- | --- |
| C1 schedule and C2 workbench | coach events plus event participants | Six fixed demo events owned by the acceptance coach; every event has the same 16-member coach roster. |
| C4 quick attendance | `GET /coach/events/:eventId/workbench` and `PUT .../attendance` | The completed training demo supplies 10 `present`, 2 `late`, 2 `absent`, 1 `leave_requested`, and 1 `excused` saved record. The scheduled training keeps 16 RSVP `confirmed` records, which the client truthfully normalizes to `pending` until the coach records attendance. |
| C4.1 submitted summary | workbench reload by event ID after PUT | Counts, date, time and course title are recalculated from the persisted roster; query-string values are not trusted. |
| C4.2 correction | existing event-scoped roster and attendance writer | Only a general correction state is supported. Its per-player notes can be added, updated, or explicitly cleared through the real attendance payload. There is no persisted parent-dispute, exception-list or global correction-note contract, so those Figma examples remain intentionally absent. |
| C5 lesson confirmation | event participants plus lesson ledger | Each demo student has a persisted balance and attendance-backed debit path. |
| C7 tactical board | tactical board plus 16-member roster | 11 starters and 5 substitutes, with persisted save/restart readback. |
| C8/C9/C14/C15 | training sessions, roster, metrics | Three completed trainings, one completed match, 128 acceptance metric records. |

## Privacy boundary

The acceptance coach sees the 16-member team only in coach-scoped BFF responses. The paired parent remains bound to exactly two children; parent children, calendar and event participant projections remain guardian-filtered.

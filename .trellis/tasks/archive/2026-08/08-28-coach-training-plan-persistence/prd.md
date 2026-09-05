# Coach training plan persistence

## Goal

Ensure a coach-selected training plan remains attached to the same real training event after the API process is stopped and restarted against the same SQLite database.

## Requirements

- Preserve the existing app-client route contract for `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects`.
- Persist the event's `TrainingSession` association, including event id, session-plan id, kind, intensity, and audit timestamps.
- Keep the existing `session_plans` behavior: system plans remain visible to every club, club plans remain club-scoped, and seed replay must not overwrite a saved plan.
- Reopen the same file-backed database, rebuild the persistent store, and verify the coach workbench returns the saved training session, selected project ids, and resolved project data.
- Keep all unrelated dirty files untouched. Do not add fake training projects, events, sessions, accounts, or API responses.
- This persistence slice does not require mini-program UI changes.

## Acceptance Criteria

- [ ] A new migration creates a club-scoped `training_sessions` table with one row per club/event.
- [ ] Repository and `PersistentApiStore` save/read/merge `TrainingSession` rows with club scoping.
- [ ] Saving training projects updates the real training session and session plan, and a close/reopen/readback test returns both.
- [ ] Seed replay uses insert-if-absent for training sessions and does not overwrite a persisted association or intensity.
- [ ] Focused persistence/API tests, API typecheck, full repository check, and `git diff --check` pass.
- [ ] Documentation records the restart verification and distinguishes API/persistence validation from visual acceptance.

## Notes

- The mini-program already reads training data from the coach workbench; no frontend route or visual change is needed for this persistence slice.

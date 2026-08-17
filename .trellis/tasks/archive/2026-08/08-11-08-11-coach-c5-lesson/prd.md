# Coach C5 lesson Figma restoration

## Goal

Restore coach lesson and lesson-correction pages against the current online Figma while preserving real persisted lesson records and acceptance demonstration data.

## Requirements

- Online Figma is authoritative: `zZ6wKyOHKcO4UYXDd9jGwv`, C5 `93:734` and C5.1 `93:765`, both 375x812.
- C5 must read only the real event-scoped coach workbench and lesson-confirmation BFF responses. Its roster, names, balances and confirmation result must not be simulated in the mini-program.
- Keep the existing normal confirmation and per-student correction endpoints. A real confirmation must be re-read from the BFF; corrections must retain their existing idempotency and event/coach scope.
- C5 confirmation continues to use only the existing `POST /coach/events/:eventId/lesson-confirmation`; C5.1 correction continues to use only the existing `PATCH` on that same path. No endpoint, payload field or authority source is added or replaced.
- Restore C5 to the Figma hierarchy: 88px soft header, dark activity summary, compact lesson list, a 52px primary confirmation action and the coach tab bar. Long real rosters must remain scrollable without clipping the action or tab bar.
- Restore C5.1 to the current Figma correction hierarchy while keeping only actual roster, ledger and optional correction-reason data. Do not invent a parent dispute, a fixed five-student roster, or sample credit balances.
- Preserve the existing real acceptance seed and normal API-write path. If it lacks an inspectable lesson state, add only deterministic opt-in seed records and regression coverage; never add a client fixture or public seed endpoint.
- Do not stage unrelated user-owned dirty files.
- All WXML remains expression-only: array filtering, mapping, sorting and display-state derivation are precomputed in TypeScript view models.
- Preserve `requireRole("coach")`, the BFF's active coach membership check and event-scoped authorization. Parent views must not gain access to a coach lesson roster.

## Acceptance Criteria

- [x] C5 reads real lesson-confirmation data, confirms through the existing API, and reloads the event-scoped result.
- [x] C5.1 writes and re-reads a real per-student lesson correction while retaining existing idempotency and coach event scope.
- [x] The opt-in acceptance seed or normal write path provides a real, coach-visible lesson roster and ledger sufficient to inspect a confirmation and a correction without exposing unguarded students to a parent.
- [x] Focused lesson/correction tests, API tests when seed data changes, mini-program typecheck, the full repository check and `git diff --check` pass.
- [x] The C5/C5.1 API contract remains covered for non-coach/unauthorized-event rejection and parent participant projection remains unchanged.
- [x] The user explicitly waived new runtime screenshots as a completion prerequisite for this goal; C5/C5.1 remain documented as source/data/test evidence only and are not called pixel-accepted.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

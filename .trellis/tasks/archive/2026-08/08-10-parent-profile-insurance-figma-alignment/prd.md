# Align parent profile and lessons insurance to Figma

## Goal

Align P7 Parent Profile Hub and P7.1 Lessons Insurance with online Figma, using only real child, schedule and profile data.

## Design source

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:336 / P7`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:364 / P7.1`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:92 / CODE P7`

- Use real children/student-home/calendar/reminder data and truthful insurance/lesson fields only.
- Do not fabricate lesson totals, tenure, insurance coverage/status, reminders or activities.
- Errors must reach page error state; WXML must use computed view fields.

- [x] P7/P7.1 preserve real routes and show clear empty/unavailable states for unsupported design fields.
- [x] RED tests precede the minimal fixes; package/type/diff checks pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

## Validation record (2026-08-10)

- RED: 3 files / 8 tests, with 5 expected failures covering swallowed student-home errors, sample profile content, cross-child training counts, and unknown insurance state.
- GREEN: focused 8/8; mini-program package 17 files / 81 tests; mini-program typecheck; root check (domain 18, API 68, mini-program 81); `git diff --check`.
- Visual note: the project-wide goal waives the real-device screenshot gate for this implementation pass. No DevTools or real-device visual approval is claimed for this batch.

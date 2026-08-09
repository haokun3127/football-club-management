# Align parent private lesson pages to Figma

## Goal

Implement truthful P9 private lesson form and P9.1 persisted result using supported appointment contracts.

## Requirements

- Online design authority: `zZ6wKyOHKcO4UYXDd9jGwv`, P9 `93:500` and P9.1 `93:531`.
- P9 submits only a real parent private-lesson request (`studentId`, `coachName`, `date`, `timeSlot`, `goals`, `note`) and prevents duplicate submission while in flight.
- No real availability, goal-library, coach-assignment, or price contract exists. Do not invent Figma example coaches, time slots, training targets, packages, fees, or confirmation promises.
- P9.1 must retrieve the server-persisted request by its returned id and real student id before showing success. Error, missing-record, 403, and network paths must not display a success summary.
- WXML templates use precomputed view data. Exclude backend/shared/config and all unrelated dirty paths.

## Acceptance Criteria

- [x] P9 disables submit when required real fields or coach assignment are absent; 400/403 do not navigate; duplicate taps produce one request.
- [x] P9.1 renders only persisted request data after readback and provides truthful navigations.
- [x] RED tests precede changes; package tests, typecheck, task validation, and diff check pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

## Validation record (2026-08-10)

- P9 RED: 5 expected failures for sample slots/goals, invented coach fallback, duplicate submission, and unsafe navigation. GREEN: focused 5/5; mini-program package 22 files / 103 tests; typecheck and diff check.
- P9.1 RED: 5 expected failures for unconditional success, missing query input, missing persisted record, and denied readback. GREEN: focused 5/5; mini-program package 23 files / 108 tests; typecheck and diff check.
- Screenshot approval is waived by the active full-implementation goal. No device visual approval is claimed for this batch.

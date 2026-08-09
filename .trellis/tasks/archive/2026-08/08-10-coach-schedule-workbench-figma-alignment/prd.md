# Align coach schedule workbench pages to Figma

## Goal

Implement C1 coach schedule, C2 activity workbench and C3 activity change pages with existing API contracts.

## Requirements

- Figma authority: `zZ6wKyOHKcO4UYXDd9jGwv`; C1 `93:578`, C2 `93:606`, C3 `93:634`.
- Implement C1, C2 and C3 as independent page batches using only existing coach API contracts.
- Do not invent Figma sample attendance counts, teams, people, venues, score, timer, training completion, schedule data, or change request content.
- WXML view data is precomputed; no shared, backend, config, or unrelated dirty files may change.

## Acceptance Criteria

- [x] C1 maps real coach home events/tasks/teams/summary with truthful empty/error states.
- [x] C2 maps real event workbench data and exposes only supported workflow actions.
- [x] C3 builds and submits only valid real event-change requests with duplicate-submit protection.
- [x] Every batch is tested, typechecked, documented, independently committed, then archived.

## Validation record (2026-08-10)

- C1: focused 4/4; mini-program package 24 files / 112 tests; typecheck and diff check.
- C2: focused 5/5; mini-program package 25 files / 117 tests; typecheck and diff check.
- C3: focused 5/5; mini-program package 26 files / 122 tests; typecheck and diff check.
- Screenshot approval is waived by the active full-implementation goal; no device visual approval is claimed.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

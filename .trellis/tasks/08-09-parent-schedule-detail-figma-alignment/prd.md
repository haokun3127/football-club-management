# Align parent schedule detail states to Figma

## Goal

Align the single real parent activity-detail route with P2 Training, P2.1 Match and P2.2 Other Activity in the online Figma design, without inventing an activity when the API rejects or lacks data.

## Design source

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:139 / P2 Training Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:170 / P2.1 Match Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:198 / P2.2 Other Activity Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:87, 222:88, 222:89 / CODE P2`

## Requirements

- Retain `/pages/parent/event/index?id=<eventId>` and its real `getParentActivityDetail()` request.
- Authentication, ownership and missing-event errors must reach the error state; do not turn them into a fictional activity detail.
- Training, match and other type branches use only actual returned fields. Missing score, team, coach, participant or descriptive fields must use an explicit unavailable state, never Figma example data.
- Keep WXML method-free; derive display fields in TypeScript.
- Do not change API server, persistence, app configuration, shared navigation or existing dirty paths.

- [x] A rejected/missing activity request renders the route error state rather than a ready detail.
- [x] Training, match and other responses each preserve the route and render the matching Figma hierarchy from true data.
- [x] Figma’s visual geometry remains page-owned; no sample names, scores or activity facts are hard-coded as fallbacks.
- [x] Focused tests first failed for error propagation and display derivation, then passed with package test/typecheck/diff checks.

## Validation record

- RED: five focused assertions produced three expected failures: request failures were converted to a pending detail; match fallbacks showed a fabricated home team and `0 : 0`; other activity fallbacks showed a fixed notification.
- GREEN: focused 5/5, Mini Program package 65/65, TypeScript check and `git diff --check` passed.
- Root gate: `npx.cmd --yes pnpm@10.33.0 run check` passed with domain 18, API 68 and Mini Program 65 tests.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

# C12 Assessment Entry Visual Verification

## Goal

Verify the live coach-facing project-score-entry route against online Figma node `93:1030` at a logical 375×812 viewport, then make only the page-local changes required to restore visual geometry without changing assessment data behavior.

## Confirmed Facts

- The sole visual authority is Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1030` (`C12 Project Score Entry`).
- The real route is `pages/coach/test-entry/index`, entered with a real assessment `eventId` and, when available, its `templateId`.
- The page already derives roster rows, metric cells, drafts, progress, and submit state from real workbench/form data. Figma sample student names, scores, dates, and counts are not valid replacement data.
- C12.1 (`93:1061`) is an independently recorded autosave state and is outside this C12 ready-state verification task.

## Requirements

- Capture a current authenticated coach-session C12 ready state at 375×812 and compare it with online node `93:1030`.
- Treat device status-bar and WeChat menu capsule pixels, plus real data values, as distinct from page-geometry differences.
- If a mismatch exists, add a focused red regression test before the smallest WXML/WXSS/TS change; preserve API calls, role gates, draft persistence, inputs, and submit semantics.
- Keep display lists precomputed in TypeScript and do not use array methods in WXML.
- Record the result in the C12 design specification and `docs/current/progress.md`, then run the focused tests, typecheck, `git diff --check`, and the workspace gate before a path-limited commit.

## Acceptance Criteria

- [ ] A real C12 route with production-backed assessment data is reached without using Figma fixtures.
- [ ] A trustworthy 375×812 runtime screenshot and an online-Figma comparison artifact exist.
- [ ] Header, task summary, student-grid, fixed submit area, and coach TabBar are classified against the design; any actual layout differences are repaired and rechecked.
- [ ] Focused C12 tests, mini-program typecheck, `git diff --check`, and the full workspace `check` pass.
- [ ] Only task-owned paths are included in the commit; pre-existing dirty paths remain untouched.

## Out of Scope

- C12.1 autosave modal behavior or visual state.
- Writing assessment scores to production merely to create a screenshot.
- Changing assessment API contracts, role/session rules, or seed data.

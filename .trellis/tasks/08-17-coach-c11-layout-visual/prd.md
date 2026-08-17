# C11 Test Task Layout Visual Correction

## Goal

Make the real C11 coach test-task-list route match the current online Figma design node `93:1002` at the logical 375×812 viewport, while retaining production-backed task data and existing navigation behavior.

## Background

On August 17, 2026, a real DevTools simulator capture showed that C11's task cards extend to the page body's full 331px content width. The online design's list frame is 331px wide but has 16px horizontal inner padding, so its visual task cards are 299px wide. Live task titles, dates, progress, and statuses intentionally differ from the static Figma samples and are not visual defects.

## Requirements

- Use online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1002`, as the sole design authority.
- Apply the smallest page-local change in `apps/miniprogram-cq-talent/pages/coach/test-tasks/` needed to reproduce the list/card horizontal geometry and the 88px Figma top-navigation envelope.
- Preserve real API data, production task statuses, coach role gating, navigation, filters, and the honest unavailable-create behavior.
- Keep WXML free of array-method calls and avoid unrelated workspace changes.
- Add a focused regression assertion that fails before the layout change and passes after it.

## Acceptance Criteria

- [x] The C11 task-list frame preserves 16px inner gutters, producing 299px visual task cards at a 375px logical width.
- [x] The C11 custom top navigation uses the Figma 88px envelope without an additional accidental height rule.
- [x] The focused C11 test, mini-program typecheck, relevant mini-program tests, and `git diff --check` pass.
- [x] A new real 375×812 DevTools capture is compared against the online Figma design; data-value differences are explicitly distinguished from layout differences.
- [x] Only task-owned files are staged in the resulting commit; pre-existing dirty files remain untouched.

## Out of Scope

- Changing or fabricating production assessment task values.
- Creating a measurement-task API for either visible create affordance.
- Editing unrelated coach or parent pages.

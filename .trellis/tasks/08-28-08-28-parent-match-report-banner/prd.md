# Parent growth active-student consistency and report entry foundation

## Goal

Make the parent growth sub-pages use the same currently selected student as the growth home page, so switching children never leaves stale training-history or milestone data on screen.

## Requirements

- Read the persisted parent session's `currentStudentId` when loading growth milestones and training history.
- Fall back to the first bound child only when the session has no selected student or the selected student is no longer bound.
- Keep all data server-driven; do not add sample students, fake events, or fallback metrics.
- Preserve the existing full-screen Figma P4.1/P4.2 layouts and navigation behavior.
- Keep WXML free of JavaScript method calls such as `.map()`, `.filter()`, `.slice()`, and `.indexOf()`.

## Acceptance Criteria

- [ ] The milestones page requests calendar data for the selected student.
- [ ] The training-history page requests calendar data for the selected student.
- [ ] Regression tests fail before the fix and pass after it for both pages.
- [ ] The mini-program typecheck and full repository check pass.
- [ ] `git diff --check` passes and only this batch's paths are committed.

## Scope boundary

This batch does not add a new Figma page, API endpoint, semester-report schema, or production data. Those require a separate design/API contract batch after the current online Figma mapping is confirmed.

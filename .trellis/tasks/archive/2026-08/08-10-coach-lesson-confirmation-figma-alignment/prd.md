# Align C5 lesson confirmation to Figma

## Goal

Implement C5 Lesson Confirmation (`93:734`) in the current Figma source `zZ6wKyOHKcO4UYXDd9jGwv` as a real coach lesson-debit flow. Lesson correction is deliberately out of scope for this task and will be implemented as C5.1 in a later independent batch.

## Requirements

- Route: `/pages/coach/lesson/index?id=<eventId>`.
- Read the existing coach workbench and lesson-confirmation data only. The final submit set is the validated intersection of their real participant IDs.
- Confirming calls the existing confirmation API exactly once per valid user action. The existing API injects the actor from the real session; the page must never invent an actor ID, a student ID, a lesson balance, or a completed debit.
- Do not copy Figma sample names, teams, dates, avatar images, or the sample 1.5-lesson value. Render real roster names and balances and state the real one-lesson debit.
- C5 owns an in-page confirmation area above the coach tab bar (`bottom: 140rpx`) and reserves sufficient scroll space. It must not modify the shared submit bar.
- Register and render the coach role tab bar on this page.
- Remove C5's former inline return/top-up controls, correction API calls, correction state, and any link to the not-yet-implemented correction route.
- Failure messages are safe user-facing summaries, not raw API error text. A failed request retains the current selection and does not render a synthetic success state.
- WXML must consume a TypeScript-precomputed view model and may not call JS array/string helpers.

## Acceptance Criteria

- [x] Missing IDs make no API request and present a safe page state.
- [x] A workbench or confirmation read failure hides the confirmation action.
- [x] The page renders only real participants with their actual ledger balances and a truthful one-lesson confirmation label.
- [x] Zero selection is blocked; duplicate taps produce a single POST; a failed POST preserves state with a safe error; success re-reads real data.
- [x] No C5 inline correction/return/top-up APIs, fake sample values, or unimplemented correction route remain.
- [x] Focused page tests, package typecheck, package tests, and `git diff --check` pass.
- [ ] Device screenshot comparison is non-blocking for the current all-pages goal and is not claimed by this task.

## Notes

- Figma source: `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-734`.
- API limitation: the backend does not persist a separate "reason not debited" record. This task must not imply otherwise.
- C5.1 Lesson Correction is a separate future page and commit; C5 must not create a navigation link to it until it exists.

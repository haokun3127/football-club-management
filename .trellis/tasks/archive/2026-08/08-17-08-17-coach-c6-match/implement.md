# C6 match pages implementation plan

1. Record the existing dirty-worktree baseline and restrict edits to this task directory, `pages/coach/match/**`, `pages/coach/match-event-add/**`, targeted test files and `docs/current/progress.md`.
2. Read online Figma nodes `93:796`, `93:827`, `93:858`; inspect real BFF/API tests and the local draft helper before changing view code.
3. Add narrow failing page tests for the missing Figma rules: ready-state status host removal, 16px gutters/card geometry, compact chips/48px controls, outline add action, and local-only draft wording.
4. Apply only page-local TypeScript/WXML/WXSS changes. Preserve current API calls, coach scope, idempotency and local-draft semantics.
5. Run focused C6/C6.1/miniprogram API tests, miniprogram typecheck, full repository check and `git diff --check`.
6. Attempt route and 375x812 capture through the established DevTools session. If the opened IDE shows stale output after a confirmed route change, record that fact without accepting the image as visual proof.
7. Update progress, stage exact paths, commit and push the single C6 batch.

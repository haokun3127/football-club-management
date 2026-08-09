# C16.2 implementation

1. Read Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1238 / C16.2 Private Interest`, the session capability contract, and the current page.
2. Add a focused failing page test for the feature-flag tri-state, non-coach zero request/zero storage, static controls, forbidden sample values, direct chevron, local header geometry, and WXML safety.
3. Replace local availability state with a `requireRole("coach")` session projection. Do not import API helpers or storage helpers.
4. Replace `app-header` with the page-owned top bar and export only the direct Figma chevron icon.
5. Run focused test, miniprogram typecheck, package tests, task validation, and scoped diff checks. Do not commit, archive, or claim screenshot acceptance.

## Execution evidence (2026-08-10)

- RED: `pnpm.cmd --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/private-interest/index.test.mjs` failed all 4 checks against the former storage-backed acceptance state, default weekday/time-slot values, and interactive template.
- GREEN: the same focused command passed 1 file / 4 tests after projection of only `session.capabilities.features?.private_lessons` into enabled, unavailable, and pending-sync copy.
- No coach API call, local storage access, capability write, commit, screenshot, or deployment was performed.

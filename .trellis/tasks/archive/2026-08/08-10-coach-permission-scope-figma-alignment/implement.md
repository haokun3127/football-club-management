# C16.1 implementation

1. Read the page, session capability contract, and Figma node 93:1210.
2. Add a focused failing test for fixed allowlist projection, neutral labels, ignored home/unknown/duplicates, no-configuration state, non-coach zero request, static controls, direct assets, local header, and WXML safety.
3. Implement the page-local session projection and visual structure. Do not add an API call, save operation, or touch binding on controls.
4. Export exactly the four assets referenced by the Figma node: arrow-left, info, toggle-on, and toggle-off.
5. Run focused test, miniprogram typecheck, miniprogram package tests, task-context validation, and diff checks. Do not commit, archive, or claim screenshot acceptance.

## Execution evidence (2026-08-10)

- RED: `pnpm.cmd --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/permissions/index.test.mjs` failed 3 of 4 checks against the former hard-coded operation list and missing local Figma assets.
- GREEN: the same focused command passed 1 file / 4 tests after the page projected only recognized coach role entrypoints in the fixed neutral order.
- Verification: miniprogram typecheck passed; package test passed 42 files / 208 tests; task context validation passed. No API request, capability write, commit, screenshot, or deployment was performed.

## P1 visual token follow-up (2026-08-10)

- RED: the focused page test failed against the prior white header, 32rpx page gutters, text-only administrator guidance, and bare information icon.
- GREEN: the same focused test now locks the 176rpx `#fceeef` local header, 44rpx title and horizontal gutters, `#f6f7f9` page background, 16px section gaps, 12px cards, 32px blue information-icon container with a 16px icon, 40px by 24px availability marker, and static 52px red administrator pill.
- The availability projection, no-write boundary, and non-interactive switches remain unchanged.

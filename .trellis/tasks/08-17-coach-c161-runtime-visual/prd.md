# Coach C16.1 permission-scope runtime visual verification

## Goal

Align the coach permission-scope page with the live Figma design while preserving the server-confirmed permission model. The page must be verified in the current WeChat DevTools iPhone X 375×812 simulator and delivered as an isolated commit and push.

## Confirmed facts

- Design authority: Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1210` (`C16.1 Permission Scope`). The live design defines an 88px soft-pink top bar with a 16px left gutter.
- Route and implementation: `pages/coach/permissions/index` in `apps/miniprogram-cq-talent/pages/coach/permissions/`.
- The current source has `.c161-nav { height: 176rpx; padding-left: 44rpx; }`, while its WXML separately adds the native `navInset`; this is the confirmed vertical-offset cause.
- The current authenticated coach session has no recognized `roleEntrypoints.coach` values, so the route honestly renders `暂无可用入口`. The live Figma reference depicts a configured five-row state, but no client-side sample permissions may be fabricated.
- The user has pre-authorized continuous, autonomous delivery and commits for this Figma restoration goal. No additional product decision is outstanding for this scoped correction.

## Requirements

1. Read the online Figma node before changing implementation, and use existing WXML/WXSS/component patterns rather than generated React/Tailwind code.
2. Correct only the confirmed C16.1 navigation geometry: 88rpx design-content height, `box-sizing: content-box`, and 32rpx left gutter. Keep native top inset and existing back navigation behavior.
3. Preserve real `requireRole("coach")` and `roleEntrypoints` behavior. Do not add a false ready state, fake toggles, fake save handling, requests, storage writes, or WXML JavaScript methods.
4. Create a regression assertion first, observe its expected failure against the old geometry, then make the minimal WXSS correction.
5. Capture the real current DevTools simulator through the approved foreground `PrintWindow` path and retain a strict 375×812 local evidence image and Figma comparison. The live-data/permission-state difference must be documented, not hidden.
6. Run the targeted test and one non-overlapping root quality gate. Stage only this task's files, progress documentation, and task records; commit and push to `origin/dev`.

## Out of scope

- Changing production role/permission configuration or writing any production data.
- Turning the Figma example rows or `保存更改` into working client controls without a server contract.
- Modifying unrelated dirty files, session state, tabbar behavior, or other coach pages.

## Acceptance criteria

- [x] Figma node `93:1210` is freshly read and its geometry recorded.
- [x] The C16.1 source test is observed failing for the old 176rpx/44rpx geometry and passing after the minimal correction.
- [x] The route continues to show only the server-confirmed permission state and issues no invented API/storage/action side effects.
- [x] A real DevTools `PrintWindow` capture is exactly 375×812 and shows the corrected top-bar/body vertical structure; real empty-state data is explicitly classified as a data-state deviation from the configured Figma sample.
- [x] `npx --yes pnpm@10.33.0 run check` exits 0 in a single serial session, and `git diff --check` passes.
- [ ] Only scoped files are committed and pushed to `origin/dev`; unrelated worktree paths remain uncommitted.

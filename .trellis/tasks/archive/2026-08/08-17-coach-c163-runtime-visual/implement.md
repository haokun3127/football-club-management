# C16.3 coach account — implementation plan

1. Capture a route-confirmed baseline at `pages/coach/account/index` and compare it with online Figma node `93:1262`.
2. Update only the source-contract test to require the 88rpx centered-header structure; run it and record the red failure.
3. Add the non-interactive placeholder to WXML and apply the scoped header WXSS correction. Run the test green.
4. Let DevTools rebuild, re-check the route, recapture at 375×812, and visually compare top bar/body structure.
5. Update `docs/current/progress.md` and task evidence; run `git diff --check` and one serial root `npx --yes pnpm@10.33.0 run check`.
6. Path-limit the work commit and push, then archive/journal in separate bookkeeping commits.

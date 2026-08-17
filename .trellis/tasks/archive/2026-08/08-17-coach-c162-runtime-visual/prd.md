# Coach C16.2 private-interest runtime visual verification

## Goal

Align the coach private-interest page with live Figma node `93:1238` in the real WeChat DevTools iPhone X 375×812 simulator, while keeping private-lesson availability and acceptance status truthful to the server contract. Deliver the scoped change as an independent commit and push.

## Confirmed facts

- Design authority: Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1238` (`C16.2 Private Interest`). The reference has an 88px soft-pink top bar, a private-interest information card, an acceptance status row, and a weekly availability card; its sample shows configured times and a toggle.
- Route and implementation: `pages/coach/private-interest/index` in `apps/miniprogram-cq-talent/pages/coach/private-interest/`.
- The current source already deliberately avoids inventing schedule times, price, persistence, or acceptance controls. It projects only `capabilities.features.private_lessons` into enabled/unavailable/pending copy and uses a non-interactive pending marker.
- The current source still declares `.c162-nav { height: 176rpx; }` while WXML independently injects `navInset`; the same confirmed top-bar geometry defect fixed in C16/C16.1 is present here.
- The user has pre-authorized continuous autonomous delivery and commits for this Figma restoration goal; no additional product decision is outstanding for this scoped correction.

## Requirements

1. Read the live Figma node before changing code and preserve the existing WXML/WXSS/component conventions.
2. Correct the confirmed navigation geometry to `88rpx + box-sizing: content-box` while preserving native `navInset`, back navigation, right capsule clearance, and role TabBar behavior.
3. Preserve the real private-lesson feature contract. Do not fabricate the Figma sample’s weekly times, toggle mutation, pricing, booking state, or storage/API responses. If runtime data is pending/unavailable, show an explicit truthful state.
4. Add/update the source regression assertion first, observe the old geometry fail, then make the smallest implementation change needed.
5. Obtain a route-confirmed real DevTools `PrintWindow` capture at exactly 375×812 and compare it to the online design. Distinguish geometry differences from the server-data/configuration difference.
6. Run the targeted test and one serial root gate, update progress/task records, stage only scoped files, commit, and push to `origin/dev`.

## Out of scope

- Adding private-lesson API/database fields or production writes.
- Making the sample toggle interactive without a server persistence contract.
- Inserting fake 17:00–20:00 slots, prices, coach names, or booking state.
- Modifying unrelated dirty worktree files or other coach pages.

## Acceptance criteria

- [x] Live Figma node `93:1238` is freshly read and its geometry recorded.
- [x] The source test is observed failing against the old `176rpx` navigation and passing after the minimal correction.
- [x] Real `private_lessons` feature state remains the only source for availability copy; no invented controls or data are added.
- [x] A route-confirmed DevTools `PrintWindow` capture is exactly 375×812; top-bar and page landmarks are compared to Figma, and sample-data differences are explicitly classified.
- [x] `npx --yes pnpm@10.33.0 run check` exits 0 serially and `git diff --check` passes.
- [x] Only scoped files are committed and pushed; unrelated worktree paths remain uncommitted.

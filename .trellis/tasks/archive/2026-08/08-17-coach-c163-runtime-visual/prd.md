# Coach C16.3 account runtime visual verification

## Goal

Align the coach account page with online Figma node `93:1262` in the real DevTools 375×812 simulator without inventing sensitive account, phone, binding, password, device, or cache data. Deliver any confirmed visual correction independently.

## Confirmed facts

- Figma authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`. The reference uses a centered “账号设置” title in an 88px pink navigation bar and a right-side 24px balancing placeholder.
- Route: `pages/coach/account/index`. It uses the authenticated session name plus a single 30-day `getCoachHome()` request to show the actual coach’s teams.
- The current WXML and WXSS have the same verified header defects as C16.2: `176rpx` navigation content height, left-aligned title, no balancing right placeholder, and insufficient Figma 100px right capsule clearance.
- The current page intentionally omits interactive edit/phone/password/device/cache actions and sensitive account values, because these capabilities do not have confirmed service contracts. Its read-only data labels must remain truthful.
- The user has pre-authorized autonomous task execution and commits for the visual restoration goal.

## Requirements

1. Preserve real session display name/team data and the current stale-request guard; no account API or persistence behavior may be changed.
2. Correct only confirmed header geometry: 88rpx content height, existing content-box/native inset behavior, title centering, matching right placeholder, and 200rpx capsule-side clearance.
3. Do not fabricate Figma sample name, team, masked phone, binding, certification, edit, password, device, or cache controls. Keep every current row read-only and preserve its honest unavailable/pending wording.
4. Test first: change the geometry/structure assertion, observe the current source fail, then apply the minimal WXML/WXSS correction.
5. Capture a route-confirmed strict 375×812 DevTools `PrintWindow` image and classify live account-content differences separately from visual geometry.
6. Run targeted test plus one serial root gate, update records, commit only scoped paths, and push.

## Out of scope

- Backend contract/production data changes or any account mutation.
- Editing user profile data, re-binding WeChat, clearing cache, or adding password/device flows.
- Unrelated dirty worktree files and other pages.

## Acceptance criteria

- [x] Figma node `93:1262` is freshly read and used as the geometry reference.
- [x] The new account-header test fails on the current 176rpx/left-aligned source and passes after the minimal fix.
- [x] Session/team data flow and non-interactive account safety boundary remain unchanged.
- [x] A route-confirmed `PrintWindow` image is exactly 375×812, with header/body geometry compared to Figma and account sample content classified accurately.
- [x] One serial root check exits 0 and `git diff --check` passes.
- [x] Scoped work is committed/pushed without staging unrelated dirty files.

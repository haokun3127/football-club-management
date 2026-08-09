# Align login states to Figma

## Goal

Bring the four current login and account-binding states into alignment with the online Figma source while retaining the production WeChat authentication and parent-binding contract.

## Design source

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:2 / G1 Launch`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:56 / G3 Login Blocked`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:550 / P10 Account Binding`

## Requirements

- Preserve the actual launch flow: resolve client, obtain a real `wx.login` code, and enter the login route.
- Preserve the actual login flow: `getPhoneNumber` must receive a real WeChat phone authorization code and must not fabricate a phone number, session, role, profile, child, or API result.
- Preserve current duplicate-callback protection, timeout and retry behaviour for phone authorization.
- Treat `binding_required`, missing role/session/profile, and a parent with no children as the genuine blocked state; the return action must re-launch the real launch page.
- P10 must continue to read the real parent-children API and persist only the selected child ID locally. It must not promise an unimplemented unbind/add-family operation.
- Match page-owned layout, hierarchy, spacing, typography, colours and current shared tab/navigation patterns as closely as the WeChat Mini Program runtime permits.
- WXML must not call JavaScript collection or string methods. Derived display fields belong in TypeScript view models.
- Do not modify API/persistence files, `project.config.json`, zero-reference SVGs, root WPS files, or other existing dirty work.

## Acceptance criteria

- [x] G1 has the Figma launch hierarchy (club identity, three service rows and state chips) without changing its real bootstrap branch decisions.
- [x] G2 has the Figma verification hierarchy, 88px navigation envelope, 48px information fields and 50px centered native phone-authorisation control.
- [x] G3 has the Figma restricted account card and a working return-to-launch action driven by real rejected login data.
- [x] P10 uses real `getParentChildren()` values for the active learner and keeps child switching/navigation working while matching the Figma card layout and parent tab state. Where no family-member API exists, it truthfully shows an unavailable state rather than a Figma sample identity.
- [x] Focused tests were observed failing for the changed presentation/behaviour contracts; focused tests, Mini Program typecheck, Mini Program package tests, root check and `git diff --check` pass afterwards.

## Out of scope

- True-device/DevTools screenshot evidence is intentionally not a completion gate for this user-approved full-Figma goal.
- No backend, persistence, real-account provisioning, unbind API, or family-member-management implementation is included in this batch.

## Validation record

- RED: 16 focused assertions ran with 3 expected failures: G2 retained the old 256rpx form-card height; P10 had no TypeScript `teamLabel`; and the P10 template still indexed the child teams collection and presented a fictional family-member section.
- GREEN: the focused assertions passed 16/16; Mini Program package tests passed 61/61; Mini Program typecheck passed; `git diff --check` passed.
- Full repository gate: `npx.cmd --yes pnpm@10.33.0 run check` passed with domain 18/18, Mini Program 61/61, and API 68/68 tests.
- This task deliberately does not claim a true-device or DevTools pixel-comparison result because the user removed that completion gate for the full-Figma objective.

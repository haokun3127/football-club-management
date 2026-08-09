# PRD: C16.3 Coach Account Figma Alignment

## Goal

Align the coach account page with the current online design source: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`, while showing only facts supported by the current mini-program contracts.

## Requirements

- Modify only the coach account page, its focused test, the direct Figma back icon, and this task's Trellis records.
- Keep the existing `role-tabbar`; account-page-owned interaction is limited to the back action.
- Require the real `coach` session. Use only `session.displayName` for the name; when it is absent, show `姓名待同步` without a fallback name.
- Make one `getCoachHome` request for the frozen local-date range `today - 29` through `today`. Render only returned team names. Empty teams use an honest empty state; a current request failure keeps the profile visible and marks team information as pending sync.
- Do not use `home.coachName`, phone, phone binding, account, password, device, or WeChat binding data because this page has no supporting contract. Those rows are read-only pending/unavailable states.
- Do not add storage access, logout, edit actions, API writes, fabricated sample facts, or raw upstream error text.

## Acceptance Criteria

- [x] Page data uses the coach session display name only and makes no coach-home request for a non-coach.
- [x] The coach-home request is called once with a frozen 30-day local range; real teams, empty teams, failure, and stale success/failure all have safe states.
- [x] Account rows are read-only, contain no fabricated phone/binding/security/device facts, and only the local back action is interactive; the existing role tab bar remains unchanged.
- [x] The page has the local 176rpx Figma top bar and uses the exported C16.3 back asset.
- [x] Focused test, mini-program typecheck, package test, task validation, and `git diff --check` are run. No screenshot result is claimed.

## Out of Scope

- API, session/auth helpers, storage, account management, phone/WeChat binding, password/device management, role tab bar, backend, Figma writes, deployment, and unrelated working-tree changes.

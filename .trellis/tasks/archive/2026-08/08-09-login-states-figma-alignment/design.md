# Technical design: login states

## Scope boundary

The batch owns only the Mini Program visual layer for `pages/launch`, `pages/login`, and `pages/parent/binding`, plus their focused tests. Existing shared navigation, `role-tabbar`, real API clients and auth helpers remain their sources of truth.

## Data and state contract

1. Launch resolves client context, honours an existing real session, obtains a real WeChat login code, then re-launches Login.
2. Login accepts only the WeChat `getPhoneNumber` callback code. It calls `wechatLogin(wxLoginCode, phoneCode)` once and routes only after an `authenticated` response with session, role and profile.
3. Any `binding_required` or incomplete authenticated payload is presented as G3. It is an access result, not a constructed role or account.
4. P10 reads learner cards from `getParentChildren()`. Its active learner is derived from the returned list plus the stored selected ID; family and WeChat rows are informational until their real APIs exist.

## Implementation shape

- Keep the existing WXML and WXSS page architecture. Convert visual measurements from the Figma 375px canvas to the project’s `rpx` conventions.
- Reuse existing icon assets only where they faithfully represent the Figma symbols. Do not introduce encoded image payloads or hand-drawn substitute icons.
- Keep the native `button open-type="getPhoneNumber"`; style its internal text by the existing button layout rather than replacing it with a fake interaction.
- Use explicit TypeScript display fields for anything that would otherwise require WXML expressions beyond property access and conditionals.

## Risks and rollback

- Native WeChat authorization controls have platform-owned behaviour; presentation changes must not change `open-type`, event bindings, disabled state or duplicate-callback guards.
- The Figma P10 example contains sample phone/relationship copy. The implementation must retain truthful generic or API-backed copy instead.
- Rollback is file-scoped: revert only the B1 commit, leaving unrelated dirty API and configuration work untouched.

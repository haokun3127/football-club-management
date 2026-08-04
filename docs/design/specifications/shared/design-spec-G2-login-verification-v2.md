# G2 Login Verification v2

> Current design source after 2026-08-04: `zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`, under page `zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`. Geometry retained from before the source switch is historical and is not a new implementation basis.

> Change request: replace the previous parent-only G2 binding interaction with a role-neutral pre-auth verification screen. The server resolves `parent` or `coach` only after WeChat phone authorization.

## Frame

- Device: `375x812`
- Background: `#f6f7f9`
- Outer horizontal padding: `22px`
- Content width: `331px`
- Top navigation envelope: `88px` total device-frame height, `box-sizing: border-box`
- Navigation title: `身份验证`, 17px, bold, centered

## Hierarchy and geometry

- `hero-card`: `331x174px`, radius `16px`, starts after the navigation section with `24px` vertical spacing
  - badge: `48x48px`, radius `12px`, brand red `#a80f1b`
  - title: `连接重庆天才服务`, 18px bold
  - subtitle: `验证微信手机号，自动匹配俱乐部身份`, 13px regular
- `form-card`: `331x144px`, radius `12px`, 16px padding, 16px vertical gap
  - `phone-status`: `299x48px`, radius `8px`, background `#f8f9fa`
    - label: `微信手机号`
    - separator: `1x16px`, `#e7eaf0`
    - value: `授权后自动读取`
  - `identity-status`: `299x48px`, radius `8px`, background `#f8f9fa`
    - label: `身份匹配`
    - value: `自动匹配俱乐部档案`
- `primary-cta`: `331x50px`, radius `12px`, brand red `#a80f1b`
  - label: `微信手机号授权并继续`, 16px bold, white
  - This is the only interactive `getPhoneNumber` action on the page.
- `privacy`: `331x25px`, centered, 11px regular
  - `同意《用户协议》和《隐私政策》`

## Interaction contract

- Do not render `验证码` or `获取验证码`; no SMS API exists for this flow.
- Do not render a second clickable or button-like `微信手机号授权` row.
- Before authorization, do not render parent-only `绑定孩子` copy.
- After authorization, route by the server result:
  - `parent`: parent schedule and child-binding flow.
  - `coach`: coach schedule.
- Blocked/no-profile states remain separate from the normal verification frame.

## Figma editing checklist

1. Rename the root frame from `G2 Login Binding` to `G2 Login Verification`.
2. Replace the nav text `绑定孩子` with `身份验证`.
3. Replace the hero subtitle with `验证微信手机号，自动匹配俱乐部身份`.
4. Remove the former code row and the former inline `微信一键登录` control.
5. Keep only the two status rows described above.
6. Rename the CTA to `微信手机号授权并继续` and attach the WeChat phone authorization interaction to this CTA only.
7. Add an annotation that role resolution is server-side after authorization.

## 2026-08-02 handoff update

The previous implementation session confirmed that the supplied screenshot was the current `/pages/login/index` and that the old page mixed the parent-only `绑定孩子` flow with a duplicate WeChat authorization action. The implementation now keeps one real `open-type="getPhoneNumber"` CTA, removes the SMS-code pseudo-flow, uses role-neutral copy before authorization, and routes by the server-returned role after authorization.

At the August 2 handoff, the Figma visual batches and login changes were uncommitted on branch `codex/chongqing-talent-business`. The login work is now recorded in commit `eab8206`; related parent-page work is in `81e4273`. The current design source is `zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`; the old `ATlfBRO0ruOCDDY5ICagFD / 93:29` reference is pre-switch historical audit material only, and the local `.fig` is only a historical offline backup. Any earlier statement that treats the old file as current is superseded. Online Figma writes and screenshots must still be claimed only when their node-level evidence is actually recorded.

The former `verification-card` value `331x128px` is a pre-switch historical value. The current form-card contract is `331x144px`; do not use the former value for new implementation or visual acceptance.

### Verification state

- Mini-program TypeScript typecheck and test suite: passed on August 3, 2026 (`7` files / `59` tests); static verification does not replace the G2 visual check.
- Login page static test: covers one phone-authorization action, no SMS-code copy, no pre-auth parent/coach copy, and G2 dimensions.
- Full repository check/test: currently blocked by two API fixture failures, not by the login page. `apps/api/test/server.test.ts:688` expects `not_started` but receives `in_progress`; `apps/api/test/server.test.ts:1344` expects a specific data-capability preview record set but receives a larger/different record set. The exact fixture drift must be resolved or explicitly quarantined before claiming a green full check.
- WeChat DevTools `375x812` screenshot comparison: still pending. Previous desktop capture attempts were black/unreliable and are not acceptance evidence.

### Acceptance gate

Do not mark G2 visually complete until a trusted WeChat DevTools or real-device `375x812` screenshot confirms the top navigation envelope, hero/card stack, single CTA, and privacy line against this specification. Do not add a role selector or a fake SMS verification flow; the backend remains the source of truth for `parent` versus `coach`.

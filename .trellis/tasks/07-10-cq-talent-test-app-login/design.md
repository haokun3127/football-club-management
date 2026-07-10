# Technical Design

## Environment

- `getAccountInfoSync().miniProgram.envVersion` selects develop/trial/release.
- develop uses local API and optional dev identity; trial/release require configured HTTPS URLs and disable dev role switching.

## Login

- Launch resolves client and routes valid sessions; otherwise calls wx.login and navigates to login binding.
- Login page receives/stores wx code, requests phone authorization, calls wechat-login, and persists session with expiresAt.
- Backend `WechatIdentityConnector` resolves wx code/phone code when configured. Missing connector produces binding_required and never consumes roleHint as authority.

## Session

- Request wrapper checks expiry before sending and handles HTTP 401 by clearing session and re-launching login.
- Login response profile supplies userId/displayName; parent must have at least one child.

## Compatibility

- Header membership dev tests remain supported only in develop mode.
- Existing login endpoint and request fields remain unchanged.

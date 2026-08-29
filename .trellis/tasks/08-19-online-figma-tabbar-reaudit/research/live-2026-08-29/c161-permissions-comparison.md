# C16.1 Permission Scope — live Figma comparison

Date: 2026-08-29

## Sources

- Figma file key: `zZ6wKyOHKcO4UYXDd9jGwv`
- Figma node: `93:1210` (`C16.1 Permission Scope`)
- Figma screenshot: `c161-online.png`
- Runtime route: `/pages/coach/permissions/index`
- Runtime screenshot: `c161-runtime-final.png`
- Runtime sidecar: `c161-runtime-final.png.json`

## Evidence levels

1. Online design read: **complete**. `get_design_context` and `get_screenshot` read node `93:1210` from the current online file. The Figma render is `375×812`.
2. Runtime capture: **complete**. WeChatIDE MCP opened the exact coach route and the project capture pipeline produced a route-verified `375×812` PNG. The sidecar records logical viewport `375×812` and `devicePixelRatio=3`.
3. Visual comparison: **complete**. The online render and runtime capture were inspected side by side.

## Comparison

- Top navigation: pass. Back arrow, title, pink bar, title alignment, and vertical placement match the current board. Platform status bar and WeChat capsule are simulator chrome.
- Explanation card: pass. White card, blue information badge, copy, padding, radius, and text wrapping match the Figma structure.
- Permission list: pass. Five rows, row heights, separators, labels, switch geometry, and card radius match. The runtime's enabled/disabled states reflect the authenticated session's real capability contract.
- Save action: pass. Red full-width pill, centered label, height, and radius match the online board. The current page presents it as non-interactive because this screen is a read-only availability view.
- Coach TabBar: pass. Three items, selected “我的” state, active dot, icon/label spacing, and bottom safe area match.

## Explicit exemptions

- Figma shows sample permission states; runtime states are derived from the current server-confirmed coach capabilities. The runtime must not rewrite real permissions to match sample switches.
- Simulator status bar, WeChat capsule, and home indicator are platform-owned and excluded from the content comparison.

## Verification

- Focused Vitest: `index.test.mjs` — 4/4 passed.
- Mini-program TypeScript: `tsc --noEmit -p apps/miniprogram-cq-talent/tsconfig.json` — passed.
- Simulator console filter (`error|exception|fail|undefined|route is not defined|wx:else|appid missing`) — no matches.
- No business code, API, production data, or Figma content was changed for C16.1.

## Verdict

**Pass — real permission-state and platform-chrome exemptions recorded.**

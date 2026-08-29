# C16.2 Private Interest — live Figma comparison

Date: 2026-08-29

## Sources

- Figma file key: `zZ6wKyOHKcO4UYXDd9jGwv`
- Figma node: `93:1238` (`C16.2 Private Interest`)
- Figma screenshot: `c162-online.png`
- Runtime route: `/pages/coach/private-interest/index`
- Runtime screenshot: `c162-runtime-final.png`
- Runtime sidecar: `c162-runtime-final.png.json`

## Evidence levels

1. Online design read: **complete**. `get_design_context` and `get_screenshot` read node `93:1238` from the current online file. The Figma render is `375×812`.
2. Runtime capture: **complete**. WeChatIDE MCP opened the exact coach route and the project capture pipeline produced a route-verified `375×812` PNG. The sidecar records logical viewport `375×812` and `devicePixelRatio=3`.
3. Visual comparison: **complete**. The online render and runtime capture were inspected side by side.

## Comparison

- Top navigation: pass. Pink top bar, back arrow, title, spacing, and platform-safe placement match the board.
- Interest information card: pass. White card, title, supporting copy, padding, radius, and shadow match.
- Booking toggle row: pass. Label, switch geometry, card treatment, and vertical spacing match.
- Availability grid: pass. Section title, seven weekday columns, four time rows, cell spacing, color states, typography, card radius, and settlement note match the online structure.
- Coach TabBar: pass. Three items, selected “我的” state, active dot, icon/label placement, and bottom safe area match.

## Explicit exemptions

- The runtime uses the current persisted interest/timeslot state. Cell enabled/disabled states may differ from the Figma sample, which is illustrative content rather than a permission to fabricate state.
- Simulator status bar, WeChat capsule, and home indicator are platform-owned and excluded from content comparison.

## Verification

- Focused Vitest: `index.test.mjs` — 7/7 passed.
- Mini-program TypeScript: `tsc --noEmit -p apps/miniprogram-cq-talent/tsconfig.json` — passed.
- Simulator console filter (`error|exception|fail|undefined|route is not defined|wx:else|appid missing`) — no matches.
- No business code, API, production data, or Figma content was changed for C16.2.

## Verdict

**Pass — real availability-state and platform-chrome exemptions recorded.**

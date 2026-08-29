# C16 Coach Me — live Figma comparison

Date: 2026-08-29

## Sources

- Figma file key: `zZ6wKyOHKcO4UYXDd9jGwv`
- Figma node: `93:1182` (`C16 Coach Me`)
- Figma screenshot: `c16-online.png`
- Runtime route: `/pages/coach/me/index`
- Runtime screenshot: `c16-runtime-final.png`
- Runtime sidecar: `c16-runtime-final.png.json`

## Evidence levels

1. Online design read: **complete**. `get_design_context` and `get_screenshot` read node `93:1182` from the current online file. The Figma render is `375×812`.
2. Runtime capture: **complete**. WeChatIDE MCP opened the exact coach route and the project capture pipeline produced a route-verified `375×812` PNG. The sidecar records logical viewport `375×812` and `devicePixelRatio=3`.
3. Visual comparison: **complete**. The online render and runtime capture were inspected side by side.

## Comparison

- Top bar: pass. “我的” and the settings icon align with the online layout. Simulator status bar and WeChat capsule are platform chrome.
- Coach profile Hero: pass. Dark card, red avatar, identity block, role badge, team line, three statistic columns, spacing, radius, and hierarchy match the online board.
- Dual-role entry: pass. The current-identity label, coach role, pink switch action, card geometry, and placement match the `role=coach` Figma component. It is rendered only when the server session reports both roles.
- Menu: pass. The four rows, existing SVG icons, labels, separators/spacing, right chevrons, and white card treatment match the Figma structure.
- Logout action: pass. Full-width outlined red pill, centered label, height and radius match.
- Coach TabBar: pass. Three items, selected “我的” state, active red dot, icon/label placement, and bottom safe area match the online board.

## Explicit exemptions

- The online board contains sample identity and summary labels (`林教练`, `凤凰山U10精英队`, `本赛季执教`, `在队学员`, `平均出勤`, and sample values). The runtime uses the authenticated coach identity and API-derived labels/values (`演示测试账号第1组`, actual team, and recent-period statistics); sample data is not hardcoded.
- The simulator status bar, WeChat capsule, and home indicator are platform-owned and are excluded from the Figma content comparison.

## Verification

- Focused Vitest: `index.test.mjs` — 9/9 passed.
- Mini-program TypeScript: `tsc --noEmit -p apps/miniprogram-cq-talent/tsconfig.json` — passed.
- Simulator console filter (`error|exception|fail|undefined|route is not defined|wx:else|appid missing`) — no matches.
- No business code, API, production data, or Figma content was changed for C16.

## Verdict

**Pass — real-data and platform-chrome exemptions recorded.**

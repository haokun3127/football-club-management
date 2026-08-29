# C16.3 Coach Account — live Figma comparison (2026-08-29)

## Evidence

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Online node: `93:1262` (`C16.3 Coach Account`)
- Design context: fresh `mcp__figma__get_design_context` read on 2026-08-29
- Design screenshot: `c163-online.png` (native `375×812`)
- Runtime route: `/pages/coach/account/index`
- Runtime screenshot: `c163-runtime-normalized.png`
- Runtime sidecar: `c163-runtime-normalized.png.json`
- Runtime comparison: `c163-sidebyside.png`
- Capture method: WeChatIDE MCP `simulator_open_page` + route verification + `simulator_screenshot`, normalized from raw `564×1220` to logical `375×812`

## Comparison

### Page shell

- The soft-pink top navigation, left back control, `账号设置` title, and right-side WeChat capsule clearance are structurally aligned with the live board. The status bar and WeChat capsule are platform-owned runtime chrome and are not treated as page defects.
- The content starts at the same logical landmark as the Figma board. Profile card, settings groups, row separators, card radii, spacing, right chevrons, and the fixed coach TabBar all remain aligned at the normalized viewport.
- The coach TabBar keeps the Figma order (`日程` / `训练管理` / `我的`), inactive gray treatment, active red treatment, and active dot. Its bottom safe-area rendering is visible and unobscured.

### Data and platform differences

- The runtime profile uses the authenticated session display name and real coach-home team response (`演示测试账号第1组`, `重庆天才演示球队第1组、U10发展队`). The Figma sample (`林教练`, `U10精英队 · 主教练`) is static design content and was not copied into code.
- Phone, WeChat binding, and certification/action values remain truthful unavailable or pending states because no confirmed account-detail contract exists. The Figma sample values (`138****6789`, `已绑定`, `已认证`) are not fabricated.
- Runtime status bar, iPhone safe area, and WeChat menu capsule are platform-owned differences.

## Console and disposition

- Console filter `error|exception|fail|undefined|route is not defined|wx:else|appid missing`: no matches.
- Online Figma read: **pass**.
- Route-verified runtime capture: **pass**, strict normalized `375×812`.
- Visual comparison: **pass with authenticated-data/platform exemptions**.
- Code/Figma repair: **not warranted**; no business-code or Figma change was made for C16.3 in this comparison.

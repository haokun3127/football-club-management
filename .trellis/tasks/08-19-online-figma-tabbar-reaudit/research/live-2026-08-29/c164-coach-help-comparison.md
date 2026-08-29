# C16.4 Coach Help — live Figma comparison (2026-08-29)

## Evidence

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Online node: `93:1286` (`C16.4 Coach Help`)
- Design context: fresh `mcp__figma__get_design_context` read on 2026-08-29
- Design screenshot: `c164-online.png` (native `375×924`; the board is taller than one viewport)
- Runtime route: `/pages/coach/help/index`
- Runtime first viewport: `c164-runtime-first.png` with sidecar `c164-runtime-first.png.json`
- Runtime bottom viewport: `c164-runtime-bottom.png` (captured after real `pageScrollTo` with `scrollTop=360`)
- Raw bottom capture: `c164-runtime-bottom-raw.png`
- Capture method: WeChatIDE MCP route navigation, runtime route verification, simulator screenshot, and strict `375×812` normalization

## Comparison

### Shared page shell

- The soft-pink top navigation, back arrow, `帮助中心` title, right WeChat capsule clearance, search bar, two-column category grid, FAQ card, support card, and fixed coach TabBar follow the live board's structure and spacing.
- The first viewport shows the same content hierarchy through the FAQ list. The bottom viewport confirms the remaining FAQ rows, support card, and fixed TabBar remain reachable and are not hidden behind the bottom shell.
- The coach TabBar keeps the live-board order (`日程` / `训练管理` / `我的`), inactive gray treatment, active red `我的` state, active dot, and bottom safe-area behavior.

### Real-content differences and exemptions

- The category labels and icons are derived from the authenticated `getContentFaqs()` response. Runtime categories (`全部`, `出勤说明`, `训练规则`, `成长报告`, `账号设置`, `联系客服`) differ from the board's static sample topics; the page intentionally does not hard-code Figma sample topics.
- Runtime FAQ questions are real returned content and differ from the board's static questions. Local search, category filtering, and FAQ expansion remain available without additional writes or fabricated data.
- The board includes configured support hours, online consultation, and a public-account action. The confirmed product contract does not provide these values or an action, so the runtime keeps the explicit `支持方式待配置` state.
- The simulator's status bar, iPhone safe area, and WeChat menu capsule are platform-owned UI differences.

## Console and disposition

- Runtime route verification: **pass** (`/pages/coach/help/index`).
- Console filter `error|exception|fail|undefined|route is not defined|wx:else|appid missing`: no matches.
- Online Figma read: **pass**.
- Runtime capture: **pass**, both first and bottom evidence images are normalized to `375×812`.
- Visual comparison: **pass with real-content/platform/support-contract exemptions**.
- Code/Figma repair: **not warranted**; no business-code or Figma change was made for C16.4 in this comparison.

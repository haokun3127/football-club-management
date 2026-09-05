# C16.3 / C16.4 live Figma comparison — 2026-08-31

## Authority and evidence

| Page | Online Figma node | Route | Runtime evidence | Result |
| --- | --- | --- | --- | --- |
| C16.3 Coach Account | `zZ6wKyOHKcO4UYXDd9jGwv / 93:1262` | `/pages/coach/account/index` | `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788189953910-16540738505821.png` plus JSON sidecar | repaired and recaptured; old cached session has explicit fallback |
| C16.4 Coach Help | `zZ6wKyOHKcO4UYXDd9jGwv / 93:1286` | `/pages/coach/help/index` | `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788190012676-13068933934157.png` plus JSON sidecar; `%TEMP%\cq-talent-visual-evidence\c164-bottom-6b0f98fbffea4917bbd84fbaa471930e.png` | repaired and recaptured |

All images were captured through WeChatIDE MCP, with the normal app-capture script for the route-verified top frames. The C16.4 bottom frame used the same MCP bridge's `automation_wx_api pageScrollTo` followed by `simulator_screenshot`; both generated files are in the system temporary evidence directory, not the workspace or desktop.

## C16.3

- Before repair, `LoginResult.profile.phone` and `LoginResult.phoneBinding` existed at authentication time but were discarded before durable session storage. The account page could not show its own data after navigation/restart.
- After repair, the session persists both optional values. The view model renders only the current session's masked phone and a binding state derived from the server result.
- The visible runtime session pre-dates this schema extension, so it correctly remains on `当前会话未提供 / 状态待同步`; no session was fabricated to force the sample state.
- The profile certification badge, exported `circle-x` SVG, spacing, cards, nav and TabBar visually align with `93:1262`.

## C16.4

- Before repair, the quick-start grid was generated from dynamic server categories and included an extra `全部` card. Its labels varied with parent content and structurally diverged from the six-card online design.
- After repair, the fixed Figma topics select/filter real fetched FAQ records. Search, accordion expansion, errors, and stale-response protection retain their API-backed behavior.
- The first viewport verifies nav/search/grid/FAQ alignment. The bottom MCP frame verifies the complete FAQ list, support card and unoccluded TabBar.
- FAQ question text and count are real API data, not Figma examples; that is the only declared data difference.

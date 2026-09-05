# C8.1 team selector runtime evidence — 2026-09-01

## Evidence

- Online Figma: `zZ6wKyOHKcO4UYXDd9jGwv / 1610:1950`
- Runtime route: `/pages/coach/team-selector/index`
- Figma export: `C:\Users\ASUS\AppData\Local\Temp\c8-1-figma-1610-1950.png`
- WeChat DevTools MCP screenshot: `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788286831906-uehf00.png`
- Both captures are `375×812`; the Figma export is the design canvas and the runtime capture includes the real iPhone safe-area/system shell.

## Comparison

- Full-screen white top bar, circular back affordance, title, “我的球队” section, assigned-team cards, selected red outline/check state, and backend-maintenance footer are present in both.
- The real API response contains one assigned option, `U10精英队` (`2026-2027赛季`); the Figma sample shows three options and sample student counts. The runtime keeps the real permission scope and does not invent additional teams or counts.
- The runtime selected-card metadata uses the truthful API-backed label `当前选择 · 后台已分配`; no code-side sample season/member count was added.
- No team create/edit/delete action is exposed. Selecting a real option writes only the existing local training-team context key and returns to training management.

## Result

Structural and interaction evidence is sufficient for C8.1 under the real one-team account. The sample-density difference is an API/permission difference, not a visual defect. No code change was required in this pass.

# V3 双端页面重组与改版 — 实施计划

1. [x] 读取现有 Parent/Coach Figma 树与已验证 V3 画板，建立两个新增 current-product 页面和各自总览（Parent `1462:2` / `1464:2`；Coach `1462:3` / `1464:303`）。
2. [x] 将 P1 三态迁入 Parent V3，建立 P4/P5/P8/P7 的当前画板位置与路由映射；P1 新节点为 `1465:546`／`1465:719`／`1465:1010`，均已截图回读。P4/P5/P8/P7 当前来源副本为 `1467:185`／`1467:315`／`1467:435`／`1467:527`，均已截图回读并只在新副本修正为“日程 / 成长 / 发现 / 我的孩子”；它们仍待逐页 V3 审查。
3. [x] 将 C1/C8/C8.1 迁入 Coach V3，建立 C2/C4/C6/C7/C14/C16 的当前画板位置与路由映射；C1/C8/C8.1 新节点为 `1465:7`／`1465:146`／`1465:253`，均已截图回读。C2/C6/C16 当前来源副本为 `1467:726`／`1467:784`／`1467:868`；C4 `1536:7`、C7 `1544:7`、C14 `1546:7` 已各自完成运行态 V3 对照。
4. [ ] 为每个尚未改版的画板读取现有在线稿和代码，按主演示链做非破坏性 V3 改版；不跨页面整批修改小程序。
5. [ ] 每一页按“Figma → 最小代码修改 → 定向测试/TypeScript → WeChatIDE MCP 375×812 截图 → 文档 → 路径限定提交”的循环收口。
6. [ ] 最后更新 Figma 映射、进度与任务证据，并以路径限定提交页面整理文档；不将其他工作区脏改动一并提交。

## Page evidence

### P4 Growth (2026-09-01)

- Current V3 node: `1467:185`; status in Parent index: `已对照运行态`.
- Figma change: add the real product `Match Record Card` between Milestones and Training History; keep the card flow vertical and clip only the content viewport so the fixed 70px TabBar remains visible.
- Runtime evidence: `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788198699162-3351236472724.png` plus sidecar. Capture method is `wechatide-mcp simulator_screenshot`, normalized to `375×812` by the repository script.
- Result: structure matches; student identity, count, rates and milestone states are API data differences. No P4 production-code change in this iteration.

### P5 / P8 / P7 Parent navigation (2026-09-01)

- P5 `1467:315` ↔ `/pages/parent/radar/index` ↔ `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788226370158-27192973527160.png`.
- P8 `1467:435` ↔ `/pages/parent/content/index` ↔ `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788226441390-2020476034700.png`.
- P7 `1467:527` ↔ `/pages/parent/child/index` ↔ `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788226506714-12780251307313.png`.
- All three are WeChatIDE MCP 375×812 evidence with sidecars. Their Title/CTA/Card/TabBar structures match; content, child scope, counts and metric labels are real API data differences. No production-code change in this batch.

### Coach C2 / C4 / C6 / C7 (2026-09-01)

- C2 current V3 node: `1467:726` (`/pages/coach/event/index?id=<activityId>`). Runtime evidence: `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788226827101-20856360996419.png`; Figma review export: `%TEMP%\cq-talent-figma-v3-pages-20260901\c2-training-workbench-v3-runtime-reviewed-v2.png`. The V3 first viewport uses the real 19-player density and direct avatar attendance interaction; roster identity/count are API data, not a hard-coded code contract.
- C4 current V3 node: `1536:7` (`/pages/coach/attendance/index?id=<activityId>`). Runtime evidence: `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788227984063-19760321404689.png`; final Figma export: `%TEMP%\cq-talent-figma-v3-pages-20260901\c4-attendance-v3-runtime-reviewed.png`. The implementation now maps any legacy status to the binary arrived/absent UI, displays a 4-column avatar grid with TS-precomputed max-four-character names, preserves real participant IDs/notes for the save API, and keeps the full-screen submit result route.
- C4 verification: `pages/coach/attendance/index.test.mjs` 9/9 passed; `tsc --noEmit` passed; WeChatIDE MCP `compile_wxml` and `compile_wxss` passed. The final runtime screenshot was taken only after the IDE loaded the new bundle.
- C6 current V3 node: `1467:784` (`/pages/coach/match/index?id=<activityId>`). Runtime evidence: `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788227834971-33732555362546.png`; Figma review export: `%TEMP%\cq-talent-figma-v3-pages-20260901\c6-match-record-v3-runtime-reviewed.png`. The V3 board now matches the real pending-score state and goal/assist event density; no unrelated C6 production-code change was needed in this pass.
- C7 current V3 node: `1544:7` (`/pages/coach/tactical-board/index?eventId=<activityId>`), cloned non-destructively from the verified client revision `1040:9`. Runtime evidence: `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788228261553-6596713723697.png`. Full-pitch layout, lower player roster, reset/save actions, and data-driven shirt-number differences were compared; the old design and code boards remain unchanged.

### Coach C14 Ability Assessment (2026-09-01)

- Current V3 node: `1546:7` (`/pages/coach/team-ability/index`); Figma export: `%TEMP%\cq-talent-figma-v3-pages-20260901\c14-ability-assessment-v3-runtime-reviewed.png`.
- Information architecture: C14 inherits the current training-team id from C8 (`coach-training-team-id`) but cannot select a team itself. It renders the selected team in a compact context card, an all-player four-column direct selector, and the selected player's real radar; the schedule stays all-team and has no selector.
- API contract: `GET /coach/team?teamId=<id>` and `GET /coach/team/ability-overview?teamId=<id>` now reject a team outside the coach's assigned scope with `403`. C14 reads the first endpoint for the selected team's real member roster and `/coach/students/:studentId/radar` for each selected player's real metrics.
- Verification: C14 targeted Vitest 5/5, API scoped endpoint test passed, both package TypeScript checks passed, and WeChat DevTools MCP compiled WXML/WXSS. The final full workspace gate passed: domain 21/21, mini-program 443/443, API 123/123. Runtime evidence: `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788245745779-2245660382334.png`; direct interaction evidence: `%TEMP%\cq-talent-visual-evidence\c14-player-selection-20260901.png` (the active player changed from 丁宁 to 方圆, with the radar and active avatar updated).

## Verification

- Figma: 每个新 page 和画板都以 MCP 读取、截图并回读 node id。
- Mini-program: 定向 Vitest、`apps/miniprogram-cq-talent` 的 `tsc --noEmit`、限定 `git diff --check`；只有真实 `375×812` MCP 图可作为视觉通过。
- Git: 仅 `git add -- <明确路径>`，不使用 `git add -A`、reset 或 checkout。

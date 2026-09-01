# V3 双端页面重组与改版 — 实施计划

1. [x] 读取现有 Parent/Coach Figma 树与已验证 V3 画板，建立两个新增 current-product 页面和各自总览（Parent `1462:2` / `1464:2`；Coach `1462:3` / `1464:303`）。
2. [x] 将 P1 三态迁入 Parent V3，建立 P4/P5/P8/P7 的当前画板位置与路由映射；P1 新节点为 `1465:546`／`1465:719`／`1465:1010`，均已截图回读。P4/P5/P8/P7 当前来源副本为 `1467:185`／`1467:315`／`1467:435`／`1467:527`，均已截图回读并只在新副本修正为“日程 / 成长 / 发现 / 我的孩子”；它们仍待逐页 V3 审查。
3. [x] 将 C1/C8/C8.1 迁入 Coach V3，建立 C2/C3/C4/C6/C7/C10/C14/C16 的当前画板位置与路由映射；C1/C8/C8.1 新节点为 `1465:7`／`1465:146`／`1465:253`，均已截图回读。C2/C6/C16 当前来源副本为 `1467:726`／`1467:784`／`1467:868`；C3 `1561:7`、C4 `1536:7`、C7 `1544:7`、C10 `1563:7`、C14 `1546:7`、C16 `1467:868` 已各自完成运行态 V3 对照。
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

### Coach C16 My profile (2026-09-01)

- Current V3 node: `1467:868` (`/pages/coach/me/index`), renamed `C16 · My · Current V3 · Runtime Reviewed`. The online design now uses the truthful labels `教练` and `近30天日程` rather than an unverified seniority title or a season-wide count.
- Data contract: C16 reads `/coach/home` for the explicit 30-day total and `/coach/team` (no team id) for the coach's default assigned team's member count and attendance rate. It only displays that team; team selection remains exclusive to C8 Training Management.
- Interaction: when parent entitlement exists, the profile keeps the explicit identity switch. Logout is a direct session clear and full-screen launch-route transition with no popup/modal.
- Verification: `pages/coach/me/index.test.mjs` 9/9 passed; `apps/miniprogram-cq-talent` `tsc --noEmit` passed; `git diff --check` for the two C16 files passed. The full workspace gate then passed: domain 21/21, mini-program 443/443, API 123/123. Runtime evidence: `%TEMP%\cq-talent-visual-evidence\wechatide-mcp-1788247215884-34748290184239.png` with sidecar, captured by `wechatide-mcp simulator_screenshot` at a true `375×812`. The rendered account showed real values `26 / 19 / 93%`, not Figma sample values.

### Coach C3 Activity change (2026-09-01)

- Current V3 node: `1561:7` (`/pages/coach/event-change/index?id=<activityId>`), cloned non-destructively from its still-preserved historical source `93:634` and renamed `C3 · Activity Change · Current V3 · Runtime Reviewed`.
- Runtime review: the current page has the full-screen back/save header, activity summary, change-reason chips, time and venue fields, optional note, parent-notification switch and coach tabbar. The screenshot is WeChatIDE MCP `automation_viewport_action` at exact `375×812`: `%TEMP%\wechatide-viewport-screenshot-1788247717383-m1q6gg.jpg`.
- Evidence boundary: source Figma is a 375px-wide scrollable 903px canvas, while the capture is the true first 812px device viewport. Event title/status, dates and empty-field state are real API/form-state differences. The canonical capture script successfully navigated and verified the route but the DevTools screenshot file was not created at its generated hidden temporary path; direct MCP viewport capture succeeded, so no production code or DevTools process was changed.

### Coach C10 Training content selection (2026-09-01)

- Current V3 node: `1563:7` (`/pages/coach/content-select/index?eventId=<activityId>`), non-destructively cloned from `93:952` and renamed `C10 · Training Content Select · Current V3 · Runtime Reviewed`.
- User-approved simplification: the V3 search hint is `搜索训练动作`; there is no “动作要点” search wording, “查看动作要点” action, circular selection icon, or detail drill-in. The real three-level structure remains: primary ability, secondary ability, tertiary group, then selectable training cards with dosage text.
- Runtime evidence: exact `375×812` WeChatIDE MCP viewport `%TEMP%\wechatide-viewport-screenshot-1788247959031-j5w294.jpg` shows the data-driven hierarchy, direct card selection, and fixed temporary-group save bar. The visible selected card and count are real event state rather than Figma sample values. No production-code change was required in this migration.

### Coach C11 Assessment task list (2026-09-01)

- Current V3 node: `1564:7` (`/pages/coach/test-tasks/index`), non-destructively cloned from preserved historical source `93:1002` and named `C11 · Assessment Tasks · Current V3 · Runtime Reviewed`.
- Runtime review: the task list keeps the full-screen navigation, task-state filters, real task cards/progress and coach TabBar. The shared topbar contract is now `height: 88rpx` with `box-sizing: content-box` and inline safe-area/menu insets; the legacy `176rpx` compensation was removed without changing the rendered first-viewport layout.
- Verification: C11 targeted Vitest `9/9`, `apps/miniprogram-cq-talent` TypeScript `tsc --noEmit`, and an exact `375×812` WeChatIDE MCP viewport capture `%TEMP%\wechatide-viewport-screenshot-1788248438586-u0siuk.jpg` all passed. Task dates, state labels and participant totals remain the real account data rather than Figma sample values.

### Coach C12 Assessment entry (2026-09-01)

- Current V3 node: `1565:7` (`/pages/coach/assessment-entry/index?eventId=<activityId>`), non-destructively cloned from preserved historical source `93:1030` and named `C12 · Assessment Entry · Current V3 · Pending Runtime Data`.
- Figma screenshot was read back at `375×894`; the page keeps the full-screen score-entry header, dark assessment summary, compact four-column student metric cards, fixed save bar and coach TabBar. The historical source is preserved.
- Runtime route was opened with the real secure activity. The API returned the truthful empty state “缺少评测模板参数，请从评测任务列表进入。” rather than a score form, so this page is not claimed as a runtime visual pass until a real assessment-task activity with a template is opened. No fake template, student score or API response was added.

### Coach C12.1 Assessment draft resume (2026-09-01)

- Current V3 node: `1566:7` (`/pages/coach/assessment-entry/index` with a valid local draft), non-destructively cloned from preserved historical source `93:1061` and named `C12.1 · Assessment Draft Resume · Current V3 · Runtime Pending`.
- The V3 state keeps the dimmed assessment shell, centered “评分已自动保存” recovery card, truthful continue/exit actions and coach TabBar. It is a page-local draft state, not a server submission result.
- The current production activity has no assessment template, so the exact modal state could not be opened through a real task in this session. C12.1 remains a design baseline pending a real task with a valid local draft; no fake draft was created.

### Coach C13 Student radar (2026-09-01)

- Current V3 node: `1567:7` (`/pages/coach/student-radar/index`), non-destructively cloned from preserved historical source `93:1080` and named `C13 · Student Radar · Current V3 · Runtime Reviewed`.
- Runtime review found a real-data density edge case: the account returned eight dimensions while the historical sample showed six, causing the top canvas label to approach the hero title. The page now applies a dense-radar class with extra hero height and `24rpx` plot headroom; six-dimension layouts remain unchanged.
- Verification: C13 targeted Vitest `11/11`, mini-program TypeScript passed, and the refreshed WeChatIDE MCP screenshot `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788254323282-8cjn90.jpg` is exact `375×812`. Figma node `1567:7` was screenshot-read after cloning. Student names, dimensions, scores and assessment period remain real API data.

### Coach C15 Assessment entry (2026-09-01)

- Current V3 node: `1568:7` (`/pages/coach/assessment-entry/index?templateId=<realTemplateId>&title=<realTitle>`), non-destructively cloned from preserved historical source `93:1132` and named `C15 · Assessment Entry · Current V3 · Runtime Reviewed`.
- Runtime review: the real `assessment-template-technical` currently exposes one writable “技术能力” group and five real students with empty scores; the page therefore renders one group chip and dashes. The Figma sample’s three group chips and sample scores are data/template-state differences, not a client permission to invent fields.
- WeChatIDE MCP exact runtime screenshot: `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788254598753-fk13ie.jpg` (`375×812`). The full-screen header, dynamic group chip, real student cards, progress tracks and fixed coach TabBar are present. Figma node `1568:7` was screenshot-read after cloning.

## Verification

- Figma: 每个新 page 和画板都以 MCP 读取、截图并回读 node id。
- Mini-program: 定向 Vitest、`apps/miniprogram-cq-talent` 的 `tsc --noEmit`、限定 `git diff --check`；只有真实 `375×812` MCP 图可作为视觉通过。
- Git: 仅 `git add -- <明确路径>`，不使用 `git add -A`、reset 或 checkout。

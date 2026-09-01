# V3 双端页面重组与改版 — 实施计划

1. [x] 读取现有 Parent/Coach Figma 树与已验证 V3 画板，建立两个新增 current-product 页面和各自总览（Parent `1462:2` / `1464:2`；Coach `1462:3` / `1464:303`）。
2. [x] 将 P1 三态迁入 Parent V3，建立 P4/P5/P8/P7 的当前画板位置与路由映射；P1 新节点为 `1465:546`／`1465:719`／`1465:1010`，均已截图回读。P4/P5/P8/P7 当前来源副本为 `1467:185`／`1467:315`／`1467:435`／`1467:527`，均已截图回读并只在新副本修正为“日程 / 成长 / 发现 / 我的孩子”；它们仍待逐页 V3 审查。
3. [x] 将 C1/C8/C8.1 迁入 Coach V3，建立 C2/C3/C4/C6/C7/C10/C14/C16 的当前画板位置与路由映射；C1/C8/C8.1 新节点为 `1465:7`／`1465:146`／`1465:253`，均已截图回读。C2/C6/C16 当前来源副本为 `1467:726`／`1467:784`／`1467:868`；C3 `1561:7`、C4 `1536:7`、C7 `1544:7`、C10 `1563:7`、C14 `1546:7`、C16 `1467:868` 已各自完成运行态 V3 对照。
4. [ ] 为每个尚未改版的画板读取现有在线稿和代码，按主演示链做非破坏性 V3 改版；不跨页面整批修改小程序。
5. [ ] 每一页按“Figma → 最小代码修改 → 定向测试/TypeScript → WeChatIDE MCP 375×812 截图 → 文档 → 路径限定提交”的循环收口。
6. [ ] 最后更新 Figma 映射、进度与任务证据，并以路径限定提交页面整理文档；不将其他工作区脏改动一并提交。

## V4 revision execution

7. [x] 在唯一在线文件中新增 `12 Product Redesign · Parent V4` 与 `13 Product Redesign · Coach V4` 两个 Page；旧页面和 V3 不改不删。
8. [x] 将已审查的 Parent/Coach V3 画板按产品流程克隆到 V4 页面；Coach 明确 C1 全队日程与 C8/C8.1 训练管理选队边界。
9. [x] 用 Figma MCP 读取新页面总览和首批画板，回读节点 ID，并更新 `figma-source-of-truth.md` 与 `progress.md`。
10. [ ] 只有 V4 页面结构确认后，才进入对应小程序页面的逐页同步；每批仍执行真实数据、最小测试、限定路径提交和截图证据闭环。

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

### Coach C15.1 Assessment submit (2026-09-01)

- Current V3 node: `1569:7` (`/pages/coach/assessment-submit/index?title=<realTitle>&count=<confirmedCount>`), non-destructively cloned from preserved historical source `93:1163` and named `C15.1 · Assessment Submit · Current V3 · Runtime Reviewed`.
- Runtime review: the success shell keeps the check mark, dynamic submitted title, summary card, submitted status, real confirmed count/date and the two explicit follow-up actions. It does not make a network request or invent a success result; the upstream assessment loop owns confirmation before navigation.
- WeChatIDE MCP exact screenshot: `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788254788264-hm55su.jpg` (`375×812`). Figma node `1569:7` was screenshot-read after cloning.

### Coach C9 Team detail (2026-09-01)

- Current V3 node: `1570:7` (`/pages/coach/team/index`), non-destructively cloned from preserved historical source `93:924` and named `C9 · Team Detail · Current V3 · Runtime Reviewed`.
- Runtime review: the real team hero, season, three summary statistics, four-column student roster, coach group and fixed coach TabBar are all present. Team/member/coach counts and names remain API data and are not copied from Figma samples.
- WeChatIDE MCP exact screenshot: `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788254946742-0k8wr3.jpg` (`375×812`). Figma node `1570:7` was screenshot-read after cloning. No deterministic code defect was found in this pass.

### Coach C10.1 Coverage preview (2026-09-01)

- Current V3 node: `1571:7` (`/pages/coach/coverage/index?eventId=<activityId>`), non-destructively cloned from preserved historical source `93:983` and named `C10.1 · Coverage Preview · Current V3 · Runtime Reviewed`.
- Runtime review: the real account returns more students and dimensions than the Figma sample; the page keeps dynamic coverage bars, pending-sync labels, a fixed confirm bar and coach TabBar without replacing data with sample values.
- WeChatIDE MCP exact screenshot: `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788255066036-einuxo.jpg` (`375×812`). Figma node `1571:7` was screenshot-read after cloning; no deterministic layout or bottom-bar overlap was found.

### Coach C1 All-team schedule (2026-09-01)

- Current Coach V4 node: `1576:43` (`/pages/coach/schedule/index`), with the all-team context copy and no team selector.
- WeChatIDE MCP screenshot: `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788257314685-13ld3u.png` (`375×812`). It shows the fixed top bar, previous/next week controls, month affordance, “全部球队课程” context and coach TabBar.
- The live account had no events in the selected date range, so the empty state is truthful. The C1 test suite separately verifies two different team events remain visible together and that obsolete team-selection state/routes are absent. No code change was needed.

### Coach C8/C8.1 Training management and team selection (2026-09-01)

- Current Coach V4 nodes: `1576:563` (C8 Training Management) and `1576:670` (C8.1 Training Team Selection). C8.1 remains a separate full-screen route and is the only team-selection entry in this flow.
- Runtime evidence: `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788256951890-3gpdf3.png` for `/pages/coach/training/index` and `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788257002102-jkcmzb.png` for `/pages/coach/team-selector/index`; both are strict `375×812` WeChatIDE MCP screenshots.
- C8 reads the real training tree and filters training cards by the locally selected assigned-team id; C8.1 lists only backend-assigned teams, persists the selected id, and returns to C8. The runtime account has one assigned team, so one option/card is expected; Figma's additional teams are sample density only.
- Targeted Vitest for C8/C8.1: `10/10`; miniprogram TypeScript check passed. No business code change was needed in this review.

### Coach C6.1 Match event add (2026-09-01)

- Current Coach V4 node: `1580:7` (`/pages/coach/match-event-add/index?eventId=<activityId>`), non-destructively cloned from preserved online source `93:827`.
- Online Figma screenshot was read at native `375×812`; the runtime route was opened with the currently authorized completed match `event-cq-talent-secure-test-1-completed-match`.
- WeChatIDE MCP screenshot: `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788256647233-r3hq0x.png` (`375×812`). The first attempt with stale activity `event-cq-talent-secure-test-1-mat-0818` correctly returned the real API error state; it was not replaced with mock data. The valid activity rendered the event chips, minute input, player picker, note field, submit CTA and coach TabBar.
- The only visible difference from Figma is truthful capability-driven event density: the real session exposes `扑救/抢断/犯规/黄牌/红牌/乌龙球` in addition to `进球/助攻`. No code change was needed in this batch.

## Verification

- Figma: 每个新 page 和画板都以 MCP 读取、截图并回读 node id。
- Mini-program: 定向 Vitest、`apps/miniprogram-cq-talent` 的 `tsc --noEmit`、限定 `git diff --check`；只有真实 `375×812` MCP 图可作为视觉通过。
- Git: 仅 `git add -- <明确路径>`，不使用 `git add -A`、reset 或 checkout。

## 2026-09-01 V4 当前交付目录修订

- Parent V4 新增当前总览 `1588:2`，补齐 P1 周态 `1588:27` 与月历展开 `1588:200`；原空态及 P4/P5/P8/P7 画板保留。
- Coach V4 新增当前总览 `1589:2`，补齐 C1 全队日程 `1589:27`、C2 `1589:166`、C4 `1589:281`、C7 `1589:396` 和 C8.1 训练球队选择 `1589:461`；日程不选队，训练管理才选队。
- Figma MCP 截图回读：Parent/Coach 总览、P1 周/月、C1、C8.1 均成功；画板均为 `375×812`，总览为 `1280×480`。本次只改在线 Figma 和交接记录，没有改小程序/后端。

## 2026-09-01 V5 当前改版目录

11. [x] 在唯一在线文件中新增 `14 Product Redesign · Parent V5`（`1599:973`）和 `15 Product Redesign · Coach V5`（`1599:2`）；V3/V4/历史稿均保留。
12. [x] Parent V5 回读总览 `1599:974`，并按阅读顺序加入 P1 周态 `1599:999`、P1 月历 `1599:1172`、P4 `1599:1463`、P5 `1599:1623`、P8 `1599:1769`、P7 `1599:1887`。
13. [x] Coach V5 回读总览 `1599:3`，并按阅读顺序加入 C1 `1599:28`、C2 `1599:167`、C4 `1599:282`、C6 `1599:397`、C7 `1599:483`、C8 `1599:548`、C8.1 `1599:655`。
14. [x] 以 V5 画板为新实现入口，逐页检查代码是否仍有日程选队、训练管理缺少选队或选队状态泄漏；每页按最小代码批次、定向测试、真实 375×812 截图、文档和限定路径提交收口。

### V5 首批边界复核（2026-09-01）

- C1 运行截图：`C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\v5-c1-schedule-20260901.png`，sidecar 同名，脚本输出 `375×812`；真实页面显示“全部球队课程”，没有球队选择控件。
- C8 运行截图：`C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\v5-c8-training-20260901.png`，sidecar 同名，脚本输出 `375×812`；真实页面显示“我的球队”和切换入口，课程数据按当前训练球队读取。
- 定向验证：`pages/coach/schedule/index.test.mjs`、`pages/coach/training/index.test.mjs`、`pages/coach/team-selector/index.test.mjs` 共 `32/32`；小程序 `tsc --noEmit` 通过。此批没有业务代码改动。

### V6 当前页面入口（2026-09-01）

15. [x] 对唯一在线文件 `zZ6wKyOHKcO4UYXDd9jGwv` 进行实际写入验证，并新建 Parent V6 页面 `1609:2`、Coach V6 页面 `1609:3`；未覆盖或删除 V3/V4/V5 和历史画板。
16. [x] 建立并截图回读 Parent V6 总览 `1609:4` 与 Coach V6 总览 `1609:29`，再从已核对的 V5 页面非破坏性克隆当前首批屏幕：Parent P1/P4/P5/P8/P7 与 Coach C1/C2/C4/C6/C7/C8/C8.1。
17. [x] 固化产品边界：教练 C1 只显示全部授权球队课程；训练球队只能由 C8/C8.1 选择并供训练、点名、测评、统计使用。后续逐页代码和运行态验收只能引用 V6 节点。
17.1. [x] 补入 Coach C3 `1612:2`：从历史在线画板 `1561:7` 非破坏性克隆，按真实模拟器视口收口为 `375×812`，底部导航覆盖层固定到 `y=742`；历史 `375×903` 源稿保留。
17.2. [x] 补入 Coach C10 `1615:2`：从当前三层内容库在线画板 `1563:122` 非破坏性克隆，保留 `375×812` 视口、训练球队上下文、一级能力／二级分组／三级动作卡和底部选择汇总。
17.3. [x] 补入 Coach C11 `1617:2`：从在线测评任务画板 `93:1002` 非破坏性克隆，保留 `375×812` 任务筛选、完成比例、状态、入口和训练管理 TabBar。
17.4. [x] 补入 Coach C14 `1619:2`：从当前能力雷达在线画板 `1546:7` 非破坏性克隆，保留 `375×812` 压缩训练球队上下文、选中球员雷达和全员头像选择器；历史团队概览 `93:1106` 不再作为当前视觉基准。
17.5. [~] C15 V6 当前骨架为 `1623:2`（`375×812`、`Pending Code Verification`）：复用 C14 已验收的顶栏、训练球队上下文和全员头像选择结构，下一步仅替换中间雷达预览为原始值／标准分输入区；空容器 `1621:2` 已由本轮创建者安全替换，旧 C15 `93:1132` 保留不动。
18. [ ] 逐页检查 V6 与运行态，按最小代码批次完成差异修复、定向验证、真实 `375×812` 截图复验和限定路径提交。

### C1 七天周条首批收口（2026-09-01）

- V6 在线基准为 Coach C1 `1610:1323`。运行态将周条由六天加伪月历格改为完整七天；月历继续由整条日期区展开，前后翻周箭头保留。
- 微信开发者工具 MCP 编译：`pages/coach/schedule/index.wxml`、`pages/coach/schedule/index.wxss` 均成功。可信运行截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788270390966-tihim6.png`，严格 `375×812`，显示完整七天、两个翻周箭头和“全部球队课程”。
- 定向 Vitest（`index.test.mjs` + `seven-day-strip.test.mjs`）`23/23`，小程序 `tsc --noEmit` 通过；本批只暂存七天视图数据、移除伪下拉格、七列布局与回归测试，不携带同文件其他未提交改动。

### C2 训练工作台运行复核（2026-09-01）

- V6 在线基准为 `1610:1462`（`/pages/coach/event/index?id=<activityId>`）。其结构为全屏返回顶栏、深色课程摘要、头像点按式出勤、训练内容与三个快捷动作；不放选队或销课流程。
- 当前教练会话以真实授权活动 `event-cq-talent-secure-test-1-trn-0818` 打开运行态，微信开发者工具 MCP 截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788270675679-uzpebj.png` 严格 `375×812`。顶栏、深色课程卡、已到绿色勾／未到灰色头像、中文姓名、训练内容、快捷入口与固定教练 TabBar 均可见。
- Figma 画板使用 19 人名单示例，当前真实活动返回 8 名授权学员，因此出勤卡高度和下方内容首屏位置不同；此为真实数据密度差异，不通过伪造名单或硬编码高度消除。未发现确定性结构、样式或交互缺陷，本页无业务代码改动。

### C4 点名运行复核（2026-09-01）

- V6 在线基准为 `1610:1577`（`/pages/coach/attendance/index?id=<activityId>`）。该页是独立全屏点名页面：返回、提交、课程摘要和头像点按式名单；绿色勾为已到、灰色头像为未到，姓名必须在头像下方，不显示销课或课时更正流程。
- 当前教练会话以真实授权活动 `event-cq-talent-secure-test-1-trn-0818` 打开运行态，微信开发者工具 MCP 截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788270740951-d0z62o.png` 严格 `375×812`。顶栏、提交、课程卡、8 名真实学员的绿／灰状态与姓名、固定 TabBar 均可见。
- 本轮只读验收，未点击头像或提交，避免修改生产出勤。在线稿的 19 人只是展示密度样例；当前授权活动的 8 人名单导致卡片较短，不构成布局缺陷。未发现需要修复的确定性差异。

### C3 日程变更运行复核（2026-09-01）

- 旧在线画板 `1561:7` 是 `375×903`，不能直接作为真实手机首屏基准。本轮已在可编辑的 Coach V6 页面中非破坏性克隆为 `1612:2`，并把画板收口为 `375×812`、底部导航覆盖层定位到 `y=742`；在线稿临时截图证据为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-figma-c3-v6-20260901.png`。
- 真实双角色教练会话通过 `/pages/coach/event-change/index?id=event-cq-talent-secure-test-1-trn-0818` 打开，微信开发者工具 MCP 截图为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271532020-7zb4xw.png`，严格 `375×812`。返回／保存顶栏、活动信息、变更原因、日期、场地、说明和固定教练 TabBar 均与 V6 结构一致。
- 活动标题、日期、状态和可用场地是 API 返回数据；Figma 示例不覆盖真实值。未保存或写入任何变更，未发现确定性实现差异，因此本轮无小程序代码改动。

### C10 三层训练内容库运行复核（2026-09-01）

- V6 在线基准为 `1615:2`，由当前已验收的三层内容库画板 `1563:122` 非破坏性克隆而来，二者均为 `375×812`。其交互边界是：只能由 C2 工作台带 `eventId` 进入，读取当前训练球队的一级能力、二级分组和三级训练动作，选择后保存回该活动。
- 直接无参数打开时，运行态明确显示“缺少活动信息，暂时不能保存训练内容”；这是 API 契约正确的错误态，不能用假内容替代。使用真实活动路由 `/pages/coach/content-select/index?eventId=event-cq-talent-secure-test-1-trn-0818` 后，微信开发者工具 MCP 截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271694548-ln435e.png` 严格 `375×812`，呈现 U10 精英队、能力分类、二级分组、动作卡、数量／时长和“选择 (1)”汇总。
- 顶栏、检索、三层结构、固定选择栏和教练 TabBar 均与 V6 结构一致；真实训练树的名称和条目数由 API 返回，未伪造。未改动或保存训练内容，本轮无业务代码改动。

### C11 测评任务运行复核（2026-09-01）

- V6 在线基准为 `1617:2`，由在线画板 `93:1002` 非破坏性克隆，二者均为 `375×812`。页面是教练训练管理上下文下的测评任务列表，提供全部／未完成／已完成筛选、任务进度、任务详情和新增入口。
- 微信开发者工具 MCP 在当前训练球队上下文取得严格 `375×812` 截图：`C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271771537-5kecn6.png`。真实任务显示体能综合测评、速度耐力体测、8月下旬技术测评、敏捷性专项测评及其状态和完成比例；在线稿仅使用三张示例卡，真实多一条是数据密度差异。
- 顶栏、筛选标签、任务卡、进度线、新增悬浮操作与固定教练 TabBar 均完整可见。未新建或编辑测评任务，因此没有生产数据写入；本轮无业务代码改动。

### C14 能力评估运行复核（2026-09-01）

- 正确的当前在线基准是 `1546:7`，而不是归档的长页面 `93:1106`；本轮已非破坏性克隆为 V6 `1619:2`。它采用 `375×812`：压缩的训练球队上下文、单个球员雷达预览、全体球员圆形头像／姓名选择器和固定训练管理 TabBar。
- 微信开发者工具 MCP 先检测到一次非标准渲染文件 `563×1218`，未用作验收；复取严格 `375×812` 运行截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271927562-yx0isz.png`。当前真实页面展示丁宁的六维雷达、综合 `67` 和完整 19 名球员选择区，符合“全部显示、点选切换”的产品要求。
- 当前 C15 指标录入运行页仍是“先显示全部学员，再进入逐人录入”的真实流程；其历史 Figma `93:1132` 为 `375×1002` 的旧长滑杆方案，不能作为 V6 视觉验收基准。C15 必须在下一批先重建设计基准，再进入小程序实现；本轮没有提交任何指标写入。

### C6 比赛记录运行复核（2026-09-01）

- V6 在线基准为 `1610:1692`（`/pages/coach/match/index?id=<activityId>`）。页面包含比赛摘要、比分、编辑比赛、按分钟排列的事件时间线及“添加事件”入口；事件内容必须来自真实比赛记录，不以 Figma 示例覆盖。
- 当前教练会话以真实已完成比赛 `event-cq-talent-secure-test-1-completed-match` 打开运行态，微信开发者工具 MCP 截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788270802072-j4oamy.png` 严格 `375×812`。赛事标题、真实 `4:2` 比分、编辑／添加事件、中文事件类型和底部 TabBar 均正常可见。
- Figma 首屏仅用三条事件说明结构，真实比赛返回更多事件（含进球、助攻、犯规、黄牌、乌龙球等）并由页面滚动展示；没有截断、英文伪数据或 TabBar 遮挡。此轮不编辑或写入比赛，无业务代码改动。

### C7 比赛战术板运行复核（2026-09-01）

- V6 在线基准为 `1610:1778`（`/pages/coach/tactical-board/index?eventId=<activityId>`）。全屏工作面必须由上半球场、阵型切换、下半完整球员名单、拖拽上／下场、重置和保存构成，不显示教练 TabBar。
- 当前教练会话以真实排兵比赛 `event-cq-talent-secure-test-1-scheduled-match` 打开运行态，微信开发者工具 MCP 截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788270869987-a26yt3.png` 严格 `375×812`。`4-3-3`、11 名场上球员、8 名候补、球场、拖拽提示、重置／保存操作均可见。
- Figma 编号为布局示例，真实运行显示当前比赛保存的球员姓名与编号。此轮不拖拽、不重置、不保存，避免覆盖已验证的持久化阵容；未发现当前首屏结构或底部操作区的确定性视觉差异。

### C8/C8.1 训练管理与选训练球队运行复核（2026-09-01）

- V6 在线基准：C8 `1610:1843`（`/pages/coach/training/index`）和 C8.1 `1610:1950`（`/pages/coach/team-selector/index`）。C8 显示当前训练球队、统计、训练计划／能力评估／学员管理／测评任务；C8.1 是唯一可改变训练球队上下文的独立全屏页面。
- 微信开发者工具 MCP 截图严格 `375×812`：C8 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788270926891-bfgw1t.png`，C8.1 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788270944226-lssxwk.png`。当前真实会话显示“我的球队 U10精英队”、真实统计和课程；选择页只列出后台分配的 U10精英队并标为当前选择。
- 在线稿包含多队样例，当前账号实际只有一支已授权队伍，因此 C8.1 只显示一项是权限正确性而非缺陷。未点击队伍以避免切换上下文；C1 日程继续没有选队入口，边界保持正确。无业务代码改动。

### P1 家长日程周态／月历展开运行复核（2026-09-01）

- 通过真实双角色入口从 `/pages/coach/me/index` 点击“当前身份 教练端 切换 ›”后，模拟器实际跳转到家长端日程；没有伪造会话或改写接口。页面栈查询发生在异步切换完成之前，最终严格 `375×812` 截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271024664-vv366q.png` 证明已在家长端。
- V6 在线基准：周态 `1610:2`，月历展开 `1610:175`，路由 `/pages/parent/schedule/index`。周态保持通知铃铛、无日程 Hero、通知 banner、前后翻周、周条及家长 TabBar；真实截图为 `wechatide-simulator-screenshot-1788271024664-vv366q.png`（`375×812`）。
- 点击 `.week-nav__expand` 后，运行态 `isMonthPickerExpanded=true`，真实月历截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271066157-v9mx2k.png` 严格 `375×812`。月历显示真实当月日期与活动标记，选中日期红圈未与训练绿色点重合，月历、顶部和 TabBar 均无截断。无业务代码改动。

### P4/P5 家长成长与能力雷达运行复核（2026-09-01）

- V6 在线基准：P4 `1610:466`（`/pages/parent/growth/index`）和 P5 `1610:626`（`/pages/parent/radar/index`）。P4 承载当前孩子成长摘要、足迹、比赛记录、训练历程与雷达入口；P5 是独立全屏能力雷达与维度详情页。
- P4 真实运行截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271133082-uyqoe7.png` 严格 `375×812`，显示真实训练课时、出勤率、成长足迹、比赛记录和训练历程。Figma 的姓名和统计数为样例，不覆盖真实孩子数据。
- P5 真实运行截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271161658-ass2je.png` 严格 `375×812`，显示真实六维雷达、综合评分 `77`、维度标签和详情。图形、标签、历史对比、顶部及固定家长 TabBar 均无重叠或截断；本轮无业务代码改动。

### P8 家长发现运行复核（2026-09-01）

- V6 在线基准为 `1610:772`（`/pages/parent/content/index`）。页面由固定顶栏、场馆订阅 Banner、两行快速入口、最近文章和当前顺序的家长 TabBar 构成。
- 在线 Figma 原始截图临时证据为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-figma-p8-v6-20260901.png`；真实微信开发者工具 MCP 截图为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271333664-qdo7cw.png`，均为 `375×812`。Banner、四个入口的图标与排版、文章卡的强调线/箭头及 TabBar 均与在线稿结构一致。
- 文章标题与数量由生产账号可见内容决定，和在线稿的示例文章不同；没有用静态示例覆盖真实数据。本轮无确定性视觉或交互差异，无业务代码改动。

### P7 家长我的孩子运行复核（2026-09-01）

- V6 在线基准为 `1610:890`（`/pages/parent/child/index`）。页面包含孩子身份卡、双角色切换入口、三项统计、四个快捷功能、最近动态和当前顺序的家长 TabBar。
- 在线 Figma 原始截图临时证据为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-figma-p7-v6-20260901.png`；真实微信开发者工具 MCP 截图为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788271376464-7mci7o.png`，均为 `375×812`。深色身份卡、角色切换、统计卡、四格快捷入口、动态区和固定 TabBar 均无重叠或截断。
- 实际账号返回“丁宁”、`27` 课时和 `96%` 出勤率，在线稿的姓名与统计仅为版式示例；真实数据差异不以硬编码替换。本轮无业务代码改动。

### V5 首批复验（2026-09-01）

- 重新通过微信开发者工具 MCP 取得三张严格 `375×812` 运行截图：`%TEMP%\\cq-talent-visual-evidence\\v5-c1-schedule-rerun-20260901.png`、`%TEMP%\\cq-talent-visual-evidence\\v5-c8-training-rerun-20260901.png`、`%TEMP%\\cq-talent-visual-evidence\\v5-c8-1-selector-rerun-20260901.png`。
- C1 当前真实日期范围没有课程，保留真实空态；页面仍展示跨球队日程上下文，不读取 `coach-training-team-id`。C8 显示当前训练球队并按球队过滤课程；C8.1 只显示后端分配队伍。样例数量差异不作为代码缺陷。
- 复验门禁：定向 Vitest `32/32`、小程序 `tsc --noEmit`、C1/C8/C8.1 WXML 与 WXSS 编译均通过；WechatIDE 状态为已登录，CLI 令牌未启用。

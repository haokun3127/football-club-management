# 核心演示闭环 · 进度跟踪

## 2026-08-18 七个独立双角色真机演示账号（已生产导入，真机待验）

- 安全受控导入由 3 个固定槽位扩展为 7 个：每个运行时手机号均对应同一 club 内独立的 `parent + coach` 会籍、家长档案、教练档案与单独 8 人球队。家长端严格只投影其中 2 名已绑定学员；教练端只可查看本账号所属的完整 8 人阵容，账号之间不共享家长绑定、球队、日程或业务记录。
- 每个账号均准备相对当前导入时间生成的 5 条历史/当前/未来训练与比赛日程、40 条活动参与记录（含到课、迟到、缺席、请假、待确认等状态）、16 条课时流水、8 名队员的 8 维评测原始值/归一化分数/指标记录/血缘、已完成与待进行比赛及 8 条比赛事件、已保存 4-3-3 战术板；两个家长可见学员另有运营档案、保险、私教申请与沟通记录。
- 真实手机号只以私有运行时变量 `SECURE_CQ_TALENT_TEST_PHONE_1` 至 `_7` 注入；仓库、文档、日志、测试输出和提交均不保存其值。2026-08-18 已完成生产受限备份、无写 dry-run、已确认导入和仅 API 重启；内网与 HTTPS 健康检查均返回 200。随后以 14 个短时、精确删除的 bearer 会话对公网 BFF 逐槽回读：每个 parent 仅见 2 名绑定学员、5 条基准日程及 8 项成长指标；每个 coach 仅见本队 8 人、5 条基准日程、8 项雷达指标和已保存的 8 人战术板，响应未投影手机号。真实微信设备授权、首次角色选择及两端切换仍必须由持有对应手机号的测试人员完成，不能以服务端回读替代。
- 本地验证：安全导入聚焦测试 `14/14`、API typecheck/build、串行全仓门禁均完成；全仓结果为 domain `19/19`、小程序 `332/332`、API `108/108`，命令退出码 `0`。仍需在生产执行受限备份（含 SQLite WAL/SHM）→ dry-run → 用户一次性确认 → confirmed import → 仅重启 API → `/health` 与双角色聚合读回。

## 2026-08-12 Secure production identity and isolated dual-role test-account hardening

- Production entrypoint rejects header-only identity; only the explicit local development entrypoint enables header smoke authentication. Phone identity resolution requires a unique active user and active club membership.
- Added the original transactional, fixed-ID, isolated three-account parent/coach import with separate child, guardian, coach-team, calendar, and participant scopes. As of 2026-08-18, the controlled operation is extended to seven slots; test-phone values remain runtime-only and are never returned by the controlled CLI.
- The controlled file-SQLite CLI allows only dry-run import, confirmed import, and confirmed rollback. Dry-run does not migrate or mutate; confirmed import requires a private backup attestation; rollback refuses absent, partial, tampered, or ownership-inconsistent canonical installations.
- Terra xhigh independently reviewed the final security boundaries. Final local verification: domain `8 files / 19 tests`, mini-program `54 files / 306 tests`, API `11 files / 103 tests`, root typecheck, task-context validation, and `git diff --check` all passed. A previous root-script run had a transient mini-program Vitest worker exit despite all assertions passing; an isolated rerun was clean. No server access, production database operation, deployment, restart, or device login occurred in this task.
- 交接更新：`docs/current/agent-handover-2026-08-12.md` 现为 Claude 接手入口；部署认证边界以 `deployment-requirements.md` 与安全账号专项交接为准。旧文档内的生产演示、`X-User-Id` smoke 与部署记录均须按其历史/本地限定解读，不得直接当作当前生产状态。

## 2026-08-12 教练端演示数据交付边界复核

- 已把后端演示数据分层记录：身份、队伍、日历/签到、课时流水、测评指标、比赛和战术板为 SQLite 持久化实体；训练计划/训练课、评测任务、FAQ 和部分观察记录仍由后端 seed 提供；首页统计、雷达与能力总览是派生视图。它们均不是小程序前端 mock。
- 隔离的开发验收 SQLite 可通过 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` 提供 16 名教练可见队员、6 场活动、完整出勤分布、8 维指标、比赛事件和战术名单。生产模式被代码禁止加载该 seed，不能用该变量对共享/生产数据库“补数据”。
- 本轮只读实测 `https://cqtc.pomi.tech/health` 正常且 OpenAPI 含所需教练路由；健康检查不能证明远端库此刻包含全部演示记录。生产数据核查需使用真实教练会话做只读 GET；任何备份、导入、迁移、重启或写入应另建可 dry-run、可回滚的部署任务。

## 2026-08-12 C13 学员雷达安全区顶栏收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1080 / C13 Student Radar`。粉色页内顶栏从 border-box 改为 content-box，确保状态栏安全区不会压缩画板所需的 88px 内容高度；现有 220×180 真数据雷达画布、总分、维度与训练 Tab 未改变。
- 评语区域继续明确显示“暂未同步”，未把 Figma 的教练姓名和示例建议伪造为后端事实。C13 仍只读取当前教练可见的成员与该成员真实雷达指标。
- 验证：C13 聚焦 Vitest `10/10`、小程序 TypeScript 与 `git diff --check` 通过；没有已登录 C13 的可信 `375×812` 截图，不作运行时视觉验收完成结论。

## 2026-08-12 C11 测评任务安全区顶栏收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。C11 的粉色页内顶栏改为 content-box，使真实状态栏安全区不再压缩 88px 内容高度。
- Figma 的“新增”浮动按钮没有对应创建任务 API，故继续不渲染；任务、进度、状态、筛选与可录入判断仍完全来自真实 assessment-task BFF。
- 验证：C11 聚焦 Vitest `7/7`、小程序 TypeScript 与 `git diff --check` 通过；现有 C11 运行截图是先前版本，本批未取得新的可信 `375×812` 截图，故不作运行时视觉验收完成结论。

## 2026-08-12 C9 队伍详情统计语义与布局收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:924 / C9 Team Detail`。C9 的“累计训练”现使用既有 `coach/team.stats.completedTrainingCount`，不再把滚动 30 天 `trainingCount` 误标为累计。非空出勤率沿用真实 BFF 值并使用绿色强调；缺失值保持 `--`。
- 页面同步收口了安全区顶栏的 content-box 高度、深色 hero 无额外阴影、14px 数值和 4 列学员网格间距。Figma 的教练组横滑卡暂未渲染：现有 `coach-team` 为俱乐部内容切片，不能保证是当前教练所辖队伍，不能挪用或伪造岗位/姓名。
- 验证：C9 聚焦 Vitest `5/5`、小程序 TypeScript 与 `git diff --check` 通过；尚未取得已登录 C9 的可信 `375×812` 截图，故不作运行时视觉验收完成结论。

## 2026-08-11 Coach Figma Header Geometry Repair

- Online Figma authority remains `zZ6wKyOHKcO4UYXDd9jGwv`. This batch corrects real layout causes without replacing missing API fields with Figma sample data.
- C2 (`93:606`) now uses the required in-flow coach navigation below the 88px header; routes are whitelist-checked before `reLaunch`.
- C6/C6.1 (`93:796`, `93:827`) use the new soft, left-aligned header variant, preserving existing match read/write contracts.
- C1/C4/C5/C8/C10/C12/C13/C14/C15 custom headers now account for the status inset inside the fixed 176rpx envelope, with capsule clearance applied to right-side controls.
- Commits: `4e60d35`, `61304f4`, `e61ce43`, `4136498`, `a58ed0b`, `bdcb807`, `5037efb`, `2936d68`, `a852ef3`.
- Verification: full workspace check passed — domain `19/19`, mini-program `293/293`, API `85/85`; TypeScript and `git diff --check` passed. No authenticated post-change 375x812 coach capture was available, so this is not a runtime visual-acceptance claim.

## 2026-08-11 C16 Runtime Screenshot Recheck

- A current authenticated coach-session `375x812` capture at `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811\C16-me-profile-stats.png` was compared against Figma C16 `93:1182`: the pink 88px top bar, dark profile card, three-stat row, role-switch card, menu block, logout outline, and coach bottom tab are present.
- The displayed values (`4`, `3`, `1`) came from the active account's live coach-home response and are not Figma fixtures. Screenshot capture omits the platform menu capsule, so it verifies page geometry but not physical capsule overlap.
- C7 `233:2` was also routed with a coach session, but its available event ID returned the page's honest “read failed” state; it is not recorded as a ready-state visual acceptance.

## 2026-08-11 Coach Runtime Sampling and Workflow Headers

- C9 `93:924` and C11 `93:1002` were captured from the current authenticated coach session at `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811\C9-team-current.png` and `C11-test-tasks-current.png`. Their header, card, member/task, and bottom-navigation geometry is present. Current scope returns two members and two assessment tasks; unsupported Figma sample members and the task-creation affordance remain absent rather than fabricated.
- C3, C4.1, C5.1, C10.1, and C15.1 now use the Figma-required left-title navigation geometry and fixed 88px safe-area envelope. C10.1's neutral header background and C15.1's pink left-title header were aligned without changing any capability or write contract.
- Latest full workspace check: domain `19/19`, mini-program `293/293`, API `85/85`; all TypeScript checks and `git diff --check` passed. C7 ready-state screenshot remains data-blocked, not passed by inference.

## 2026-08-11 C16 Detail-Page Alignment

- C16 account, permissions, private-interest, and help detail headers no longer reserve a right-side placeholder. The back arrow and title now share the left-aligned Figma geometry; account also uses the fixed safe-area-inclusive 88px header envelope.
- The current account and permissions pages were sampled with the authenticated coach session. Dynamic phone, capability, and administrator-only content remains derived from real session/capability data; no edit, save, or contact affordance was invented where the BFF lacks that contract.
- Verification after this batch: domain `19/19`, mini-program `293/293`, API `85/85`, all TypeScript checks, and `git diff --check` passed.

## 2026-08-11 C14 Runtime Header Recheck

- Authenticated runtime capture `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811\C14-team-ability-current.png` confirms the C14 custom top bar now uses the Figma-sized 88px envelope instead of the former over-height header. Back action, left-aligned title, export control, dark overview card, dimension card, and coach bottom tab are present.
- The current API response does not have enough dimensions for a truthful radar polygon; the page displays its existing honest empty-radar state and does not borrow Figma's sample metrics.

## 2026-08-11 C1 Runtime Header Recheck

- Authenticated capture `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811\C1-schedule-current.png` confirms the C1 header and date strip now use the Figma 88px/64px structure, and the coach bottom tab remains attached to the viewport bottom.
- The selected real date range contains no accessible activities, so C1 correctly renders its API-backed empty state instead of Figma's illustrative hero, event cards, or summary values.

## 2026-08-11 Dual Parent/Coach Role Switching: Backend Foundation

- Added SQLite-backed app-client sessions with SHA-256 token storage, atomic token rotation, route-bound bearer revalidation, entrypoint-filtered `availableRoles`, and the server-confirmed role-selection endpoint.
- Capability-aware dual-role logins receive a pending session; legacy clients retain the compatible scoped default session. Pending, stale, expired, revoked, inactive-user, inactive-membership, inactive-client, and wrong-role bearer sessions return `401 authentication_required` without development-header fallback.
- A real file-backed restart test closes all original API/database instances before reopening and confirms a current active session remains valid. Full API Vitest `81/81`, API typecheck, and `git diff --check` passed; Terra xhigh approved the backend diff. Mini-program chooser and in-app switch controls remain the next independent batch.

> 依据《Figma 全量补齐决策》（../design/figma/figma-full-implementation-decision.md）执行。
> 本文档随每批工作实时更新：完成一项勾一项，新增发现随时补充。
> 最后更新：2026-08-08

### 2026-08-08 批次 4/5/6 收口：家长端全部 17 页 topbar 按 Figma 修复并逐页实拍验收 + 4 个独立提交

- **提交**：`663be2c` perf(api) 日程列表 N+1（5144ms→711ms）；`c48385b` P4 growth topbar；`2014a0a` radar 首载性能+P5 topbar；`a7646c4` 家长端 13 页 topbar。路径限定暂存，主工作区其余 ~31 项无关未提交改动（assessment 持久化等）未连带。
- **Figma 唯一权威**：`zZ6wKyOHKcO4UYXDd9jGwv`（用户重申 URL），"05 Parent Generated"(4:6) 页下 16 块内容画板；画板枚举/Header 几何取自 mcp get_metadata(4:6)+逐 Header get_design_context。页面↔画板映射：child=P7 Parent Profile Hub(93:336)、status=P7.1(93:364)、event=P2/P2.1/P2.2、reminders=P3(93:222)、metric=P6(93:308)、content=P8(93:388)、help=P8.2(93:444)、private=P9(93:500)、private-success=P9.1(93:531)、binding=P10(93:550)、coaches=Coach Team(93:472)、venues=Venues Premium(93:416)；account 无画板（app-header 已胶囊安全，不动）。
- **统一修法**：44px(88rpx) 内容带 content-box + `padding-top:{{navInset}}px` + `padding-right:{{menuInset}}px`（resolveMenuInset 动态避让胶囊）；‹字符/🔍emoji 全部换 Figma 原版 SVG（新增 search.svg、more-horizontal.svg）；coaches/venues/metric 摘除 app-header 死注册改手写 nav。
- **验收中修复的 2 个真缺陷**：① event 比赛变体「邀请好友」绝对定位压居中标题 → 右操作改流式布局（title flex-1 center）；② private-success 未 decodeURIComponent query → 中文教练名显示 %E7%8E... 乱码，已修并复验。
- **视觉验收**：模拟器逐页实拍 17 页（`C:\Users\ASUS\cq-talent-visual-evidence\b6-page-*.png`），vision 逐页核对胶囊间隙/垂直对齐/设计符合性，17/17 通过（reminders「全部已读」为 0 未读数据态隐藏，判 D 级可接受）。
- **环境事件（重要教训）**：① 强杀 DevTools 进程后冷启动 GUI 白屏（逻辑层正常），shader 缓存清理无效，**Ctrl+Win+Shift+B 重置显卡驱动后恢复**；② 渲染层冻结可只发生在**弹出式模拟器**（原生状态栏/授权弹窗照常更新、webview 页帧陈旧跨路由同哈希），内嵌模拟器同刻健康——此后验证改用 WGC/dxcam 拍内嵌模拟器；③ 合成鼠标事件（mouse_event/PostMessage）**到不了模拟器 webview/原生弹窗**（但能点 DevTools 原生工具栏），登录授权弹窗无法自动点；④ 登录态在强杀后丢失，临时 `DEV_AUTO_SESSION=true`（config.ts）完成验证后已回滚 false 且未提交；⑤ 自动化端口 9421 会话失效后换 9422 恢复。
- **门禁**：miniprogram typecheck ✅ vitest 51/51 ✅；api vitest 68/68 ✅；根 `pnpm run check` ✅。

### 2026-08-08 P6「同队对比」条重做（用户反馈「那个条有问题」）

- **问题**：marker 恒居中在色条下方且文字截断、缺得分分布标签+图例、分段比例不符、队内排名结构不符设计。
- **修复**：按 Figma TeamCompare(196:893) 重做——marker 移到条上方按得分%定位（clamp 5.5–94.5%）；补 4 段图例；分段 19.3/32.2/25.7/22.8%；队内排名改设计结构（我的行+待同步占位）。提交 `见 git log`（metric 3 文件）。
- **验收**：有数据态（运控球 62 分，marker 落浅粉段 62% 处）vision 6/6 ✅；无数据态（marker/我的行隐藏、条+图例+占位正常）vision 4/4 ✅。
- **新 capability**：`miniProgram.callWxMethod("pageScrollTo", {scrollTop})` 在 evaluate 全挂起的本机 build 上可用——折下内容验收不再依赖用户手动滚动（已补入技能）。

### 2026-08-07 P5/radar 批次 3 修复 + 复测（D3-1 白上白已修，D2 底部 tab 已实现，D3-2 根因已定位）

- 代码修复（单独 commit）：radar 画布容器与 radar-canvas 空态白底改透明（对齐 Figma 深色 Hero）；radar 页接入 `role-tabbar`（active=growth）并补底部留白；`openPage` 补 `navigateTo` fail 日志（errMsg + 页面栈深度）；`types/wechat.d.ts` 补 `console`/`getCurrentPages` 声明。miniprogram typecheck 通过。
- 复测：修复后 radar/growth 可信 375×812 截图已重取（新鲜性校验通过，非陈旧帧）；用户目视确认雷达线条/标签可见、底部 tab 出现。像素量化：header 高 88px 与 Figma 精确一致；运行胶囊位置 (281,≈28) vs Figma 占位 (281,28) 误差 ≤1px。
- D3-2 定位：成长页雷达卡 tap 正常触发，`navigateTo:fail timeout` 后页面实际压栈并延迟数秒完整呈现——**radar 页首次加载过慢导致导航超时，非接线缺陷**；性能优化另立批次待用户裁决。
- **模拟器渲染层冻结根因（傍晚定位）**：工作区未提交的 `libVersion` 降级 3.17.0→3.16.2 导致 Stable v2.01.2510290 模拟器 webview 渲染层冻结（跨路由捕获同哈希、原生 canvas 悬浮陈旧帧、可跨重启复现）。经用户同意改回 3.17.0 后渲染恢复，radar 页完整呈现（vision 逐项核实，无悬浮异常）。`project.config.json` 现与 HEAD 一致，未提交。该文件此前在 3.16.2 下产生的一切"只显示多边形/悬浮雷达"观感均为合成器幻影，非页面缺陷。
- 条目状态明细见 `.trellis/tasks/08-05-08-05-test-metrics-p5-radar/visual-audit-2026-08-07.md` 复测记录节。P5 视觉验收判定权留用户（本批不构成通过/不通过判定）。

### 2026-08-07 P5/radar 首次设计↔运行对照取证完成（发现 D3 级差异，验收待修复后复测）

- 设计侧证据齐：`93:278 / P5 Ability Radar` 官方渲染 PNG（375×812）+ `get_design_context` 全量几何/色值，含用户添加的微信胶囊占位节点 `272:860`（left:281 top:28 w:87 h:32）。
- 运行侧：真实家长会话下 `pages/parent/radar/index` 为 ready 成功态（当前学员 ≥3 项有效指标），可信 375×812 截图已取（路由校验通过、用户确认与屏幕一致）。
- 对照结论（措辞上限「已对照，差异见清单」，判定权留用户）：发现 **D3 级差异 2 项**——① 雷达画布容器白底（`radar/index.wxss:25`）叠加 dark 模式白色线条导致白上白、仅红色多边形可见（像素探针证实，用户提出的假设成立）；② 成长页雷达卡点击未跳转详情（用户报告，静态链路核查存在且路径正确，待复现）。另有 D2 1 项（画板底部 Tab 覆盖层 vs 运行页无 tab 组件）待用户裁决。差异清单与证据哈希见 `.trellis/tasks/08-05-08-05-test-metrics-p5-radar/visual-audit-2026-08-07.md`。
- 工具链新陷阱：弹出式模拟器窗口 PrintWindow 后缓冲可能为陈旧帧（哈希与上一张相同即不可信）；本 DevTools 版本 DOM 查询（`page.data`/`page.$`）全部超时。

### 2026-08-07 P5/radar 节点存在性阻塞解除（仅节点，不含截图与设计内容核验）

- 经 Figma MCP `get_metadata` 实读 `zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`，观测到 28 个 375×812 顶层画板存在（21 张原始设计 + 7 张 CODE 契约版），含 `93:250 / P4 Growth Home`、`93:278 / P5 Ability Radar`、`93:308 / P6 Metric Detail`。完整三元组清单见 [Figma 权威来源](figma-source-of-truth.md)。
- 2026-08-05 条目中"当前在线 Figma 尚未取得可验证的 P5、雷达和指标录入节点及截图"含两个断言；本次仅推翻"节点"部分——**画板设计内容与截图仍未核验，不构成视觉验收依据**，需后续逐板 `get_screenshot` / `get_design_context` 取证，且仍须取得微信开发者工具真实 375×812 运行截图后方可做视觉对照。
- 同期完成：教练签到生产持久化验证（生产 PUT → 容器重启 → 同库读回一致，台账零副作用，证据与边界见 `.trellis/tasks/08-05-coach-attendance-persistence/implement.md` 2026-08-07 节）；C4 可信 375×812 视觉验收仍待真实登录后完成。

### 2026-08-05 测试指标 SQLite 持久化（Batch A）

- 测试指标评测已写入 SQLite：`player_assessments`、`assessment_raw_results`、`assessment_scores`、`player_metric_records` 与 `metric_lineages`，保持现有 coach assessment POST 与 parent readback 契约。
- 同一临时 SQLite 关闭后，以构建产物 `apps/api/dist/index.js` 重启并通过 HTTP 读回：`/health`、`growth-summary`、`ability-metrics` 均为 `200`，`assessment-2` 在重启后仍存在；确认 PID `29432` 已停止、端口 `3417` 已释放。
- 本批 API focused tests `59/59`（提高默认超时后）通过，typecheck、build、`git diff --check` 通过；默认 5 秒运行仍准确保留 `server.test.ts:2903` 的历史超时记录。
- P5 雷达视觉实现暂不开始：当前权威 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 尚无可验证的 P5/指标录入节点与截图，因此尚未进行视觉验收。

## 2026-08-04 设计权威切换（覆盖现行规则）

- 自 2026-08-04 起，唯一当前设计权威为在线 Figma 文件 `zZ6wKyOHKcO4UYXDd9jGwv`；旧文件 `ATlfBRO0ruOCDDY5ICagFD` 仅保留为历史审计，禁止新的读取、编辑、实现或视觉验收，且节点 ID 不得跨文件继承。
- 当前设计引用必须使用三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`、`zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`、`zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`、`zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`、`zZ6wKyOHKcO4UYXDd9jGwv / 4:7 / 06 Coach Generated`。
- 即使后续或历史排障记录包含 `ATlfBRO0ruOCDDY5ICagFD` 或裸节点 `93:83`（包括本文末尾的 DevTools 截图通道 hunk），也只表示切源前、尚未完成的历史排障线索，绝不能作为当前文件 `zZ6wKyOHKcO4UYXDd9jGwv` 的读取、实现或视觉验收依据。
- 当前 P1 运行态对照只能使用 `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`；P1 Empty 只能使用 `zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`。P1/G2 下方保留的旧几何均属于切源前历史规格；G2 当前现行 `form-card` 为 `331×144`，旧 `verification-card` `331×128` 仅作历史值。

## 2026-08-05 核心演示闭环（覆盖当前推进总纲）

当前只冻结以下六项，按顺序推进，历史 P1–P10/C1–C16 全量视觉愿景保留但不作为本轮执行范围：

1. P1 视觉验收
2. 教练签到 SQLite 持久化
3. 测试指标 + P5
4. 训练计划
5. 比赛记录
6. 战术板重启读回 + MVP 视觉

- P1 已取得可信 Windows PrintWindow 运行截图，但视觉验收不通过：Hero 左侧酒红面积/边界偏差，运行态周序为 `SUN→SAT` 而当前 Figma 为 `MON→SUN`；本轮无代码改动。
- 教练签到已接入 SQLite；本地文件型数据库重启读回已验证，生产部署目前仅有 health/OpenAPI 可达证据。
- 当前质量记录仅覆盖小程序 `44/44 tests`、小程序 `typecheck` 与截图工具测试；不得写成全仓通过。API fixture 差异仍保留：`apps/api/test/server.test.ts:688` 期望 `not_started`、实际 `in_progress`；`:1344` 数据能力预览记录断言不一致。

### 2026-08-05 教练签到 SQLite 持久化

- P1 当前为产品接受，但保留已知 Figma 差异（Hero 左侧酒红面积/边界及 `SUN→SAT` 周序）；不宣称像素一致或视觉验收完成。
- 教练签到已接入 SQLite：日程与参与者 seed 采用 insert-if-absent，签到按 `(club_id, event_id, student_id)` 保存 `status`、`note` 与 `updated_at`；重启 seed 不覆盖既有签到。
- 已完成文件型数据库实测：PUT 保存 `present` 与非空备注，构建后安全停止已确认 API PID，以同一数据库重启 `dist/index.js`，GET 读回状态与备注；`event-training-1-student-1` 仅保留一条 `-1` attendance debit。
- 本批验证：API `5 files / 66 tests`、API typecheck/build、小程序 typecheck 与 `8 files / 45 tests`、`git diff --check` 通过。此结论不代表全仓测试；历史记录中的 `server.test.ts:688` 和 `:1344` fixture 说明仍仅作历史追踪，不以本批小程序/API 包验证替代全仓验收。
- C4 真实 coach 运行态与可信 `375x812` 截图未取得，视觉验收仍待完成。
- 2026-08-05 生产部署证据：`6526fe4` 已部署至容器 `cq-talent-api`，发布目录为 `/opt/cq-talent-releases/6526fe4`；旧 `/opt/cq-talent-api` 保留且非 Git 工作树，SQLite 使用 named volume `cq-talent-api-data`，生产 API 仅监听 `127.0.0.1:3000`，Nginx TLS 反代 `cqtc.pomi.tech` 至该端口，HTTPS `/health` 返回 `200`，OpenAPI 含 coach attendance 路由。
- 生产本轮仅证明健康检查与 OpenAPI 路由可达；没有真实生产 coach PUT、生产同库重启读回或 C4 视觉验收证据。P1 仅为产品接受，仍保留已知 Figma 差异，不宣称视觉完成或像素一致。

## 总体进度

| 维度 | 总数 | 已完成 | 说明 |
|---|---|---|---|
| Figma 家长端画板 | 28 | 10 原始设计 + 5 契约版 | 契约版待按原始设计重做 |
| Figma 教练端画板 | 43 | 13 原始设计 + 9 契约版 | 契约版待按原始设计重做 |
| 小程序路由 | 44 | — | 家长 15 + 教练 25 + 启动/登录 2 + 其他 1 |
| 后端 BFF 切片 | — | 3（提醒中心 + 私教申请 + 教练球队/能力） | 契约先入 spec 再实现 |

## 已完成

### 批次 1-2：交接收尾（2026-07-29/30）
- [x] 交接包审查、验证链（install/typecheck/83 测试/构建/启动）
- [x] 干净构建修复 `8d6caea`+`f4075b8`；GitHub origin 配置推送 11 分支
- [x] Figma 全量补齐决策入库 `e3bd176`

### 批次 3：视觉基础（A 线）
- [x] token 层 `styles/tokens.wxss` + app.wxss `@import`，硬编码色值清零 `d85ead6`
- [x] fig-kiwi 自研解码器全量走通（`scripts/fig2json.py`），token 按 "CQ Talent Contract Tokens" 变量集精确校准 `33d8044`
- [x] 画板规格导出器 `scripts/fig_export_frame.py`（任意画板 → 实现级规格 md）

### 批次 4：家长提醒中心（首个 BFF 切片 + 页面）
- [x] BFF：`GET .../parent/reminders`（guardian 作用域）`7a1da3d`
- [x] 契约回写 spec "Scenario: Parent Reminders Feed" `187638c`
- [x] P3 提醒中心页面端到端 `c4b0d4f`

### 批次 5：铃铛入口修复 + P7.1 / P8
- [x] 日程页提醒入口按 Figma P1 改为铃铛图标 + 未读红点（app-header 扩展 actionIcon/actionDot/actionPill）`2ca11d4`
- [x] P7.1 课时与保障（真实数据：日历推导 + home BFF）`2ca11d4`
- [x] P8 内容中心（静态设计内容）`2ca11d4`

### 批次 6：P8 快速入口三页
- [x] P8.2 帮助中心（可展开 FAQ，答案基于真实功能）`4633fd7`
- [x] Coach Team 教练团队 `4633fd7`
- [x] Venues 场地信息（筛选 chips 真实过滤）`4633fd7`

### 批次 7：私教约课 + 日期活动列表
- [x] 契约 "Scenario: Parent Private Lesson Request" 入 spec `dec757c`
- [x] 私教申请 BFF（POST 201 + GET 列表，guardian 作用域，契约测试 5 断言组）`dec757c`
- [x] P9 私教预约表单（教练/日期/时段/目标/备注 → 真实 POST）`dec757c`
- [x] P9.1 预约成功页（摘要卡 + 返回动作）`dec757c`
- [x] P1.1 日期活动列表（日程页"列表 ›"入口）`dec757c`
- 注意：私教申请存储为进程内集合，~~SQLite 持久化是已声明的后续项~~ ✅ 批次 12 已落 SQLite

### 批次 8：教练端球队/雷达/能力/活动变更
- [x] 契约 "Scenario: Coach Team & Ability BFF" 入 spec（4 端点）`bd0c9f6`
- [x] C9 队伍详情 BFF `GET /coach/team`（近 30 天作用域聚合：成员/训练场次/出勤率）`bd0c9f6`
- [x] C13 学员雷达 BFF `GET /coach/students/:id/radar`（教练作用域校验）`bd0c9f6`
- [x] C14 团队能力 BFF `GET /coach/team/ability-overview`（维度 队均/TOP/底 + 综合 + 趋势）`bd0c9f6`
- [x] C3 活动变更 BFF `POST /coach/events/:id/change-requests`（201，教练作用域）`bd0c9f6`
- [x] C9 队伍详情页（深色 Hero + 三统计 + 学员网格，点学员进雷达）`bd0c9f6`
- [x] C13 学员雷达页（学员 chips + 深色雷达 Hero + 综合分）`bd0c9f6`
- [x] C14 团队能力页（队均雷达 + 趋势 chip + 维度统计表）`bd0c9f6`
- [x] C3 变更活动页（信息卡 + 原因 chips + 新时间/场地/备注 → 真实 POST）`bd0c9f6`
- 入口：coach/me 三条快捷链接；coach/event 操作格新增"变更活动"
- 验证：api 61 测试全过；dev API 实测两 GET 端点返回真实数据（28 名学员/综合 80）
- 注意：变更申请为进程内集合（同私教申请，持久化是已声明后续项）；作用域窗口为近 30 天

### 批次 9：训练内容选择 / 覆盖面 / 测评任务与录入
- [x] 契约 "Scenario: Coach Training Coverage & Assessment Tasks" 入 spec `9ca68c3`
- [x] BFF `GET /coach/training-coverage`（每学员×维度覆盖+最新得分）+ `GET /coach/assessment-tasks`（新 assessmentTasks 实体+种子 2 条，状态推导）`9ca68c3`
- [x] C10 `pages/coach/content-select/`（搜索+分类 tabs+多选卡片+已选栏，带 eventId 时直接 PUT 到活动）`9ca68c3`
- [x] C10.1 `pages/coach/coverage/`（学员×维度进度条 + 覆盖 X/Y）`9ca68c3`
- [x] C11 `pages/coach/test-tasks/`（全部/未完成/已完成 筛选 + 进度条）`9ca68c3`
- [x] C15 `pages/coach/assessment-entry/`（维度 tabs + 学员滑杆 + 草稿 + 逐学员提交复用 POST /coach/assessments）`9ca68c3`
- [x] C15.1 `pages/coach/assessment-submit/`（成功态+摘要卡，查看结果→团队能力）`9ca68c3`
- [x] 入口：训练页"分类选择 ›"、coach/me"测评任务"；C10 顶栏"覆盖预览" `9ca68c3`
- [x] 契约测试：coverage 200+家长 403、任务状态推导（in_progress/not_started）→ api 62 全绿
- [x] dev API 重启实测：任务 1/28 进行中、覆盖面学员维度明细返回正常
- 注意：测评任务完成度按"窗口内有任一测评记录"判定（v1 简化，未按模板指标逐一比对）

### 批次 10：账号绑定 + 教练设置四页
- [x] P10 `pages/parent/binding/`：绑定学员列表（getParentChildren 真数据）+ 切换学员（写入 activeStudentId）+ 微信绑定/家庭成员区 `5416051`
- [x] C16.1 `pages/coach/permissions/`：权限只读开关列表 + 说明卡 `5416051`
- [x] C16.2 `pages/coach/private-interest/`：接受预约总开关 + 周×时段格子（本机存储持久化）`5416051`
- [x] C16.3 `pages/coach/account/`：资料卡（getCoachHome 真数据）+ 手机号行 + 退出登录（clearSession + reLaunch）`5416051`
- [x] C16.4 `pages/coach/help/`：搜索 + 6 主题网格 + 展开答案 `5416051`
- [x] 入口：parent/child"账号绑定"；coach/me 新增 4 行（权限/私教兴趣/账号/帮助）`5416051`
- [x] 全量 `pnpm check` 绿（62 api + 18 domain + 7 小程序测试；三项目 typecheck）
- 注意：C16.1 权限与 C16.2 时段为前端展示/本机存储（无后端实体，已在页面标注"管理员分配/保存在本机"）

### 批次 11：教练端 6 子状态页
- [x] C4.1 `pages/coach/attendance-success/`：绿勾成功页（课程/日期/场地摘要）；点名提交后 redirectTo 带人数 `852e135`
- [x] C4.2 出勤修改：attendance 页 `mode=correction`（橙色异议警示卡 + 异常计数 + 重新提交走同一保存链路）`852e135`
- [x] C5.1 `pages/coach/lesson-correction/`：警示头 + 学员步进器（±0.5课时）+ 原因 + 逐学员 correctCoachLesson `852e135`
- [x] C6.1 `pages/coach/match-event-add/`：事件类型 chips + 球员 + 分钟，eventChannel 回传比赛页 `852e135`
- [x] C6.2 保存态：比赛保存后按钮闪显"已保存 ✓" `852e135`
- [x] C12.1 自动保存态：assessment-entry 滑杆变更即自动存草稿 + "保存草稿"弹层（继续录入/退出）`852e135`
- [x] 入口：lesson 页"课时更正"、match 页"按设计稿添加"；全量 check 绿
- 注意：异议/纠错目前无独立后端实体——异议学员按缺席/请假状态推导，更正直接写课时台账

### 批次 12：SQLite 持久化 + 家长端内容四切片真 BFF
- [x] `db/migrations/0007_request_collections.sql`：private_lesson_requests + event_change_requests 两表 `bcb382a`
- [x] PersistentApiStore 覆盖 list/create；persistence.test 新增"重开库恢复"用例（63→64）`bcb382a`
- [x] 契约 "Parent Content Slices" 入 spec（4 端点）`bcb382a`
- [x] 种子层 contentArticles(4)/contentFaqs(5)/venues(3, 含坐标) 三集合 `bcb382a`
- [x] BFF：`content/articles`、`content/faqs`、`venues`（monthlyCount=近30天活动聚合）、`coach-team`（真实教练/队伍）`bcb382a`
- [x] 小程序 4 静态切片换真 BFF：content/help/venues/coaches；场地"导航"接 wx.openLocation `bcb382a`
- [x] dev API 重启实测 4 端点返回真实种子数据；全量 check 绿（89 测试）
- 注意：测评任务仍为种子集合（俱乐部配置类，无需运行时持久化）

### 批次 13：家长端契约版视觉重做（8 画板）
- [x] 规格归档 `docs/design/specifications/batches/design-spec-batch13-*.md`（8 张）`36a5072`
- [x] P1 schedule：白顶导 + 深色下一场 hero + 周/今日统计 + pending chips + 色条活动卡 `36a5072`
- [x] P2/P2.1/P2.2 event：按类型 nav、深色 hero、比赛记分牌、底部出席状态钮 `36a5072`
- [x] P4 growth：深色球员 hero + 成长足迹卡（雷达/指标功能区保留）`36a5072`
- [x] P5 新建 pages/parent/radar 独立雷达页（44 路由；学员切换 + 综合评分 + 维度条含同龄游标）`36a5072`
- [x] P6 metric：深色 hero 大分值 + 真实记录 CSS 散点趋势图 `36a5072`
- [x] P7 child：深色球员卡 + 统计行 + 2x2 快捷操作（日程/成长/私教/绑定）`36a5072`
- [x] 全量 check 绿（89 测试）

### 批次 14：教练端契约版视觉重做（9 画板）
- [x] 规格归档 `docs/design/specifications/batches/design-spec-batch14-*.md`（9 张；C7 原画板节点缺失按统一教练 nav 模式处理；C12 用 "C12 Project Score Entry"）`9ca6d33`
- [x] C1 schedule：白顶导+红头像、7 日 strip（选中红）、统计 pills、色条活动卡 `9ca6d33`
- [x] C2 event：nav 结束动作、深色 session hero（真实已进行计时器 + 出席 chips）、出勤卡（名单圆点）`9ca6d33`
- [x] C4 attendance：粉底 nav+提交、深色 hero 出勤/缺勤/待确认圆点计数、全员到场/清空 `9ca6d33`
- [x] C5 lesson：粉底 nav、深色活动头（时长）、学员课时记录卡（销课 chip，更正流保留）`9ca6d33`
- [x] C6 match：粉底 nav、深色记分牌 hero（队伍+比分+半场 chips+战术板链）`9ca6d33`
- [x] C7 tactical-board：白 nav + 保存状态 chip `9ca6d33`
- [x] C8 training：白 nav + 深色 2x2 统计 hero（真实计数）`9ca6d33`
- [x] C12 test-entry：粉底 nav+提交（深色任务头与进度条保留）`9ca6d33`
- [x] C16 me：粉底 TopBar+设置、深色资料 hero（负责队伍数 chip）`9ca6d33`
- [x] 全量 check 绿（89 测试）

## 未完成

### 家长端 · 完全没做
（全部 28 画板均有对应页面：10 原始设计 + 5 契约版待重做 + 其余由契约版覆盖）

### 家长端 · 契约版待按原始设计重做（6 页）
- [x] **P1 Schedule Home** —— ✅ 批次 13（白色顶导 22px+铃铛红点 / 深色 hero 下一场 / pending chips / 色条活动卡）`36a5072`
- [x] **P2 / P2.1 / P2.2** —— ✅ 批次 13（按类型 nav + 深色 hero + 比赛记分牌 + 底部出席状态钮）`36a5072`
- [x] **P4 Growth Home** —— ✅ 批次 13（深色球员 hero + 成长足迹卡 + 雷达入口）`36a5072`
- [x] **P6 Metric Detail** —— ✅ 批次 13（深色 hero 大分值 + 趋势 chip + 真实记录散点图）`36a5072`
- [x] **P7 Parent Profile Hub** —— ✅ 批次 13（深色球员卡 + 统计行 + 2x2 快捷操作）`36a5072`
- [x] **P5 Ability Radar** —— ✅ 批次 13（新建独立页 pages/parent/radar：学员 chips + 深色雷达 hero + 综合评分 + 维度条）`36a5072`

### 家长端 · 数据待后端切片（静态内容替换）
- [x] 内容中心文章列表 / 帮助中心 FAQ / 场地列表（含坐标）/ 教练档案 —— ✅ 批次 12 全部换真 BFF
- [x] 场地导航按钮 → wx.openLocation —— ✅ 批次 12
- [ ] 3 处搜索（内容/帮助/场地）toast 占位 → 真实搜索

### 教练端 · 完全没做
（C3/C9/C10/C10.1/C11/C13/C14/C15/C15.1/C16.1-4 均已落地；剩余为契约版重做与子状态页）

### 教练端 · 子状态页
- [x] C4.1 点名成功 / C4.2 家长异议出勤修改 / C5.1 课时更正 / C6.1 添加比赛事件 / C6.2 保存态 / C12.1 自动保存态 —— ✅ 批次 11 全部落地

### 教练端 · 契约版待按原始设计重做（9 页）
- [ ] C1 / C2 / C4 / C5 / C6 / C7 / C8 / C12 / C16 全部现为契约版

### 其他
- [x] **私教/变更申请 SQLite 持久化** —— ✅ 批次 12（0007 migration + PersistentApiStore 覆盖 + 重开库恢复测试）
- [ ] 交接包 WPS 草稿（642 行，1 个 201 vs 400 失败测试）未合入
- [ ] Trellis 任务 `07-30-figma-design-foundation` 未收官

## 建议推进顺序（2026-07-30 定）
1. ~~P1.1 + P9/P9.1 + 私教 BFF~~ ✅ 批次 7 完成
2. ~~教练端 C3/C9/C13/C14~~ ✅ 批次 8 完成
3. ~~教练端 C10/C11/C15（训练内容 + 测评任务/录入）~~ ✅ 批次 9 完成
4. ~~P10 账号绑定 + C16.1~C16.4~~ ✅ 批次 10 完成
5. ~~教练端 6 子状态页~~ ✅ 批次 11 完成
6. ~~私教/变更申请 SQLite 持久化 + 4 个静态切片换真 BFF~~ ✅ 批次 12 完成
7. 家长端 5 页 + 教练端 9 页契约版按原始设计重做 —— 视觉升级，放最后

## 工作方法（每批固定流程）
1. `fig_export_frame.py` 导出目标画板规格 → 归档 `docs/design/specifications/`
2. 需要新数据 → 契约先入 `.trellis/spec/api/backend/app-client-bff-contracts.md` 再实现 BFF
3. 页面复用 app-header / role-tabbar / status-view + token 变量
4. `pnpm check` + `pnpm build` 全绿后小步提交推送
5. 更新本文档

## 环境备忘
- 改完 `apps/api` 必须 `pnpm build` + 重启 localhost:3000 的 `node apps/api/dist/index.js`，否则小程序打到旧 dist 报 404

## 2026-08-02 交接续作记录

### 历史对话结论

- G2 原稿是家长专属“绑定孩子”画板，不是教练通用登录页；资料中没有独立的 Coach Login 画板。
- 授权前客户端不能可靠知道角色，因此登录页采用角色中性的“身份验证”；微信手机号授权和服务端档案匹配成功后，`parent` 进入家长日程/绑定流程，`coach` 进入教练日程。
- 旧登录实现的主要问题是顶端安全区过大、验证码行与操作控件重叠、微信授权动作重复，以及在角色未知时显示家长语义。当前代码已删除验证码伪流程并保留单一真实手机号授权入口。

### 当前未完成项

- `apps/miniprogram-cq-talent/pages/login/` 已按 G2 v2 规格调整；本次续作进一步修正顶部 88px 包络，并在微信登录凭证加载期间禁用授权按钮。尚未取得可信的 `375x812` DevTools 截图。
- 在线 Figma 更新未完成：前一轮 Hermes CLI 调用在进入 MCP 操作前因 provider HTTP 502 失败。不能将本地 `.fig` 或在线文件写入视为已完成。
- Trellis 任务 `.trellis/tasks/07-30-figma-design-foundation` 仍为 `in_progress`，当前工作树有 64 项未提交改动，不能直接收官或清理其它批次。

### 最新验证事实

- 上一轮小程序 typecheck 通过；本次登录几何 patch 后需重跑。
- 全仓 check/test 最近失败于两个 API fixture：`apps/api/test/server.test.ts:688` 期望 `not_started`、实际 `in_progress`；`apps/api/test/server.test.ts:1344` 期望固定数据能力预览记录、实际返回更大/不同记录集。它们与本次登录页改动无直接关系，但在修复或隔离前不得报告全仓通过。
- P3 提醒、活动详情参与人映射、P1/P2/P3 及相关视觉批次的代码改动仍在当前工作树中，后续应按批次逐项复核，不要回滚用户已有改动。
- curl 访问 localhost 需 `--noproxy '*'`（本机 Clash 代理）
- fig 工具链：先运行 `Python313/python.exe scripts/fig2json.py <设计.fig> <decoded-fig.json>`，再运行 `python scripts/fig_export_frame.py <decoded-fig.json> "<画板名>" <输出.md>`。Token 报告使用 `python scripts/fig_extract_tokens.py <设计.fig> <decoded-fig.json> [report.md]`。

### 2026-08-02 P1 无日程 Hero 保留

- 家长日程页在 `state === "ready"` 且选中日期无活动时保留固定 Hero；空态不伪造活动字段，也不绑定点击事件；下方 `p1-empty-list` 保留。
- 在线 Figma P1 节点 `93:83` 已核对成功态结构（Hero → 日期周条 → 标签 → 列表）；当前文件没有明确的 Empty Hero 画板，因此代码空态是保守补全，不能当作已由 Figma 定义。在线 Figma 后续应补同尺寸 Empty Hero 状态。
- Luna 实现后经 Terra 复审：目标测试 `5/5`、小程序包测试 `4 files / 17 tests`、typecheck、`git diff --check` 通过。尚未取得微信开发者工具或真机 `375x812` 有活动/无活动截图，视觉验收仍待完成。

### 2026-08-02 P1 响应式标签与 Figma 状态同步

- 家长日程页 chips 已完成最小响应式修正：容器允许换行，chip 不再裁切、省略或强制单行；动态红色日期 chip 使用自适应宽度，绿色/黄色统计 chip 保留原定 `182rpx` / `124rpx` 几何。
- 在线 Figma 文件 `ATlfBRO0ruOCDDY5ICagFD` 中已观察到 `93:83`、`241:166` 与 `241:412` 状态根 Frame；`241:412` 根 Frame 为 `375×812`，并仅观察到部分 Empty Hero（`343×180`，代码对应 `686rpx×360rpx`）。虚线空列表的关键在线规格、bounds 与样式未能可靠读取；完整 Empty 未验收，也未据此更新。
- 当前验证：目标测试 `6/6`、小程序包测试 `4 files / 18 tests`、typecheck 通过；WXML 禁用 JS 方法扫描干净；`git diff --check` 无空白错误，仅有工作树既有 LF→CRLF 提示。
- 视觉证据分层：在线 Figma 已读取 `93:83`、`241:166`，并仅观察 `241:412` 的根 Frame 与部分 Hero；未取得可复核的完整 Empty 截图或虚线空列表规格。尚未取得微信开发者工具或真机 `375x812` 截图，因此小程序运行态视觉验收仍未完成，不能宣称与 Figma 完全一致。

### 2026-08-03 P1 Hero 与提醒图标在线同步

- 在线 Figma 实测并复读：成功态 `93:83` 与 `241:166` 的 `Hero Card > hero-stats` 均为相对 Hero `X=16, Y=137, W=311, H=31`；Hero 为 `343×180`，底部留白 `12px`。此前历史规格中的 `Y=147` / `2px` 底距已过时；`241:412` Empty 未改动。
- 小程序成功态与空态均使用 `.hero__stats { top: 274rpx; }` / `.hero__stats--empty { top: 274rpx; }`，与在线成功态 `Y=137px` 对齐。提醒入口保留真实 `menuInset`、`navActionTop` 与 `openReminders`，不引入未验证 SVG；CSS 铃铛使用 `64rpx` 点击区、约 `18×20px` 视觉轮廓和带白描边的红点。
- Terra 复核后，P1 单测 `8/8`、小程序包测试 `6 files / 26 tests`、typecheck、WXML 禁用 JS 方法扫描与 `git diff --check` 通过。未改 API、session、角色或数据契约；真实 parent/API 的 DevTools 或真机 `375×812` 成功态与空态截图仍待验，不能宣称小程序运行态视觉完成。

### 2026-08-03 P1 在线 Figma 状态画板排布修正

- 已整理在线 Figma P1 三个独立状态画板的画布排布：`93:83` 保持 `(1370,120)`，`241:166` 移至 `(1785,120)`，`241:412` 移至 `(2200,120)`；三者均为 `375×812` 根 Frame，间距 `40px`。
- 本批仅移动根 Frame，未修改任何子层、尺寸、内容、样式、本地代码或 Git；Terra 复核通过。该结果不替代 DevTools/真机 `375×812` 小程序运行态视觉验收。
- 微信开发者工具/真机 `375×812` 视觉验收待完成，不能据此宣称运行态视觉通过。

### 2026-08-03 P1 Empty 在线设计源尝试（A）

- 本轮未修改在线 Figma `241:412`。虽读取到根 Frame 与部分 Content/Hero 参数，但虚线空列表的关键在线 metadata、bounds 与样式无法可靠取得；完整 Empty 状态仍阻塞。
- 待获得可复核的在线 metadata 或完整截图后，另行独立实施；本记录不表示 Empty 设计源或小程序运行态视觉已完成。

### 2026-08-03 Role TabBar Parent 专属隔离（B）

- 仅修改 `components/role-tabbar/` 的三个组件文件：根节点输出 Parent/Coach modifier；移除无角色限定的 active 粉色图标底和红点泄漏。Parent active 使用 `#A80F1B` 与 `4×4rpx` 红点、无粉底；Coach 明确无红点；图标尺寸按 Figma 契约为 `44×44rpx`。
- 组件测试 `5/5`、小程序包测试 `6 files / 27 tests`、typecheck、WXML 禁用 JS 方法扫描与 `git diff --check` 均通过。路由、PNG 映射、API、session、授权及角色业务逻辑未改。
- 真实 Parent/Coach `375×812` DevTools/真机截图矩阵仍待补，不能宣称运行态视觉完成。

### 2026-08-03 P1 TabBar 几何与统计胶囊单行修复（C）

- 已直接读取在线 Figma 文件 `ATlfBRO0ruOCDDY5ICagFD` 的 `P1 Schedule Home` 节点 `93:83`。其中 `TabIconsOverlay` 为 `375×70`，每个 tab 为 `125×56`；图标 `22×22` 位于 tab 顶部 `6px`，标签位于 `Y=31px`，Parent active 红点为 `4×4`、`Y=48px`。在线设计未修改。
- 根因：现有 `role-tabbar` 让 tab 内容在带安全区 padding 的可用高度中垂直居中，没有按 Figma 的 `56px` tab 几何定位，导致图标贴近上边框；固定定位后，父层安全区 padding 又会把标签下半部分裁掉。现保持 `140rpx`（70px）外框不变，TabBar 自身不再承载安全区 padding，内容 tab 固定 `112rpx`、顶部 `12rpx`、图标 `44×44rpx`、标签间距 `6rpx`、红点固定在 `96rpx`；页面内容区继续保留底部安全留白。不改路由、PNG 图标映射、API、session 或角色逻辑。
- P1 日期统计 chips 改为固定 `54rpx` 高、单行居中、禁止收缩和换行；动态红色日期 chip 仍为自适应宽度，绿色/黄色 chip 仍为 `182rpx` / `124rpx`。该修复针对用户截图中“待处理 0”分行的问题。
- 验证：目标测试 `57/57`、小程序包完整测试 `7 files / 57 tests`、`pnpm --filter @football-club/miniprogram-cq-talent typecheck`、`git diff --check` 均通过。该历史记录当时尚未取得修复后的可信 DevTools 或真机 `375×812` 原始截图；后续截图证据见下节。

### 2026-08-03 P1 成功态运行截图取证（D）

- 已重新读取在线 Figma 文件 `ATlfBRO0ruOCDDY5ICagFD` 的 `P1 Schedule Home` 成功态节点 `93:83`。本条只记录成功态；`P1 Schedule Home — Empty` 仍没有完整、可复核的运行态视觉验收。
- 已取得微信开发者工具前台 iPhone X 模拟器的家长日程成功态 `375×812` PNG：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-p1-375x812-current-20260803.png`。截图确认“`2节`”保持单行，且“日程”标题与右上角提醒图标的视觉中心对齐。
- 同一工作区复核：小程序测试 `7 files / 59 tests` 通过，`pnpm --filter @football-club/miniprogram-cq-talent typecheck` 通过。该结论仅覆盖 P1 相关小程序检查，不能写成全仓 `pnpm check` 已通过。
- 全仓质量仍有两项必须单独复现并准确记录的 API fixture 差异：`apps/api/test/server.test.ts:688` 期望 `not_started`、实际 `in_progress`；`apps/api/test/server.test.ts:1344` 的数据能力预览记录断言不一致。未复现并处理前，不得笼统称为“既有失败”或全仓检查通过。

### 2026-08-04 DevTools Automator 截图工具重做

- 旧原型直接发送 DevTools RPC 且要求原始 PNG 必须为 `375×812`，会把真实 iPhone X 会话的 `563×1218` 等比导出误判为失败。新实现仅使用 `miniprogram-automator@0.12.1`，并将 Windows `.bat` 启动、端口等待、截图、同路由复核和 `systemInfo` 读取拆成可测试的最小链路。
- 证据定义改为：SDK `systemInfo` 必须证明逻辑视口为 `375×812`；PNG 保留原始像素且必须为等比完整导出；sidecar 同时记录 `devicePixelRatio` 与实际导出倍率。不能用微信运行时 `pixelRatio` 反推截图 PNG 像素。
- 静态验证：目标回归 `10/10`、小程序完整测试 `7 files / 40 tests`、`pnpm --filter @football-club/miniprogram-cq-talent typecheck`、`git diff --check` 已通过。未改页面、Figma、API、session、授权或角色逻辑。
- 运行态边界：2026-08-04 已实际连接到自动化端口并读取 `pages/parent/schedule/index` 及 iPhone X `375×812` 系统信息；调试中的超时使当前 DevTools 自动化窗口无法重新初始化，故新命令尚未生成可提交的最终 PNG。完全退出并重新打开 DevTools、真实授权并重新取图后，才能进行 P1 截图对照；在此之前不得宣称视觉验收通过。

### 2026-08-04 DevTools 截图通道兼容性复现

- 在 DevTools 完全重启、真实微信授权并回到 `pages/parent/schedule/index` 后，官方 Automator 协议日志证明当前桌面版本 `2.01.2510290` / 基础库 `3.17.0` 正常回复版本、当前路由和路由栈；唯一未响应的调用是 SDK 内部的 `MiniProgram.screenshot()`，脚本在 30 秒保护期后退出。
- 取证脚本没有发布 PNG 或 sidecar，因而没有把失败、黑屏或桌面截图误标成 P1 视觉证据。此结论仅说明当前 DevTools 的截图通道与官方 SDK 的组合不可用；不影响已经通过的静态/类型/单测结论，也不代表 P1 已完成运行态 Figma 验收。
- 后续动作：先完整退出所有 DevTools 进程，再由 `cli auto --auto-port` 建立一个实际监听的新自动化端口后，以相同的 `devtools:screenshot` 命令重新验证。2026-08-04 只关闭/重开项目窗口时，主进程仍自 10:24 存活、旧端口 `9421` 仍自 10:25 被占用；请求 `9422` 只创建新的渲染进程而未监听该端口。若全新自动化端口仍无响应，再判断 DevTools/Automator 兼容性。SDK 收到 PNG 后，才按在线 Figma `93:83` 做 P1 成功态逐像素/布局对照；当前不要继续通过更改页面样式、登录、API 或角色逻辑来猜测性“修复截图”。

### 2026-08-05 Windows DevTools 模拟器截图工具

- 已新增 `apps/miniprogram-cq-talent/scripts/devtools-simulator-capture.py`，并接入 `scripts/devtools-screenshot.mjs`。Windows 上，Automator 继续只读校验路由、路由栈和逻辑 `375×812` 视口；当且仅当这些校验通过后，Python 用 `PrintWindow(PW_RENDERFULLCONTENT)` 离屏获取唯一可见的“××的模拟器”窗口，并根据 DPI 与 iPhone X 刘海裁出完整逻辑画布。
- 真实验证：当前路由为 `/pages/parent/schedule/index`，逻辑视口 `375×812`，输出原始 PNG 为 `563×1218`；模拟器窗口为“重庆天才俱乐部的模拟器”，裁剪参数为 `x=11, y=93, width=563, height=1218`。截图已人工检查为完整家长日程画面，不是黑屏或普通桌面截图。
- 回归测试覆盖 Windows 选择窗口路径、SDK 截图超时不发布证据、错误标题拒绝和 ASCII-safe 元数据；Windows 之外仍使用官方 SDK 的截图路径。后续可直接运行 `pnpm --filter @football-club/miniprogram-cq-talent devtools:screenshot -- --output <仓库外绝对路径>.png --expect-route-prefix /pages/parent/ --port 9421` 获取同类证据。
- 约束：仅允许一个可见模拟器窗口；多个窗口时设 `WECHAT_DEVTOOLS_SIMULATOR_TITLE`。无论窗口捕获、路由复核、视口验证或 PNG 尺寸验证中的哪一步失败，最终 PNG 与 sidecar 均不得发布。此工具只解决可信取证通道，不代替将截图与当前在线 Figma 节点逐页对照的视觉验收。

## 2026-08-09 全页级 Figma↔实页巡检（17页）+ 4 项修复
- 巡检方法：miniProgram.screenshot 直出 375x812（免窗口遮挡），17 页首屏+滚动下半部全采，vision 逐页缺陷扫描后对照 design-spec 确认
- 修复1（c05e82f）：比赛英雄卡——比分槽渲染「比赛结束后更新」长文案在 96rpx 字号下换行溢出卡片（440rpx 固定高）；时间地点 `<br>` 不生效粘连。修为 scoreText 非比分格式回落 "0 : 0"（对齐设计未开始态）+ dateText 只保留「日期+开始时间」+ 时间地点改双 view 纵排
- 修复2（同 commit）：训练英雄卡时间行对齐设计「09:00-10:30 · 6月28日」（时间段在前），消除 API 字段「日期 时间 · 时间~时间」重复
- 修复3（同 commit）：提醒中心空态双渲染（status-view + 自定义图标块）→ 只留设计规格的图标版
- 修复4（bda7b3b）：雷达页维度列表泄漏第9行「射门综合评分 3」（遗留 metric-finishing 不在核心雷达视图）→ 按 growth.views[0]（核心能力雷达8维）过滤，综合评分 68→76 回归8维口径；与 growth 页 radarForView 同款逻辑
- 非缺陷确认：content 文章卡左侧色条=设计原样；coaches 滚动中内容经过固定 tab 栏下方=正常；growth 芯片/日程banner标题省略号=设计防溢出；雷达图在 mp.screenshot 中不显示=canvas 采集限制（dxcam 验证正常）
- 证据：cq-talent-visual-evidence/audit-*.png（17页+滚动）、fix-event-match2.png、fix-event-training.png、fix-reminders.png、fix-radar-scoped.png

## 2026-08-09 成长页雷达预览真实数据化（2 commits）
- 1fe9d8b feat：雷达预览卡从静态装饰图形（固定六边形+假多边形）改为真实数据渲染——TS 计算 N 边形顶点百分比注入内联 clip-path；副标题「6维度」改真实维数「8维度」
- e4294d0 fix：补回网格环/基准多边形/维度标签，对齐点进去的详情页观感。关键教训：**clip-path 下 border 不绘制**（纯描边元素整体消失），轮廓线一律用「外多边形实心底+内缩盖面」双层叠加模拟
- 验收：fix-growth-realradar3.png 4/4 通过（4圈网格环✓ 8轴线✓ 红色描边多边形+外部网格可见✓ 8标签无重叠✓）；门禁 typecheck+51 tests 全绿

## 2026-08-10 Figma 全页实现：家长 P7 / P7.1 / 服务页收口

- 设计权威：`zZ6wKyOHKcO4UYXDd9jGwv`。本轮完成并独立提交 P7 孩子档案、P7.1 训练与保障、P8 内容中心、Venues、P8.2 帮助中心、Coach Team；对应任务记录均已归档。
- P7/P7.1（`f05fff8`）：孩子档案仅显示真实课时状态及孩子日程；训练记录仅计入明确关联当前孩子的训练；未知保险为“待同步”。`student-home` 请求错误进入页面 error state，不再回退到虚构课时或保险数据。
- 服务页（`b783782`、`ebb5f52`、`ac97d4c`、`8da7ff0`）：文章、场馆、FAQ 与教练团队都只展示已有 API 契约的字段；搜索、文章详情、客服、电话、虚假地图导航、默认球队名、合成角色/目标与直接联系均不伪装为可用。
- 验证：最后一次全仓门禁通过——领域 18、API 68、小程序 98 测试；类型检查通过。门禁首次运行曾出现 `apps/api/test/persistence.test.ts:13` 单条 5 秒超时，单独复现 9/9 通过，随后完整门禁重试通过；该现象须在后续稳定性工作中单独跟踪，不能归因于本轮页面改动。
- 当前全页实现目标已继续进入下一批（P9/P9.1）；项目总体已豁免真实设备截图作为阻塞条件，但本轮没有新增运行态视觉验收结论。

## 2026-08-10 C10.1 教练覆盖预览

- 在线 Figma 唯一基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:983 / C10.1 Coverage Preview`；新增教练覆盖预览页，采用本地粉色顶栏和教练训练 Tab。
- 页面仅在真实 coach 会话下读取 `GET /coach/training-coverage`；无 coach 角色不发请求。学员、维度、覆盖数和分数均来自真实响应；`scorePercent: null` 显示“待同步”，`0` 保持真实零值。
- Figma 底部确认示例没有写入契约，因此未实现伪确认、伪保存或硬编码覆盖数量；请求陈旧保护、空态、错误态和重试均有覆盖。
- 验证：focused Vitest 5/5、Mini Program typecheck、Trellis task validate、diff check 均通过；本批未进行真机/DevTools 截图验收。
- 代码提交：`01ea5f4 feat: align coach coverage preview with C10.1`。任务归档与会话日志待后续独立提交。

## 2026-08-10 Test-Metric SQLite Persistence and Parent Readback

- Code commit: `269611c feat(api): persist assessment metrics across restarts`. Assessment, raw-result, score, metric-record, and metric-lineage rows now persist in one SQLite transaction; seed replay inserts missing records without replacing saved assessment data.
- The restart merge now hydrates persisted assessment IDs before the in-memory ID counters initialize. A second assessment POST after reopen stays a distinct `201` instead of reusing an ID and returning `400`; no idempotency contract was added.
- Fresh controlled HTTP proof used a SQLite database outside the repository. PID `43400` returned health `200` and coach assessment POST `201`; only that PID was stopped. PID `43908` reopened the same database and returned parent `growth-summary` `200` plus `ability-metrics/metric-finishing` `200` with the non-seed `assessment-2` / `assessment-raw-result-1` / `metric-finishing` relation and `metric-lineage-1`, with no duplicate relation.
- Checks: API focused Vitest `59/59`, API typecheck/build, mini-program Vitest `262/262`, mini-program typecheck, and scoped `git diff --check` all passed. This batch makes no new P5/radar visual-acceptance claim.

## 2026-08-10 Coach Attendance Persistence Archived

- Implementation commit `6526fe4` persists attendance status and note in SQLite without changing the attendance API contract, authorization, idempotency conflict handling, or the present/late lesson-debit rule.
- Evidence separates local and production: local file-backed `dist` restart preserved a non-empty note and status with exactly one participant record; the recorded production marker-note PUT survived one `cq-talent-api` container restart on the same named SQLite volume and was then restored.
- Fresh review confirms no uncommitted attendance-task files. C4 real-coach `375x812` screenshot evidence remains absent and is explicitly not reported as complete; under the current project goal it is nonblocking for this persistence-task archive.

## 2026-08-11 Acceptance Identity Runtime Binding Repair

- Root cause: the fixed dual-role acceptance seed used a deterministic synthetic fixture phone on each restart, while real WeChat login resolves the currently authorized phone. The database therefore returned `binding_required` even though the intended user and membership were active.
- Commit `d472307` adds private runtime override `FCM_CQ_TALENT_ACCEPTANCE_PHONE`; it is applied only to the fixed acceptance user and its matching parent profile. The value is not stored in the repository, test fixtures, deployment notes, or logs.
- Verification: focused fixture regression first failed against the old seed and passed after the fix; full root check passed (domain `19/19`, mini-program `278/278`, API `85/85`).
- Production: a new isolated tracked release was built after a restricted SQLite backup. The API was restarted with the private WeChat runtime credentials and acceptance-phone variable. HTTPS health returned `200`; the acceptance user and parent profile matched the configured phone, and both user and club membership were active with `parent` + `coach` roles. A fresh real WeChat authorization remains the required final device-side confirmation.

## 2026-08-10 Figma 49-State Completion Audit

- The current online authority `zZ6wKyOHKcO4UYXDd9jGwv` was rechecked as 49 business states: Parent 21 and Coach 28. CODE frames, ordinary internal frames, and `93:877 / LEGACY C7` are excluded; C7 uses `233:2 / C7 MVP`.
- Sol's final audit mapped all 49 states to completed implementation/task records and commits. Historical task-parent links that were missing from the audit tree were restored; the active phone-authorization single-flight guard was unlinked because it is a separate functional follow-up, not an unimplemented Figma state.
- Test-stability remediation: the two file-backed SQLite restart integrations now use local `15_000` ms budgets after measured full-suite runtimes exceeded Vitest's 5-second default. Global timeout remains unchanged. Fresh root `check` exited `0`: domain `19/19`, mini-program `262/262`, API `78/78`.
- Completion claim boundary: the 49-state implementation scope is complete. This does not claim pixel-level equality, universal DevTools/device screenshot coverage, or complete runtime visual acceptance.

## 2026-08-10 Parent Schedule Live Date and Calendar Boundary

- Fixed the parent schedule's develop-only historical default: parent schedule and parent day now use the real local device date unless `DEV_PARENT_PAGE_DATE_OVERRIDE` is explicitly set in shared configuration. The override is `null` by default and is unavailable outside develop.
- Parent calendar and parent student schedule now validate date ranges and interpret date-only `to` as the exclusive start of the following UTC day. This includes Sunday daytime activities, excludes the following Monday, rejects malformed/reversed/over-31-day ranges with `400 invalid_date_range`, and retains guardian participant redaction.
- Parent schedule now provides previous/next week controls; each moves the selected date by seven days and reloads the corresponding Monday–Sunday BFF interval. No activities are fabricated for empty weeks.
- Verification: focused API regression passed after a recorded red failure; mini-program date/week tests passed after recorded red failures; API and mini-program type checks passed; root `check` passed with domain `19/19`, mini-program `264/264`, API `79/79`; `git diff --check` passed. No visual or production deployment claim is made by this entry.
- Dual parent/coach role switching remains a separate planning task. Terra review blocked implementation until sessions can survive API restart/multi-instance use and every bearer request revalidates active membership and role availability.

## 2026-08-11 双角色日常切换入口

- 在线 Figma 权威文件 `zZ6wKyOHKcO4UYXDd9jGwv` 已新增 `RoleSwitchEntry` 组件集（`304:14`），并放置到 P7 孩子档案（`93:336`，实例 `305:340`）及 C16 教练“我的”（`93:1182`，实例 `305:430`）。两处均显示“当前身份 / 家长端或教练端 / 切换 ›”。
- 小程序将入口从隐藏账户项提升为日常入口：家长 P7 的孩子卡下、教练 C16 的资料卡下；只有 `availableRoles` 含另一真实角色时显示。切换继续调用后端 role endpoint，保存服务端轮换后的完整 session 后才跳转，单角色账号没有入口。
- 验证：定向 Vitest 54 文件、278 用例通过；小程序 TypeScript 检查通过；`git diff --check` 通过。在线 Figma C16 节点截图已复核。尚未取得本轮小程序 375×812 DevTools/真机截图，故不作运行态视觉验收结论。

## 2026-08-11 家长成长切换与演示历程数据

- 根因修复：成长页从右上角齿轮的学员绑定页返回时，绑定页此前只写入 `activeStudentId` 缓存，未同步内存中的 authenticated session，因此成长页仍按旧学员请求。现改为复用 `setCurrentStudentId`；成长页 `onShow` 检测到 session 学员变更后重新读取该学员的成长、指标和最近 30 天活动，并忽略陈旧异步响应。
- 训练历程页改为使用真实本地日期和 API 支持的最近 30 个自然日，不再在开发环境请求历史锚点和超过 API 上限的一年范围。
- 在既有双角色验收家庭中新增两次带“演示”标识的已完成训练（控球协调、传接射门）。该家庭现有最近 30 天 3 次已完成训练和 1 场已完成比赛；成长页摘要、最新成长足迹和训练历程文案均从真实日程响应计算，不伪造前端数据。固定 ID 回滚清单、测试期望同步扩展为 6 个演示事件。
- 验证：先记录绑定页回归测试失败，再修复；小程序 Vitest `54 files / 281 tests`、小程序 typecheck、API focused Vitest `9 files / 85 tests`、API typecheck 通过。尚未做本批 375×812 运行态视觉验收。
- 生产发布：提交 `688d1af` 已在受限 SQLite 备份后发布到 `https://cqtc.pomi.tech`。HTTPS health 为 `200`；容器内微信凭据和验收绑定变量均只核验“已配置”，未读取其值；6 条固定演示日程存在，其中 3 条为已完成训练。真机仍需重新编译小程序后自行查看，本文不作视觉验收结论。

## 2026-08-11 P4 成长足迹与训练历程结构复原

- 依据在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:250 / P4 Growth Home`，将错误的两段居中占位文字恢复为两种卡片结构：成长足迹的“更多”入口及三条状态项、训练历程的趋势柱与时间轴。
- 三条状态和八个柱均由当前学员最近 30 天的真实完成训练/比赛及真实雷达数据预计算；无活动只显示“待达成”状态和最小基线，不伪造完成记录。
- 验证：P4 目标回归与完整小程序 Vitest `54 files / 281 tests`、小程序 typecheck、`git diff --check` 通过。本批尚无新的 375×812 真机/DevTools 对照截图。

## 2026-08-11 教练端验收演示数据扩展（已部署）

- 为使教练端 C1–C16 有足够的真实 BFF 数据可检查，opt-in 的重庆天才双角色验收 seed 将演示队从两人扩展为八名既有 synthetic club 学员；新增六人只加入教练队、六条既有演示日程、已完成比赛、能力评测和战术名单，不新增任何家长监护绑定。
- 家长端隐私边界保持不变：真实角色切换后的 `parent/children`、`parent/calendar` 和活动详情参与者仍只投影原两名被监护孩子；教练端战术板可读取完整八人名单。没有新增小程序 mock、伪 API、伪角色或伪 session。
- 回滚收窄为固定 `metric-record-cq-talent-demo-*` 记录，不再按该体验教练删除全部指标，因此同俱乐部的非演示指标和其他俱乐部/客户端记录均保留。
- 验证：先观察到旧两人 seed 使新增 fixture/server 回归按预期失败；最小实现后 API focused Vitest `59/59`、API typecheck、API build 和 `git diff --check` 均通过。生产发布前已将独立 Docker SQLite 数据卷备份到受限目录；提交 `034b51b` 的发布镜像已构建并以单实例方式重启。`https://cqtc.pomi.tech/health` 返回 `200`，只读计数确认线上已有 8 名演示队员、6 个演示事件、48 条参与记录和 64 条能力指标。本条不构成真机视觉验收。

## 2026-08-11 C8 训练管理真实统计与 Figma 收口

- 在线设计权威：`zZ6wKyOHKcO4UYXDd9jGwv / 93:896 / C8 Training`。训练页深色 hero 调整为 180px、20px 内边距、2×2 的 64px 统计卡；Tab 为 48px，列表左右 22px，训练卡最小 114px。页面仍使用现有角色导航与安全区处理。
- 数据契约：`GET /coach/team` 新增 `stats.completedTrainingCount`。它只计算当前教练名下、状态明确为 `completed` 的训练活动；管理员按现有教练端授权范围统计全部已完成训练。原 `trainingCount` 仍是近 30 天窗口，未被误标为累计课时。出勤率、在队人数和本月比赛继续来自各自已有的真实 BFF 响应。
- 演示数据与回归：双角色验收教练名下已有 3 节已完成训练、1 场已完成比赛、后续训练与战术比赛；新增集成回归断言教练会话读取的累计课时为 3。完整门禁通过：领域 19/19、小程序 294/294、API 85/85，全部 typecheck 与 `git diff --check` 通过。
- 生产部署：提交 `dc11b5c` 已在独立 SQLite 卷备份后发布至 `https://cqtc.pomi.tech`；容器重建后内部健康检查和 HTTPS `/health` 均返回 `200`，容器重启计数为 0。本条仍不构成 375×812 运行时视觉验收。

## 2026-08-11 C1/C2 教练日程与工作台第一批收口

- 在线设计基准：C1 `93:578`、C2 `93:606`。C1 保留真实日程/周切换和 Hero，但给时间行中的真实长活动标题补上弹性截断约束，避免挤压时间。
- C2 移除与画板不符的顶部路由 Tab，恢复 Figma 底部 70px 教练导航；深色活动卡调整为 140px 最小高度，三列操作卡为 100px 最小高度，避免动态操作名称造成卡片重叠或溢出。业务接口、活动路由与写入规则未改。
- 验证：C1/C2 聚焦小程序测试 16/16、类型检查和 `git diff --check` 通过。尚未取得本批 375×812 运行时截图，不作视觉验收完成结论。

## 2026-08-11 C3 变更活动表单收口

- 在线设计基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:634 / C3 Activity Change`。真实变更申请流程未变；内容区改为 22px 双侧内边距、12px 白色卡片、44px 日期/场地输入控件与 80px 说明框，继续保留 Figma 的柔和顶栏和底部教练导航。
- 验证：C3 聚焦测试 6/6、全仓门禁通过（领域 19/19、小程序 295/295、API 85/85）、类型检查和 `git diff --check` 通过。截图命令在 49 秒后超时且未产生 PNG，因此 C1/C2/C3 的 375×812 运行时视觉验收仍明确待补。

## 2026-08-11 C7 战术板与完整演示名单

- 在线设计基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 233:2 / C7 MVP`。提交 `eaf8b73` 将 C7 的球场结构收敛为 351×430 的绿色场地、边界线与中线、40px 红色球员圆点、替补席和 48px 双操作按钮；旧的中圈、禁区框、圆点外姓名/位置文字和投影被移除。页面继续只读取真实 tactical-board 响应，保存、拖动、换人、重置及只读规则未改为前端伪状态。
- 演示名单扩展为 16 名确定性的既有 synthetic 学员：11 名首发和 5 名替补，六条既有演示日程各有 16 位真实参与者，指标记录为 128 条；没有增加任何家长监护绑定，家长投影仍保持两名孩子。
- 生产在受限 SQLite 备份后发布 `eaf8b73` 与兼容修复 `55d2036`。线上数据库只读确认 16 名队员、6 个事件、96 条参与、128 条指标；此前已保存的两人战术板不被覆盖，读取时安全补齐缺少的 14 人，用户下一次保存才会写回完整名单。容器无重启，内网与 `https://cqtc.pomi.tech/health` 均为 `200`。
- 验证：先记录旧实现对 16 人 roster 和 C7 几何的失败测试；全仓门禁通过（domain `19/19`、mini-program `293/293`、API `85/85`）且 `git diff --check` 通过。本批尚未取得新的 375×812 真机/DevTools 截图，因此不宣称运行时视觉验收完成。

## 2026-08-11 C4 快速点名真实数据与 Figma 收口

- 在线设计节点：`zZ6wKyOHKcO4UYXDd9jGwv / 93:665 / 93:696 / 93:715`。C4 使用粉色共享顶栏、深色活动摘要、40px 快捷操作、紧凑名单和教练底部导航；C4.1 仅保留课程、日期、出席、时间四项真实回读摘要与单一主操作。C4.2 采用警示卡、逐人更正和底部提交的真实通用更正态，不伪造 Figma 示例中的家长异议、异常人数或全局更正说明。
- 数据契约：`confirmed` / `invited` 属于活动 RSVP，进入 C4 时被规范为 `pending`，因此教练必须选择真实出勤状态后才能写入；写入层仍只接受 `present`、`absent`、`late`、`leave_requested`、`excused`。显式空备注会传到 API，允许真实清除已存备注。
- Opt-in acceptance seed 的完成训练现在有 16 名真实队员：10 到课、2 迟到、2 缺席、1 请假、1 免扣；未来训练的 16 个 RSVP 仍是后端持久化 `confirmed`，供 C4 演示待点名。新增 file-backed SQLite 回归：coach workbench 读到完整分布，真实 PUT 后重新 GET，再关闭和重开数据库后仍读回相同状态与备注。家长投影继续严格只有两名被监护孩子。
- 验证：先记录 RSVP/空备注/状态分布的失败测试，后通过小程序 21 项聚焦测试、API 59 项聚焦测试、两端 typecheck 与 `git diff --check`；提交前完整仓库门禁亦通过：领域 19/19、小程序 297/297、API 85/85。本批尚未取得可信的 C4/C4.1/C4.2 运行时截图，因此不作视觉验收完成结论。

## 2026-08-12 C5 课时确认与更正真实数据收口

- 在线 Figma 唯一基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:734 / C5 Lesson Confirm` 与 `93:765 / C5.1 Lesson Correction`，均为 `375x812`。C5 复用粉色 88px 顶栏、深色活动摘要、紧凑名单、52px 确认按钮和教练 Tab；C5.1 复用警示卡、紧凑可更正名单、真实学员标识和底部保存区。
- 数据边界：C5 继续只调用既有 `GET workbench` + `GET lesson-confirmation`，写入仍为既有 `POST lesson-confirmation`；C5.1 写入仍为既有带幂等键的 `PATCH lesson-confirmation`。角色守卫、BFF 的 coach/event 授权、持久化账本和写后重新读取均未替换。Figma 没有备注/更正原因输入，页面不再渲染它们；服务端原有审计默认值与可选字段契约仍保留，未加入伪造说明。
- 演示数据：opt-in acceptance SQLite 种子已有 16 名教练可见学员及真实课时余额；即将开始的训练可经正常确认 API 产生账本记录，随后可经正常 PATCH 更正。种子为 insert-if-absent，只影响全新验收数据库；本批未重置、迁移或修改任何线上数据库。
- 验证：先记录 C5/C5.1 Figma 结构的失败测试，再通过页面 Vitest 15/15、API lesson/seed 相关回归 59/59、两端 typecheck 和完整仓库门禁：领域 19/19、小程序 300/300、API 85/85；`git diff --check` 通过。尚未取得新的可信 375x812 运行时截图，故不作视觉验收完成结论。

## 2026-08-12 C6 比赛记录、录入事件与本地草稿收口

- 在线 Figma 基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:796 / C6 Match Entry`、`93:827 / C6.1 Add Match Event`、`93:858 / C6.2 Save State`。C6 统一为 16px 页面边距、深色比赛摘要、白色事件卡、红色描边“+ 添加事件”、中性“比赛总览 / 事件记录”分段标签和按真实事件类型预计算的时间线色标；C6.1 收口为能力契约驱动的事件类型、白色表单卡、48px 控件和红色提交按钮。未把 Figma 样例中的换人、其他、半场比分或比赛计时伪造为现有 BFF 不支持的业务能力。
- 可验证数据：重庆天才 opt-in 验收种子中的已完成友谊赛为 `event-cq-talent-demo-match-completed`，16 名真实种子队员、最终比分 `3:2`；事件为第 22 分钟进球和助攻、第 37 分钟黄牌、第 64 分钟扑救。所有事件均引用该场比赛的真实名单成员；现有家长监护投影边界未扩大。
- 安全与持久化边界：生产环境忽略 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`，不会因该变量写入或重置生产数据。C6.1 仍严格要求 API 返回 HTTP `201` 才视为创建成功；事件创建的独立 SQLite 重启回归覆盖首次写入、相同幂等键重放、冲突以及重开后恰好一条记录。C6.2 仍只是设备本地未提交草稿，不冒充服务端自动保存。
- 验证：Terra 审查通过；聚焦 Vitest `41/41` 通过；完整仓库门禁通过（领域 `19/19`、小程序 `303/303`、API `85/85`，两端 TypeScript 均通过）；`git diff --check` 通过。本批未取得新的可信 375x812 运行时截图，因此不宣称 C6 视觉运行时验收已完成。

## 2026-08-12 C12 项目评分录入真实多指标收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1030 / C12 Project Score Entry`。页面从“单一项目、逐人纵向录入”收口为画板的深色 96px 任务摘要、待录入学员卡、最多四列紧凑指标格和固定保存区；教练底部导航与本机草稿恢复弹层仍保留。
- 数据边界：每个学员卡仅投影当前真实评分分组中连续的最多四个字段，标签、输入类型、单位、值、缺测状态、完成数和写入键均来自 `workbench`、`assessment form` 与本机草稿。字段多于四个时，既有真实分组/项目选择仍可访问后续字段；不复用 Figma 样例中的姓名、成绩、截止时间或总分。每个输入框携带自己的真实 `testItemId`，不会误写到当前分组第一项。
- 真实演示数据：opt-in 重庆天才验收种子已有教练可见的 16 名队员、可用评测模板和已持久化能力指标；C12 只为具备真实模板的活动读取并提交成绩，不新增假评测或修改线上数据。
- 验证：先记录 `metricCells` 缺失及输入错误绑定的 RED 失败，再通过 C12 聚焦 Vitest `15/15`、小程序 TypeScript 和完整仓库门禁（领域 `19/19`、小程序 `306/306`、API `85/85`）；`git diff --check` 通过。本批未生成新的可信 375x812 运行时截图，故不作运行态视觉验收完成结论。

## 2026-08-12 C14 团队能力总览重叠修复

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`。此前 C14 深色雷达卡只有 `520rpx`（260px），而画板为 520px；雷达、综合分和空态又处于独立绝对定位，导致用户截图中的文字重叠。现改为画板同等的 `1040rpx` 高卡片、720rpx plot、620rpx×600rpx 雷达区域，以及纵向的雷达/综合分组合。
- 状态边界：有足够真实维度时才渲染雷达、综合分和趋势；维度不足时只渲染居中的“暂无足够维度生成雷达图”，不会叠加综合分或趋势。团队、维度统计、趋势和排名不可用提示继续完全来自既有 `team-ability-overview` / `coach team` 响应，不新增样例数据、排行或导出能力。
- 验证：先记录旧结构不具备雷达态容器、尺寸与互斥空态的 RED 失败；随后 C14 聚焦 Vitest `5/5`、小程序 TypeScript、完整仓库门禁（领域 `19/19`、小程序 `306/306`、API `85/85`）和 `git diff --check` 均通过。本批尚未取得新的可信 375x812 运行时截图，故不作视觉运行态验收结论。

## 2026-08-12 C16.4 帮助中心顶栏对齐

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`。帮助中心 88px 粉色顶栏增加与 24px 返回区等宽的无交互右侧占位，使标题在可用中轴居中；不改变 FAQ、搜索、分类或支持卡的数据来源与功能边界。
- 验证：先记录顶栏缺少等宽占位和居中标题的 RED 失败；C16.4 聚焦 Vitest `4/4`、小程序 TypeScript、完整仓库门禁（领域 `19/19`、小程序 `306/306`、API `85/85`）和 `git diff --check` 通过。本批未取得可信 375x812 运行时截图，因此不作视觉运行态验收结论。

## 2026-08-12 教练端真实演示数据复核

- 为继续逐页复原而复核了现有的后端验收数据。它不是小程序 mock：在明确隔离的非生产 SQLite 中，`FCM_CQ_TALENT_ACCEPTANCE_SEED=1` 会提供 16 名教练可见队员、6 条固定活动（3 节已完成训练、1 场已完成比赛、1 节待办训练、1 场待办战术赛）、五种出勤状态、8 维能力指标、训练项目树、评测任务、完整比赛事件与战术名单。
- 隐私边界保持不变：教练可见的额外 14 名队员未获得家长监护绑定；家长投影仍只返回原有 2 名孩子。C16.1 权限和 C16.2 私教意向仍是明确标注的本地/展示状态，未被伪装成服务端持久化数据。
- 验证：API focused Vitest `test/cq-talent-fixtures.test.ts` 与 `test/server.test.ts` 共 `59/59` 通过。file-backed SQLite 回归包含真实会话角色选择、家长数据脱敏、出勤写入读回、评测写入、战术板保存与 API 重启后读回。
- 生产安全：验收 seed 在 `NODE_ENV=production` 下被代码禁止加载；不以启动带 flag 的方式写入生产或共享库。当前 DevTools 截图通道已成功生成真实 375×812 登录页 PNG，但本审计尚未用真实教练会话采集新页面，因此以上是数据/API 证据，不构成新的视觉验收。

## 2026-08-12 C2 教练活动工作台结构复原

- 在线 Figma 唯一基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:606 / C2 Activity Workbench`。C2 的设计是 88px 白色顶栏下紧跟 70px 的页内“日程 / 训练管理 / 我的”导航，而不是固定底部 Tab；该差异只在 C2 页面落地，未改共享 `role-tabbar` 或其他教练页。
- 操作区从带“可用操作”外壳和彩色胶囊的卡片网格收敛为 Figma 的白底图标卡。图标由 TS 为已有真实操作预计算，操作数量、名称、可用性和跳转仍完全来自真实 `CoachWorkbench`；超过三项自动换行，不新增画板样例中的倒计时、结束训练、出勤 18/20、学分或虚构进度。
- 验证：先记录 C2 对“页内导航 + 中性图标操作卡”的 RED 失败；随后 C2 聚焦 Vitest `8/8`、小程序 TypeScript、完整仓库门禁（领域 `19/19`、小程序 `306/306`、API `85/85`）与 `git diff --check` 均通过。模拟器当前停在真实登录页，故本批未取得新的已登录教练 375×812 截图，不作视觉验收完成结论。

## 2026-08-12 任务#5 收敛：单一主线收口
- 诊断：9720b40≡fb1e268（hunk 一致）、b903456 patch-等价已在主分支、唯一独有 e83c4ae 已 cherry-pick 为 63961cf
- master 快进至 63961cf = codex/chongqing-talent-business（单一主线）；两个 hotfix worktree+分支已清
- 遗留：手机号回归测试单跑 28.6s，并行下 flake（非逻辑失败）

## 2026-08-12 任务#6 外部验证 + 分支模型收敛 + 慢测试修复
- 分支模型：单 master（本地+远端已同步 1b335a8）+ dev 测试分支（32039ef）；12 个远端 codex/* 旧分支已删（内容全包含验证后）；origin/main 被 master 全包含但属 GitHub 默认分支，需改默认后才能删
- 慢测试：persistence.test.ts 三个文件库用例显式超时（手机号回归 90s，attendance/assessment 30s），统一 options 写法消除与结尾第三参的旧超时冲突；根 check 并行下 429 全绿
- 任务#6：3000 端口公网暴露已外部验证关闭（直连 43.136.114.225:3000 不可达，https://cqtc.pomi.tech/health 200）；compose 漂移=18e1692 已把服务器两处手改（loopback 绑定+env_file）提交回仓；剩余服务器侧逐字节比对需 SSH 私钥

## 2026-08-12 任务#6 收口 + origin/main 删除（六项任务全部完成）
- origin/main：默认分支已通过 GitHub API 改为 master，main 已删；远端最终=origin/master + origin/dev 双分支
- 3000 端口三重验证闭环：外部直连 000 不可达 + docker ps 显示 127.0.0.1:3000->3000 + ss 仅 127.0.0.1:3000 LISTEN
- compose 漂移=0：服务器运行配置 /opt/cq-talent-releases/18e1692/docker-compose.yml 与仓库 docker-compose.yml 逐字节一致
- 服务器访问：ubuntu@43.136.114.225 密码认证可用（注意密码已出现在聊天记录，建议择机轮换）

## 2026-08-12 测试账号登录受限根因与修复
- 现象：已授权的测试手机号能选身份但选家长后落「账号暂时受限」页
- 排查：生产库三账号 users/memberships(parent+coach,active)/parent_profiles/guardian_bindings/student_profiles 全部完好；登录 children 链路=listStudents(实时 SQLite LEFT JOIN operational)×isGuardianOfStudent(内存 this.data)
- 根因：PersistentApiStore 启动时 mergePersistedPlatformData 快照合并 parents/guardianBindings；任务#4 导入(19:06)晚于 API 进程启动（#3 重启验证在 #4 之前）→ 运行进程内存快照无导入绑定 → isGuardianOfStudent=false → children=[] → parent_without_children
- 修复：docker restart cq-talent-api（重建快照），health 200 日志干净；三个账号同一根因一并修复
- 架构教训：secure-test-accounts 导入后必须重启 API 才生效（内存快照启动时合并）；另观察：导入命令不创建 student_operational_profiles（登录不依赖，但学员运营字段视图会空）

## 2026-08-12 三个测试账号数据丰富化（192 行）
- 备份：/var/lib/cq-talent/api-backup-pre-enrich-20260812.sqlite（VACUUM INTO，写前一致性快照）
- 每账号新增：8 日程（4 已完成训练/友谊赛+3 未来训练+1 未来联赛，中文标题+备注，Asia/Shanghai）×2 孩子参与；8 核心雷达维度 ×（训练观察+周期评测）=16 条 metric 记录/孩子；运营档案（学校/区域/在读/课时余额21/保险期）；保险单（太平洋保险至 2027-01-15）；课时台账（充值24+余额21快照）
- 三账号对称共 192 行，ID 全部带 secure-test 命名空间可识别清理；FK 约束逐一核对（payment_event_id 置 null 避开不存在引用）
- 注意：这些行不在 secure-test-accounts 命令 canonical manifest 内，未来 rollback 不会自动清理，需按 %secure-test% 手动清
- 已重启 cq-talent-api 刷新内存快照，health 200，读回核对三账号数据对称完整

## 2026-08-12 测试账号数据铺满最近一个月（再+168 行）
- 每账号再补 8 个 7 月中下旬已完成事件（每周 2 训练+双周赛：07-14/17/19/21/24/26/28/31）×2 孩子参与；每孩子再补 2 轮 8 维度 metric 记录（07-22 训练观察 + 07-29 周期评测）
- 全账号事件跨度 2026-07-14 ~ 2026-08-17（过去一个月每周有数据+未来一周排期）；测评时间线 07-15/07-22/07-29/08-05 四个采样点
- 运营档案 total_checkins 同步为 10；重启 health 200


## 2026-08-12 深夜：未来赛事出勤修正 + Figma 复原开工
- 数据修正：24 行未来赛事（08-13/15/16/17 三个账号各 2 孩子）event_participants.status 由 confirmed 改为 enrolled（已完成赛事保持 confirmed）；已重启 API 刷新内存快照，health 200
- 原因：未来赛事显示"已到场"不符合实际，家长端活动详情页出勤卡应按状态待确认呈现
- Figma 复原开工：在线画板 id 映射固化 docs/design/specifications/figma-online-frame-map-2026-08-12.md（P1 在线已重设计为 269:250，新增 P1-Empty 269:479；本地旧 fig-out.json 部分 id 已失效）
- P1 Schedule Home 已对齐新设计（周历去箭头、今日红圈/选中深色圈双高亮），提交 4e0bd64，375x812 截图验收通过
- 教训：DEV_AUTO_SESSION 对生产 API 无效（生产硬关 x-user-id 头鉴权）且伪造会话残留 wx storage 致持续 403；补救=clearStorage+干净重启；生产页面验收必须真实微信会话
- 截图工具链：automator reLaunch/navigateTo promise 挂起，须走 callWxMethod('reLaunch') 通道（tmp/prod-verify/mp-route-shot.cjs 已封装，当前自动化端口 9428）

## 2026-08-13 家长端导航补齐 + 内容中心整页空态根因修复

### 已提交（5 个提交）

- `d674b15` 家长端底部导航从三格补为设计稿的四格：新增 `discover` 图标与 `ROLE_TABS` 条目，内容/场地/帮助/教练团队/私教申请及结果页此前只能高亮「我的孩子」，现改为高亮「发现」。同时新增 `openTab` 走 `reLaunch`：tab 根页之间原用 `navigateTo`，页面栈会持续堆叠且超过 10 层后静默失败；`openPage` 的失败回调也降级到 `reLaunch` 兜底。
- `df7085f` 三处入口缺口修复：日程页训练任务原跳 `/coach/training/index?eventId=x`，但训练管理页是 tab 根页、不读 `eventId`，点进去等于丢上下文，改跳 `content-select`；`lesson-correction` 与 `test-tasks` 两页在 `app.json` 注册但全站无入口，分别由课时确认页「发起更正」和训练管理页「测评任务」页签接入。
- `d7a3309` 内容中心/场地/活动详情对齐设计稿：文字图标块换线性 SVG、补推荐大图卡、场地卡补实景图、地址行 emoji 换 `map-pin` 图标；活动详情训练类出勤区改「线下确认」文案，不再暗示 APP 内可确认出勤；tokens 补 `--space-page`。
- `2613721`、`1ab6785` DevTools 工具链收编进仓库：`scripts/devtools/` 下 `mp-route-shot.cjs`、`mp-batch-shot.cjs`、`mp-eval.cjs`、`mp-smoke.cjs`、`page-data.cjs`、`focus-devtools.ps1`、`sidebyside.py` 加使用说明与已知坑。批量截图在单连接内跑完整条路由清单，比每页重连快一个量级。

### 未提交：内容中心整页空态根因修复

- 现象：内容中心点进去整页空白，只有顶栏。
- 根因：`state` 把「加载失败」和「文章列表为空」混为一谈——文章数为 0 时置 `state: "empty"`，而 WXML 把分类导航、推荐卡、快速入口四格等**静态设计内容整体挂在 `state === 'ready'` 之下**，于是后端返回空文章列表会连带擦掉整页。页面本已有 `hasVisibleArticles` / `emptyMessage` 字段，但在旧逻辑下是不可达的死代码。
- 修复：加载成功一律 `state: "ready"`；文章数为 0 只驱动「最近文章」段内的空提示。测试同步改为断言段级空提示，并加结构守卫防止静态块再次被文章数据门禁。小程序 Vitest `54 files / 307 tests` 通过。
- 验证：模拟器实测 `state: "ready"` / `articles: 0`，整页正常渲染（顶栏、分类 pills、推荐卡、快速入口四格、最近文章段内空提示、四格底栏且「发现」高亮）。

### 「除教练团队外都没内容」根因（数据侧，未修）

用户报告快速入口点进去大多没内容。逐个接口实测（真实会话，Bearer 不记录）：

| 接口 | 结果 |
|---|---|
| `/content/articles` | `200` `{"articles":[]}` |
| `/content/faqs` | `200` `{"questions":[]}` |
| `/venues` | `200` `{"venues":[]}` |
| `/coach-team` | 有真实数据 |

根因：`contentArticles` / `contentFaqs` / `venues` 三个集合**只存在于验收 seed** `apps/api/src/seed/cq-talent-acceptance.ts:653`（4 篇文章、5 条 FAQ、3 个场地），而该 seed 在 `apps/api/src/seed/index.ts:44` 被限制为 `NODE_ENV !== "production"` 且 `FCM_CQ_TALENT_ACCEPTANCE_SEED === "1"`，**生产按设计永不加载**，因此线上三个集合为空。教练团队页有内容是因为 `coach-team` 路由（`apps/api/src/routes/app-client.routes.ts:2097`）读的是 `listTeams` / `listCoaches` 运营实体表，那里有 2026-08-12 补数写入的真实数据。

结论：这不是页面渲染缺陷，页面的空态、跳转与入口都是对的（`venues`/`help`/`coaches` 三页的整页空态是这些页面本身没有静态设计内容，与内容中心的情况不同，属正确行为）。属内容运营数据缺失。待用户裁决灌数方式后另立任务，三条候选路径：① 受控 INSERT 进生产库（须先 `VACUUM INTO` 备份 + 写后 `docker restart cq-talent-api`）；② 只在本地带 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` 跑，小程序指向本地；③ 不灌数，按设计稿补更完整的空态引导。本轮未执行任何生产写库。

## 2026-08-13 生产 API 重新部署（75fd0e9，用户授权）
- 背景修正：小程序控制台 /content/venues|coaches 404 实为模拟器旧编译产物，非生产缺路由；但 diff 实测生产代码大幅落后 dev（缺 ops/、会话持久化仓储等）
- 流程：docker exec VACUUM INTO 备份（api-backup-pre-75fd0e9-20260813.sqlite）→ 旧镜像打 rollback-pre-75fd0e9 标签 → git archive HEAD 上传解包 /opt/cq-talent-releases/75fd0e9 → docker build 新镜像（432f1457e0fe）→ sudo docker compose up -d --no-build --force-recreate（.env.runtime root 600 需 sudo，首次裸跑失败导致约 2 分钟停机）
- 验证：容器跑新镜像 sha256:432f1457e0fe；迁移 0009/0010 自动应用（app_client_sessions、student_guardian_bindings 表已建）；/health 200；/venues 403 鉴权拦截（路由存在）；备份文件在卷内
- 影响：会话表上线后旧内存会话失效，所有用户下次需重新授权一次（模拟器同）

## 2026-08-13 发现区复原巡检 + 家长端 15 页全量 smoke（生产会话）
- 发现区 4 画板（P8 内容中心/venues-premium/P8.2 帮助中心/coach-team）与实现逐项比对：结构均已对齐，tokens 即设计色（brand #a80f1b、card 白、quick-card 带边框圆角、coach-card 白卡+阴影）；vision 对比报的『灰色/无卡片』多为比对噪声
- 真实缺口全部收敛为**后端字段缺失**（不伪造）：赛季目标行、教练角色 pill/角色色头像框、微信联系按钮——API coach-team 无 goal/role/contact 字段
- 白屏根因修复：venues/help/coaches/content/private-success 五页 index.json 未注册 status-view（未注册组件静默不渲染）→ 全部补注册（adb44f0），venues/help 现为正确空态、coaches 真实列表
- 家长端 15 路由 smoke（mp-smoke + 生产会话）：13 ready/empty 正确；metric、private-success 为参数页，无参时给正确错误态（非缺陷）
- launch 页 reLaunch 推迟到 appLaunch 后执行，消除 non-empty page stack 报错（1fd4465）
- P2 训练详情导航徽章改按孩子出勤状态着色（159d458）

## 2026-08-14 用户新纪律「figma 有的效果全复原、缺数据可补」后的复原批次
- coaches 页：接上 API 已有的 teamGoal/role 字段——赛季目标行+角色 pill+角色色头像框（主教练红/体能橙/其他蓝），旧『防占位』测试改写为新纪律语义（4fe5b61）；微信联系按钮无真实数据来源，继续隐藏
- P2.1 比赛详情：未开始比赛比分显示 0:0（设计稿语义，完赛未录仍『比分待确认』）、赛事名两行不截断、队名列 180rpx 完整显示（be30874 + 队名列宽后续提交）
- API：事件详情按 primaryTeamId 从 teams 表解析 teamName（be30874，含 server.test 断言）——已二次部署生产（镜像 2dbab99eb370，缓存加速构建，sudo compose up -d --no-build，health 200）
- 生产数据：3 支 secure-test 队重命名为中文『U10 测试队 1/2/3』（备份 api-backup-pre-teamname-20260813.sqlite）
- 验收：P2.1 实机截图 sidebyside 通过——真实主队名、完整赛事名、0:0+待开始 pill、布局无挤压

## 2026-08-17 C4 出勤页最终 UI 收口（静态/API 验证通过，运行时视觉待补）

- 在线 Figma 抽查：`zZ6wKyOHKcO4UYXDd9jGwv` 的 C4 `93:665`、C4.1 `93:696`、C4.2 `93:715` 与本地参考 PNG 仅有非实质像素差异；不覆盖参考图。
- C4：保留真实 workbench 名单和既有出勤 PUT；`confirmed`/`invited` 在页面 view model 中仍按未点名处理，动态新增“共 N 名学员”尾栏，到课状态改为可点击、仍可打开真实选择器的绿色确认圆形。
- C4.2：同时兼容规范路由 `?correction=1` 和旧 `?mode=correction`；不再继承深色活动摘要，只保留真实警示、真实名单、逐人备注和固定重新提交区，不添加“家长异议”“异常数量”“全局修改说明”等无 API 支持的数据。
- C4.1：继续按 eventId 重新 GET workbench 读取真实统计；移除未声明的 `venue`/`hasVenue` 写入，主按钮改为中性“查看活动详情”。共享顶栏新增按页启用的 22px 标题变体，未改变其他页面的默认标题尺寸。
- 验证：先新增会失败的回归测试，再完成最小实现；聚焦 Vitest `23/23`、小程序 `typecheck`、`git diff --check` 及全仓门禁均通过（domain `19/19`、小程序 `319/319`、API `104/104`）。
- 运行时截图：先前自动化已确认 C4 路由和 iPhone X 逻辑 `375×812`，但提交前 `9432` 端口已失效，且 Windows 未发现可见的“的模拟器”窗口；未生成或接受任何截图证据，因此明确不宣称视觉运行态验收完成。

## 2026-08-17 DevTools Automator 拒绝连接根治（截图连接层）

- 根因：仓库内各截图/诊断脚本私自默认 `9421`、`9425`、`9429`、`9430` 或 `9432`，而 DevTools 的 `.ide` HTTP 服务端口又与 Automator WebSocket 端口混用；手动打开 IDE 后，脚本仍可能盲连已经不存在的旧端口。
- 修复：新增 `scripts/devtools/automation-session.cjs` 作为唯一端口状态；`devtools:automator:open` 先只读探测可用 Automator，再在需要时把当前 `.ide` HTTP 端口传给 `cli auto --port`、注册独立 `--auto-port`，仅在 `currentPage()` 握手成功后写入忽略的 `tmp/devtools-automation-session.json`。所有已跟踪的 Automator helper 已改为读取它，`MP_AUTO_PORT` 只保留为一次性覆盖。
- 实测：2026-08-17 手动打开的 DevTools 经 `cli auto --project <小程序目录> --port 14535 --auto-port 9432` 后监听 9432；新的 canonical opener 复用该端点、写入状态文件，并真实读到 `pages/coach/schedule/index`。这证明“拒绝连接”已解决。
- 边界：后续一次有界 `MiniProgram.screenshot()` 探针未能在约 55 秒内完整返回（其中断开阶段也未结束），已中止且未接受 PNG；这是 SDK 截图/断开能力边界，不是再度拒绝连接。C4/C4.1/C4.2 仍须另取可信 375×812 图片后才可声明视觉验收。

## 2026-08-17 DevTools 嵌入式模拟器截图回退修复

- 新根因：DevTools Stable `v2.01.2510290` 当前只有一个主窗口 `重庆天才俱乐部 - 微信开发者工具`，iPhone X 模拟器嵌在主窗口右侧，不会暴露旧脚本要求的“××的模拟器”独立窗口。此前因此在 Automator 已连通后仍报找不到模拟器窗口。
- 修复：`devtools-simulator-capture.py` 保留独立窗口路径；没有独立窗口时，选择唯一可见的 DevTools 主窗口，并搜索 iPhone X 刘海的纵向+横向黑色签名，以 DPI 比例裁出完整视口。新增偏离主窗口中心的 Python 回归测试，防止算法退回“只看正中心”的假设。
- 实测：真实 `.ide` HTTP `61245` 通过 CLI 注册 Automator `9424`，`devtools:screenshot` 已读取 `/pages/coach/schedule/index`，输出 `563×1218` PNG；`systemInfo` 同时确认逻辑视口 `375×812`、`devicePixelRatio: 3`、均匀栅格比例约 `1.5`。图像只含小程序画布，没有 DevTools 边栏或弹窗。
- 范围：这证明截图工具链恢复，不替代 C4/C4.1/C4.2 各自的 Figma 对照验收；下一页验收前仍须导航到目标路由并重新截图。

## 2026-08-17 C4 出勤页复验与截图 DPI 收口

- 在线 Figma 已逐页重新读取：C4 `93:665`、C4.1 `93:696`、C4.2 `93:715`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C4.1 的真实运行时对照确认 80px 成功图标、四行摘要、48px 通宽红色 CTA；CTA 文案收敛为画板的“查看训练详情”。
- 真实读写证据：教练会话对安全测试活动 `event-cq-talent-secure-test-1-trn-0817` 执行页面既有“全员到场 → 提交”；两名真实学员由 `pending` 持久化为 `present`，C4.1 按 eventId 重新 GET 后读回 `2/2`。未创建前端 mock、伪 session、伪角色或伪名单。
- C4.2 依据 `93:715` 重建通用订正态：警示卡、48px 三角图标、紧凑“学员列表 / 共 N 名学员”卡和 52px 固定重新提交区与画板结构一致；真实到课状态仍以绿色确认圈呈现。没有伪造“家长异议”“异常数量”或不受 API 支持的全局修改说明，原来的逐人空备注输入也不再冒充该设计字段。
- 可信截图通道补齐 Windows DPI：当 DevTools 在 150% 缩放下捕获 `563×1218` 物理画布时，`devtools-simulator-capture.py` 仍以高质量缩放输出严格的 `375×812` PNG，并由 Python 回归覆盖。Automator 的 `mp.screenshot` 仍可能在路由成功后超时；该 SDK 限制不影响屏幕像素通道。
- 验证：C4 聚焦 Vitest `7/7`、C4.1 聚焦 Vitest `4/4`、截图脚本 Python `4/4`、小程序 typecheck、`git diff --check` 与完整门禁均通过（domain `19/19`、mini-program `322/322`、API `104/104`）。已产出真实 C4、C4.1、C4.2 375×812 截图与左右对比图；最后一次 ready 状态宿主消除由页面回归覆盖。DevTools CLI 无“仅编译当前已打开 IDE”的安全命令，故在用户已允许不以最后一次视觉截图为完成前置的前提下，不将该最后一处宿主变更误报为新鲜运行态像素验收。

## 2026-08-17 C5 课时确认与 C5.1 更正页复原

- 在线 Figma 已重新读取：C5 `93:734`、C5.1 `93:765`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C5 对齐深色活动摘要、16px 白色列表卡、28px 学员头像、1.5 课时风格的绿色额度标签和 52px 主操作；C5.1 对齐软粉标题栏、16px 警示/名单卡、40px 头像、80px 紧凑上下调整器与圆角保存操作。
- 页面继续只读既有真实 workbench + lesson-confirmation GET，确认继续走既有 POST，更正继续走既有 event-scoped PATCH 和幂等键；未新增前端 fixture、伪余额、伪差异、伪角色或 API 字段。设计稿的“系统差异”“原值 1.5 课时”是样例数据，没有移植到真实页面。
- 已消除 ready 状态下 `status-view` 与实际内容同时渲染的宿主问题；C5 的活动元数据分组、名单行高/标签内边距和底部操作区按画板收口。C5.1 将此前容易挤压名单的横向减/数值/加控制收为画板同类的数字框加上下箭头，同时保持每次点击写入真实 `±0.5` 调整值；本轮又把内容左右内边距收为 22px、保存按钮恢复到学员卡后的正常内容流，并用 CSS 实心警示图标替代会随系统字体变色的 emoji。
- 验证：先更新页面回归并确认失败，后完成最小实现；C5.1 聚焦 Vitest `7/7`、小程序 typecheck、`git diff --check` 和全仓门禁均通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 真实视觉证据：在线 Figma 节点 `93:765` 重新导出为 `tmp/coach-runtime-acceptance/C5-1-figma-online.png`；当前教练活动通过微信开发者工具屏幕像素通道取得 `tmp/coach-runtime-acceptance/C5-1-final.png`，严格 `375×812`，并生成 `tmp/coach-runtime-acceptance/C5-1-final-compare.png`。页面级结构、卡片宽度、按钮位置和警示图标已通过对照；样例学员姓名/头像/课时数/“系统差异”标签与真实 API 数据不同，按动态数据豁免，不伪造样例数据。顶部状态栏、菜单胶囊和底部 Home Indicator 属于微信模拟器壳层，不计入业务页面差异。

## 2026-08-17 C6 比赛记录、C6.1 事件录入与 C6.2 本机草稿态复原

- 在线 Figma 已重新读取：C6 `93:796`、C6.1 `93:827`、C6.2 `93:858`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C6 对齐软粉标题栏、深色比赛摘要、白色比赛事件卡和描边添加按钮；C6.1 对齐能力驱动事件 chips、白色表单卡、48px 控件和圆角红色提交按钮；C6.2 对齐遮罩、左对齐本机草稿弹层和继续/退出操作。
- 保留真实链路：C6 仍只读 coach match-detail BFF；C6.1 仍走既有 event-scoped POST 与稳定幂等键；C6.2 只展示设备本机未提交草稿，不声称服务端自动保存，也没有把 Figma 示例里的换人、其他事件、示例比分或样例球员写入业务。
- 页面收口：ready 状态不再同时渲染 `status-view`；C6 去掉非画板眉题和额外状态 pill，时间线改为无分割线紧凑行；C6.1 将事件类型移到表单外、时间/球员/备注按画板顺序布局，备注改为真实多行输入；本机草稿弹层按钮顺序和颜色与画板一致。
- 验证：先让新增 C6 结构回归失败，再完成最小实现；聚焦 C6/C6.1 Vitest `15/15`、全仓门禁通过（domain `19/19`、mini-program `322/322`、API `104/104`），小程序 typecheck 和 `git diff --check` 通过。
- 运行态边界：Automator 成功从 C5 跳到 `/pages/coach/match/index`，屏幕像素通道输出严格 `375×812`，但画布仍显示旧 C4.2 页面；因此不把 C6 图片作为可信视觉通过，准确记录为 IDE 未刷新编译产物，未因此回滚页面实现。

## 2026-08-17 C9 队伍详情页 Figma 复原

- 在线 Figma 已读取 `zZ6wKyOHKcO4UYXDd9jGwv` 的 C9 节点 `93:924`，确认结构为软粉 88px 顶栏、深色队伍摘要、四列学员网格和横向教练卡。
- `/coach/team` BFF 增加真实 `coaches` 数组：仅从当前教练可访问队伍的真实 `defaultCoachId` 查找 active 教练，返回 `id/name/role`，不返回全俱乐部教练目录或联系方式。
- C9 前端增加真实教练组 view model、滚动卡片、菜单胶囊避让和 ready 状态门禁；成员仍从真实 scope 读取，点击继续进入真实学生雷达页。旧 BFF 没有 `coaches` 字段时归一为空数组，队伍正文不进入错误态。
- 验证：先红后绿的 C9 小程序测试 `7/7`、API 安全账号测试 `11/11`；全仓门禁 domain `19/19`、小程序 `324/324`、API `104/104`，两端 typecheck、API build、`git diff --check` 通过。
- DevTools Automator 已连接 `9424`，路由已切到 `pages/coach/team/index`，运行时确认 iPhone X 逻辑视口 `375×812`；屏幕像素裁剪因当前 Windows 主窗口找不到 iPhone X 刘海锚点而拒绝生成 PNG，未宣称视觉截图通过。此前本地 API `tsx watch` 进程仍存在但 `/health` 无响应，重启/启动动作被当前 Windows 执行策略阻止，需后续在可控终端重启本地 API 后再做运行态联调。

### C9 运行态补证

- 在线节点 `93:924` 已重新读取；真实教练会话导航到 `pages/coach/team/index` 后取得 `tmp/coach-runtime-acceptance/C9-acceptance-phone-current.png`，裁剪结果严格 `375×812`。
- 顶栏、队伍摘要卡、四列真实学员网格、教练组区域和教练 TabBar 的结构/间距与在线稿一致。当前 BFF 返回的真实队伍没有教练组成员，因此页面如实显示“暂未配置队伍教练”；没有把 Figma 示例的林教练、王助教、李体能写成测试数据。
- C9 聚焦 Vitest `7/7` 通过；本项无业务代码变更，记录为“视觉结构通过，教练组真实数据为空态”。

## 2026-08-17 C10 训练内容选择与 C10.1 覆盖预览复原

- 在线 Figma 已在本批开工前重新读取：C10 `93:952`、C10.1 `93:983`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C10 收口为软粉 88px 安全区顶栏、44px 搜索、32px 分类 pills、64px 紧凑训练项目行与 70px 选择底栏；训练项目名称、标签、难度、时长、选中数和总时长仍由既有真实项目树及 workbench 返回派生。
- C10 保存链路未改：仍是 `getCoachTrainingProjectTree()` + `getCoachWorkbench(eventId)` → `saveCoachTrainingProjects(eventId, ids)` → 精确 workbench 回读；未加入 Figma 示例训练项目、时长、选择或伪 API 结果。
- C10.1 收口为软粉 88px 顶栏、真实学员覆盖卡、6px 覆盖轨道与 Figma 固定底栏。示例“已覆盖 3 项”改从真实响应中按已覆盖维度去重计算；“确认”只执行本地返回，不发写请求、不产生伪成功态。返回的维度数可以大于画板示例的三行，页面保留全部真实维度。
- 测试先行：先让 C10/C10.1 的布局/派生字段/本地确认回归按预期失败，再完成最小实现；聚焦 Vitest `14/14`、小程序 typecheck、`git diff --check`、全仓门禁均通过（domain `19/19`、mini-program `325/325`、API `104/104`）。
- DevTools 自动化已复用当前实例 `9424` 并路由到 C10/C10.1；C10.1 的运行态仍是旧 bundle（页面 `ready` 但没有新 `coverageSummary` 字段），`devtools-simulator-capture.py` 因无法定位当前嵌入式模拟器刘海而拒绝生成 PNG。故本批**没有**新的可信 375×812 视觉截图，不将静态/单测结果表述为运行态视觉验收。

### C10/C10.1 运行态补证

- 在线节点 `93:952`、`93:983` 已重新读取；真实教练会话导航到 `pages/coach/content-select/index?eventId=event-cq-talent-demo-training-upcoming` 和 `pages/coach/coverage/index?eventId=event-cq-talent-demo-training-upcoming`，取得 `tmp/coach-runtime-acceptance/C10-acceptance-phone-current.png`、`tmp/coach-runtime-acceptance/C10-1-acceptance-phone-current.png`，两张裁剪结果均严格 `375×812`。
- C10 的搜索、分类 pills、训练项目卡、选择圆、底部选择栏和 C10.1 的学员覆盖卡/6px 轨道/确认栏与在线稿结构一致；训练项目、标签、时长、已选数量、覆盖比例和维度数量全部来自真实 API，未用画板示例内容替代。
- C10/C10.1 聚焦 Vitest `8/8`、`6/6` 通过；本批无业务代码变更，记录为“视觉结构通过，动态真实数据差异已豁免”。

## 2026-08-17 C11 测评任务列表 Figma 复原

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。页面复原为软粉 88px 顶栏、左侧返回与 22px 标题、菜单胶囊避让的“新增”、32px 筛选、12px 圆角/16px 内边距任务卡、4px 轨道、全任务卡右箭头和 56px 红色 FAB。
- 真实业务边界未变：标题、日期、状态、已完成学员数、进度宽度和 `templateId` 仍只来自 `getCoachAssessmentTasks()`；只有真实 `in_progress` 且带 `templateId` 的任务可进入测评录入。未开始/已完成任务仍说明不可录入，未开始轨道使用画板灰色。
- Figma 的顶栏“新增”与 FAB 都没有创建任务 API。两个入口统一为明确的不可用提示，不写本地状态、不调用写接口、不构造新任务或成功结果。
- 验证：先为新增入口、菜单避让、全量箭头和无伪造创建写下 RED 测试，后 C11 聚焦 Vitest `8/8` 通过；小程序 TypeScript 与 `git diff --check` 通过。根门禁的 domain `19/19` 与小程序 `326/326` 均通过，API 再以独立命令完整复核为 `104/104`、exit `0`。
- 运行态边界：本批未获取新的可信 375×812 C11 截图。用户已授权本阶段不以实时截图作为完成前置；因此不把静态/单测结果表述为 C11 运行时视觉验收。

## 2026-08-17 C12/C12.1 项目评分录入最终栅格收口

- 在线 Figma 基准已重新读取：C12 `93:1030`、C12.1 `93:1061`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C12 顶栏改为 88px 内容高度叠加动态状态栏，页面正文和固定提交栏收敛到画板的 22px（44rpx）横向栅格，同时保留右侧系统胶囊动态避让。
- C12.1 的本机草稿遮罩出现时，顶栏展示文案切换为“成绩录入”；点击“继续录入”后恢复“项目评分录入”。这只新增展示字段 `navTitle`，不改 `assessment-draft`、真实评分表、活动数据、提交 API 或任何草稿写入行为。
- 测试先确认新增标题/栅格断言会因旧实现失败，随后完成最小显示层修改。聚焦 C12 Vitest `15/15`、小程序 TypeScript、`git diff --check` 均通过；全仓门禁复核为 domain `19/19`、mini-program `326/326`、API `104/104`。
- 运行态边界：本批未生成新的 C12/C12.1 375×812 DevTools 截图。用户已授权本阶段不以截图作为完成前置，因此以上为 Figma 源码/测试验收结论，不冒充新的运行时像素验收。

## 2026-08-17 C14 团队能力总览安全区顶栏收口

- 在线 Figma 基准已在改动前重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`；标题栏设计高度为 88px、底色 `#fceeef`。
- 根因是 C14 已通过 WXML 注入动态状态栏高度 `navInset`，但 `.ability-nav` 仍使用 `box-sizing: border-box`，会侵占设计要求的 176rpx 内容高度。现改为与 C12/C13/C10 已验证页面一致的 `box-sizing: content-box`。
- 业务边界未变：团队雷达、维度统计、真实 API 读取、导出不可用状态及教练 tabbar 均未改动；没有新增样例数据或伪造接口结果。
- 验证：回归先红后绿（C14 定向 Vitest `5/5`）；小程序 typecheck、`git diff --check` 与全仓门禁均通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C15 能力评估录入安全区顶栏收口

- 在线 Figma 基准已在改动前重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15 Assessment Entry`。旧交接中写作 `93:1135` 的节点在线已不存在，当前 Figma 映射表的 `93:1132` 为唯一实际施工基准。
- C15 的 WXML 已动态注入 `navInset`，而 `.c15-nav` 的 `border-box` 会吞掉 176rpx（88px）设计内容高度；现按同类 C14/C13 页面改为 `content-box`，保留状态栏之上的 Figma 顶栏几何。
- 没有改动真实评测模板/字段、教练名单、滑动评分范围、本机草稿键、提交 API 或成功页跳转；也没有采用画板中的样例姓名、年龄、分数作为业务数据。
- 验证：C15 定向 Vitest 先红后绿 `8/8`，小程序 typecheck、`git diff --check` 与全仓门禁均通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C15.1 评估提交安全区顶栏收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1163 / C15.1 Assessment Submit`。页面的 88px 软粉顶栏通过动态 `navInset` 适配设备状态栏。
- `.c151-nav` 原本仍为 `border-box`，会将动态状态栏内边距从 176rpx 设计内容区中扣除；现改为 `content-box`，与 C14/C15 形成统一的自定义顶栏安全区模式。
- 保留真实边界：仅接受教练角色、合法路由标题和正整数已提交人数；“查看当前结果”仍跳转团队能力总览、返回仍返回列表。画板的“处理中 / 24小时 / 18名”等示例未被伪装成真实产品数据。
- 验证：C15.1 定向 Vitest 先红后绿 `4/4`，小程序 typecheck、`git diff --check` 与全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16 教练“我的”安全区顶栏收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me`。同时复核 Figma 组件约束：身份切换只对服务器确认的双角色会籍展示。
- C16 顶栏已经从 WXML 接收 `navInset`，但 `.c16-bar` 仍是 `border-box`；改为 `content-box` 后，88px 设计内容高度不会被状态栏内边距侵占。
- 保留既有真实行为：仅 `availableRoles` 同时包含 parent/coach 时显示身份切换；切换继续通过服务器 `switchActiveRole`，退出登录保留一次确认和清空会话。没有把在线稿的林教练、球队、主教练或统计样例写入真实数据。
- 验证：C16 定向 Vitest 先红后绿 `9/9`，小程序 typecheck、`git diff --check` 与全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16.1 权限范围只读几何收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1210 / C16.1 Permission Scope`。旧交接的 `93:1215` 不再作为在线施工依据。
- 已收口有真实契约的视觉：88px 安全区顶栏、说明卡的 16px 栅格/蓝色图标底、56px 权限行以及 52px 深红管理员提示操作。页面不再以旧的偏粉红按钮色或紧凑行距偏离画板。
- 业务边界保持：权限清单继续只由会话 `client.roleEntrypoints.coach` 投影；不可点、不可写的“仅管理员可调整”不会假装成 Figma 的“保存更改”。未添加画板中无后端契约的私教、财务、开关状态或保存请求。
- 验证：C16.1 定向 Vitest 先红后绿 `4/4`，小程序 typecheck、`git diff --check` 与全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16.2 私教兴趣安全区顶栏收口

- 在线 Figma 基准已在改动前读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1238 / C16.2 Private Interest`；顶栏为 88px 的软粉内容区，叠加设备动态状态栏安全区。
- 根因与已收口的 C14-C16.1 相同：WXML 向 `.c162-nav` 注入 `navInset`，而旧 `border-box` 会从设计规定的 176rpx 内容高度中扣除这段安全区内边距。现改为 `content-box`，不改标题、返回、正文卡片或教练 tabbar。
- 真实业务边界保持不变：仍只投影 `session.capabilities.features.private_lessons` 的 enabled / unavailable / pending 状态；没有伪造 Figma 示例中的“接受私教预约”、周时段、17:00-20:00、价格、存储或 API 写入。
- 验证：先让新的安全区断言因旧 `border-box` 失败，再以最小 WXSS 修改转绿；C16.2 定向 Vitest `4/4`、小程序 typecheck、`git diff --check` 和全仓门禁均通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16.3 教练账号安全区顶栏收口

- 在线 Figma 基准已在改动前读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`；顶栏设计为 88px 软粉内容高度并叠加设备状态栏安全区。
- 根因是 `.c163-nav` 通过 WXML 注入 `navInset` 后仍使用 `border-box`，导致动态状态栏内边距侵占 176rpx 的设计内容高度。现改为 `content-box`，其余卡片、资料和底部角色 tabbar 保持不变。
- 真实数据边界保持：页面继续只读取当前登录教练和 `getCoachHome()` 返回的数据；没有采用在线稿的林教练、U10、手机号、认证、修改资料、密码、设备或清缓存样例，也没有新增未经契约支持的操作。
- 验证：先让 C16.3 的安全区布局断言因旧 `border-box` 失败，再以最小 WXSS 改动转绿；C16.3 定向 Vitest `5/5`、小程序 typecheck、`git diff --check` 和全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16.4 教练帮助安全区顶栏收口

- 在线 Figma 基准已在改动前读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`；顶部为 88px 的软粉导航内容区，叠加设备动态状态栏安全区。
- 根因与 C16.2/C16.3 相同：`.c164-nav` 从 WXML 获得 `navInset`，旧 `border-box` 会挤占 176rpx 设计内容高度。现以 `content-box` 保留顶部的 Figma 几何，标题居中 spacer、返回、搜索、FAQ、支持卡和教练 tabbar 未改。
- 真实帮助契约保持：分类、FAQ、搜索/筛选/展开状态仍从教练帮助响应与本地 view model 派生；未把 Figma 的固定分类、示例问题、支持时间、在线咨询、公众号或联系方式伪造成真实服务数据。
- 验证：先让 C16.4 的新安全区布局断言因旧 `border-box` 失败，再以最小 WXSS 改动转绿；C16.4 定向 Vitest `4/4`、小程序 typecheck、`git diff --check` 与全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C1 日程主页安全区回归审计收口

- 全教练端顶栏审计发现 C1 `pages/coach/schedule` 的 WXML 已传入 `navInset`，但 `.c1-nav` 仍是 `border-box`；在线 Figma C1 `zZ6wKyOHKcO4UYXDd9jGwv / 93:578` 指定 88px 顶栏，动态状态栏不应侵占 176rpx 的设计内容区。
- 已将 C1 顶栏改为 `content-box`，保持原有菜单胶囊避让、实时日期/周导航、真实日程数据和角色跳转逻辑不变；不改任何 API 或展示样例数据。
- 验证：先让 C1 安全区断言对旧 `border-box` 失败，后 C1/C2/C3 聚焦 Vitest `24/24`、小程序 typecheck 和 `git diff --check` 通过。C2/C3 前一批的在线 Figma/源码/测试验收保持有效；用户已明确本目标不再以新模拟器截图作为完成前置。

## 2026-08-17 C8 训练管理安全区回归收口

- 在线 Figma 基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:896 / C8 Training Management`；训练管理页顶栏为 88px 内容区，WXML 同时注入动态 `navInset` 和菜单避让。
- 全教练端顶栏审计发现 `.c8-nav` 仍为 `border-box`，会将动态状态栏内边距从设计内容高度中扣除。现改为 `content-box`，保留真实训练统计、训练卡、真实 eventId 跳转以及已移除 C10 写入边界。
- 验证：先让 C8 安全区断言对旧 `border-box` 失败，后 C8 定向 Vitest `6/6`、小程序 typecheck 和 `git diff --check` 通过；用户已明确本目标不再以新模拟器截图作为完成前置。

### C8 运行态补证

- 使用当前真实教练会话导航到 `pages/coach/training/index`，通过屏幕像素通道取得 `tmp/coach-runtime-acceptance/C8-acceptance-phone-current.png`，裁剪结果严格 `375×812`。
- 与在线节点 `93:896` / `docs/design/reference/figma/c8-training-management.png` 对照：顶栏、深色四格统计、四项 Tab、训练卡列表、固定教练 TabBar 的几何和层级一致；统计数字、训练名称、日期、地点、状态和人数来自真实 API，与画板样例不同属于动态数据差异。

## 2026-08-17 教练端全量任务记录收口

- 全量在线画板↔路由表已核对到 C16.4：C1 `93:578`、C2 `93:606`、C3 `93:634`、C4/C4.1/C4.2 `93:665/696/715`、C5/C5.1 `93:734/765`、C6/C6.1/C6.2 `93:796/827/858`、C7 `93:877`、C8 `93:896`、C9 `93:924`、C10/C10.1 `93:952/983`、C11 `93:1002`、C12/C12.1 `93:1030/1061`、C13 `93:1080`、C14 `93:1106`、C15/C15.1 `93:1132/1163`、C16–C16.4 `93:1182/1210/1238/1262/1286`。
- 复核发现并修复两处此前遗漏的同根因：C1 `.c1-nav` 与 C8 `.c8-nav` 均同时接收 `navInset` 和声明 176rpx，现统一使用 `content-box`；对应 C1/C8 红→绿回归已提交。
- C4、C5、C6、C2 视觉任务和证据审计的剩余未勾选项仅是新的已认证截图前置。根据用户本轮明确授权，已改为“Figma/source/data/test evidence only；截图不阻塞完成”，并补齐逐路由 node/evidence matrix；不把静态结果表述为像素级视觉通过。

## 2026-08-17 C7 战术板在线 Figma 复原与真实截图复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:877 / LEGACY / C7 Tactical Board PoC`。页面从旧的绿色比赛战术布局改为 Figma 的白色 88px 顶栏、深紫 `343×380px` 球场、三个中轴圆、半场线、红色真实球员标记、阵型文字、五项工具栏、红色录制/保存按钮和教练 TabBar。
- 真实业务边界保持：球员、阵型、比赛、只读权限、拖动、换位、重置和保存仍由既有 API/角色守卫驱动；没有加入 Figma 中不存在于当前 API 的蓝色对方球员、样例姓名或伪保存响应。WXML 未使用 `.map()`、`.filter()`、`.slice()`、`.indexOf()`。
- 新增 C7 局部 SVG 图标，避免 WXSS 长 base64；顶栏继续使用动态 `navInset/menuInset`，并采用 `height:176rpx + box-sizing:content-box`，保证微信状态栏不侵占 Figma 内容高度。
- 可信运行态证据：`tmp/coach-runtime-acceptance/C7-acceptance-phone-final.png`，屏幕裁剪结果严格 `375×812`；Figma 离线对照图为 `docs/design/reference/figma/c7-tactical-board-poc.png`。动态真实学员短名和只读比赛数据与画板样例数字不同，属于数据差异；结构、色彩、层级和固定底部工具区已按截图复验。
- 验证：C7 聚焦 Vitest `6/6`、小程序 typecheck、根 `check`（domain `19/19`、小程序 `327/327`、API `104/104`）和 `git diff --check` 均通过。

## 2026-08-17 C6/C6.1/C6.2 教练端运行态截图补证

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv`，C6 `93:796`、C6.1 `93:827`、C6.2 `93:858`。本轮使用真实受保护教练会话和比赛 `event-cq-talent-demo-match-completed`，确认 C6 返回 `200`、真实比分 `3:2`、真实名单 16 人和真实比赛事件；不使用 secure-test 的 `403` 响应或 Figma 示例数据替代业务数据。
- C6.1 通过真实页面录入分钟 `45` 后回到 C6；C6.2 真实显示“未提交草稿已保存”，并明确“这条未提交的比赛事件仅保存在当前设备”。这是设备本机草稿契约，不宣称服务端自动保存。
- 可信屏幕像素证据：C6 `tmp/coach-runtime-acceptance/C6-acceptance-coach-final.png`、C6.1 `tmp/coach-runtime-acceptance/C6-1-acceptance-coach-final.png`、C6.2 严格 `375×812` 的 `tmp/coach-runtime-acceptance/C6-2-acceptance-phone-clean.png`；C6.2 对照图为 `tmp/coach-runtime-acceptance/C6-2-acceptance-compare-final.png`。C6.2 的遮罩、弹层层级、圆角卡片、继续/退出按钮顺序和底部教练导航与在线画板结构一致；比赛标题、比分、时间和本机保存时间属于动态真实数据差异。
- C6 视觉修复仍为最小改动：`apps/miniprogram-cq-talent/pages/coach/match/index.wxss` 将内容区顶部留白调整为 `88rpx`，并在 `index.test.mjs` 增加布局回归断言。C6/C6.1 聚焦测试先红后绿 `15/15`；本批提交前已重新运行全仓门禁、TypeScript 与 `git diff --check`。

## 2026-08-17 C11 测评任务运行态视觉复验与几何收口

- 在线唯一基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。Figma 的 `331px` Task List 是外层容器，内含左右 `16px` gutter；可见任务卡应为 `299×116px`。已将页面内容横向内边距收口为 `76rpx`，并按画板的筛选器内嵌节奏调整为 `64rpx` 顶部/`28rpx` 卡前间距。
- C11 顶栏使用 `height:calc(176rpx - navInset)` 与 `padding-top:navInset` 保持合计 `88px` 的安全区包络，不再因状态栏内边距把正文向下推移。真实 BFF 的任务、日期、状态、进度、筛选、角色守卫和无创建 API 时的诚实提示均未改变。
- 可信 375×812 证据：`tmp/coach-runtime-acceptance/C11-acceptance-phone-final.png`；在线稿对照：`tmp/coach-runtime-acceptance/C11-figma-online-20260817.png`；并排图：`tmp/coach-runtime-acceptance/C11-acceptance-compare-final.png`。筛选、卡片、进度轨、FAB、底栏的几何已复验；具体日期/状态/进度和原生状态栏、微信胶囊是动态数据或设备系统层差异。
- 验证先红后绿：C11 聚焦 Vitest `8/8`、小程序 typecheck 与 `git diff --check` 通过；根 `npx --yes pnpm@10.33.0 run check` 全绿（domain `19/19`、mini-program `327/327`、API `105/105`）。

## 2026-08-17 C12 项目评分录入真实运行态视觉收口

- 在线唯一基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1030 / C12 Project Score Entry`。真实教练路由为 `pages/coach/test-entry/index?eventId=event-cq-talent-demo-training-upcoming`；安全测试活动返回 `403 Event is not accessible for this coach membership`，未绕过该权限契约。
- C12 保留真实的 16 名学员、62 个评分字段、活动/模板名称、评分草稿、缺测和提交链路。为避免真实长指标撑高卡片，`displayLabel` 在 TypeScript view model 中预计算并在 WXML 单行展示；项目分组与上一项/下一项导航移至学员列表之后，首屏不再被导航控制区占据。
- 运行态对照发现 C12 自定义顶栏仍把 `176rpx` 内容高度与 `navInset` 相加，令正文整体下移约一个状态栏高度。已改为 88px 安全区包络并固定 `331×96px` 任务卡；学员区恢复任务卡后的 20px 间距和 8px 内上边距。没有改动 API、角色、草稿或真实数据。
- 可信证据：在线稿 `tmp/coach-runtime-acceptance/C12-figma-online-20260817.png`；真实模拟器图 `tmp/coach-runtime-acceptance/C12-acceptance-phone-final.png`（严格 `375×812`）；并排图 `tmp/coach-runtime-acceptance/C12-acceptance-compare-final.png`。顶栏、任务卡、列表、保存区、TabBar 已复验；状态栏/微信胶囊和真实数据文本为允许差异。
- 已完成红→绿 C12 定向回归、Mini Program typecheck 和 `git diff --check`。C12 最新聚焦 Vitest `18/18`；串行全仓门禁通过，domain `19/19`、mini-program `332/332`、API `105/105`，退出码 `0`。此前两项 SQLite 重开超时是旧并发检查记录，不再代表当前门禁状态。

## 2026-08-17 C13 学员能力雷达真实运行态视觉收口

- 在线唯一基准已通过 Figma MCP 重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1080 / C13 Student Radar`；真实路由为 `pages/coach/student-radar/index`。
- 运行态发现并修复 C13 顶栏安全区问题：`.radar-nav` 原为 `176rpx + navInset`，导致自定义顶栏比画板高约一个状态栏高度；现改为 `88rpx + box-sizing:content-box`，保留动态状态栏和菜单胶囊避让。
- 可信屏幕像素证据已保存：`tmp/coach-runtime-acceptance/C13-acceptance-phone-final.png`（首屏）、`tmp/coach-runtime-acceptance/C13-acceptance-phone-bottom.png`（底部评语区）和 `tmp/coach-runtime-acceptance/C13-acceptance-compare-final.png`，输出均严格 `375×812`。顶栏、chips、`343×260px` 雷达卡、维度评分卡、评语容器和 70px 教练 TabBar 的几何已完成对照。
- 真实数据不替换为 Figma 样例：当前会话返回 2 名学员、8 个维度、总分 `83`、评估期 `2026-08-05`，评语显示“能力评语暂未同步”；这些是 API 数据/空态差异。状态栏、微信胶囊和 Home Indicator 属系统壳层差异。
- 验证：小程序 `54/54` 文件、`330/330` 测试，domain `19/19`，API `105/105`；全仓 typecheck、`git diff --check` 均通过。C13 变更仅涉及 `apps/miniprogram-cq-talent/pages/coach/student-radar/` 和对应文档/任务记录。

## 2026-08-17 C14 团队能力总览真实运行态视觉收口

- 在线唯一基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`；在线节点实际为 `375×1258`，首屏以 `tmp/coach-runtime-acceptance/C14-figma-online-top-20260817.png` 对照。
- 真实截图发现 `radar-canvas` 在 C14 的纵向 flex 容器中没有取得页面传入的 `.ability-hero__canvas` 尺寸：普通 `class` 被组件样式隔离，原生 canvas 图层上浮进标题区。共享组件现声明受控 `host-class` 并把它应用于根容器；C14 同时在 `wx.nextTick` 后挂载 canvas，确保布局稳定后才创建原生节点。该外部样式类没有改变其它调用方。
- `综合 81` 的真实值继续来自团队能力 BFF；仅将字号从 `40rpx` 调整为在线截图对应的 `96rpx`。当前团队名称、8 个能力维度、综合 `81`、趋势 `+1.3`、评估时间/排名未同步均为真实数据差异，未填入 Figma 样例。
- 可信 `375×812` 最终证据：`tmp/coach-runtime-acceptance/C14-acceptance-phone-final.png` 与 `tmp/coach-runtime-acceptance/C14-acceptance-compare-final.png`。顶栏、上下文、深色雷达卡、综合分/趋势、统计卡及教练 TabBar 已完成首屏对照；状态栏与微信胶囊属于系统壳层差异。
- 验证：C14/共享雷达组件定向 Vitest `7/7`、小程序 typecheck、`git diff --check` 与根 `npx --yes pnpm@10.33.0 run check` 全绿（domain `19/19`、小程序 `330/330`、API `105/105`）。

## 2026-08-17 C15 能力评估录入真实运行态视觉收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15 Assessment Entry`。在线画板当前为 `375×1002`，故保存动作和教练 TabBar 应位于学员列表之后；此前仅作静态验收时沿用的固定底部布局会遮住首屏真实学员内容。
- 运行态确认 C15 将 `navInset` 与 `176rpx` 内容高度叠加，令顶栏比 Figma 高一个状态栏。现改为 `88rpx + content-box`，并移除返回箭头与标题间多余间隔；真实模板、草稿和逐学员提交契约没有改动。
- 共享 `role-tabbar` 新增默认关闭的 `flow` 属性，只有 C15 显式开启，其他页面继续固定底栏。C15 的保存动作和 TabBar 因此按在线长页顺序流动，不再覆盖首屏。
- 为匹配 6px Figma 指标轨道，同时保持真实触控录入，C15 将原生 slider 设为透明交互层，TS view model 预计算 `progressPercent`，WXML 仅渲染预计算宽度的轨道；未在 WXML 调用 JS 方法。学员副标题取真实 `getCoachTeam()` 的团队名。
- 可信证据：`tmp/coach-runtime-acceptance/C15-acceptance-phone-final.png` 与 `tmp/coach-runtime-acceptance/C15-acceptance-compare-final.png`，均为 DevTools `print_window` 通道生成的严格 `375×812` 图。真实服务器目前提供两名学员、七个指标、真实团队名和空草稿，而在线稿为三名/六项/样例分数；这些是数据差异，未伪造以求像素相同。
- 验证先红后绿：C15 + `role-tabbar` 定向 Vitest `332/332`、小程序 typecheck、`git diff --check` 通过；根 `npx --yes pnpm@10.33.0 run check` 已以完整后台日志得到 `CHECK_EXIT_0`（domain `19/19`、mini-program `332/332`、API `105/105`）。

## 2026-08-17 C15.1 评估提交真实运行态视觉收口

- 在线唯一基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1163 / C15.1 Assessment Submit`。真实教练路由为 `pages/coach/assessment-submit/index?title=%E8%83%BD%E5%8A%9B%E8%AF%84%E4%BC%B0&count=2`，页面只接受已认证 coach、经过解码的标题及正整数人数。
- 运行态发现顶栏仍将 `176rpx` 与 `navInset` 叠加，令粉色导航和后续内容整体下移一个状态栏高度。现按画板的 88px 安全区包络收口为 `88rpx + content-box`，同时把左右内边距/标题间距调为画板的 16px/8px 节奏。
- 为保持真实语义，成功标题现在由合法路由标题派生（如“能力评估已提交”）；主按钮收敛为“查看结果”，仍只跳转既有团队能力总览。画板的“24小时 / 处理中 / 18名 / 技术评估”未被伪装成生产数据。
- 可信 375×812 证据：`tmp/coach-runtime-acceptance/C151-acceptance-phone-final.png` 与 `tmp/coach-runtime-acceptance/C151-acceptance-compare-final.png`；截图通道为 DevTools `print_window`。摘要卡和操作区已对齐在线稿；动态真实数据、状态栏、微信胶囊及 Home Indicator 属允许差异。
- 截图链路同步修复：当 DevTools 不在前台时，`PrintWindow` 会得到纯白帧、桌面 fallback 会截到 Codex。现在在捕获前桥接当前前台输入线程并在 `finally` 解除桥接，实测可自行切回 DevTools 后输出严格 `375×812`。
- 验证先红后绿：C15.1 定向 Vitest `4/4`、截图脚本 Python 回归 `6/6`、`git diff --check` 与根 `npx --yes pnpm@10.33.0 run check` 全绿（domain `19/19`、mini-program `332/332`、API `105/105`）。

## 2026-08-17 C16 教练“我的”真实运行态视觉复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me`。Figma 顶栏内容区为 88px，标题左内边距为 16px；身份切换组件仍只应在服务端确认的双角色会籍下显示。
- 运行态根因是 `.c16-bar` 使用 `176rpx` 内容高度，同时 WXML 已为真实状态栏注入 `navInset`，令顶栏及后续内容整体下移。现将该内容区收口为 `88rpx + box-sizing: content-box`，并把左内边距从 `44rpx` 收口为与在线稿对应的 `32rpx`；右侧仍由现有 `menuInset` 避让真实微信胶囊。
- 真实业务边界未改：教练姓名、球队和三项统计继续来自 `getCoachHome()`；身份切换仍由 `switchActiveRole` 的服务端会话确认，四项菜单和退出登录行为不变。截图中的 `Secure parent 1`、球队和统计与 Figma 示例不同，属于真实数据差异。
- 可信证据保留在本机忽略目录：`tmp/coach-runtime-acceptance/C16-acceptance-phone-final.png`（`print_window` 通道、严格 `375×812`）及 `tmp/coach-runtime-acceptance/C16-acceptance-compare-final.png`。顶栏底线、首张卡片起点、角色入口、菜单、退出按钮和教练 TabBar 已完成对照；系统状态栏、微信胶囊与真实数据文案按设备/数据差异豁免。
- 验证先红后绿：C16 定向 Vitest `9/9`、小程序 TypeScript 和 `git diff --check` 通过。最初两次根检查在 30 秒命令窗口后留下重叠的 SQLite 测试进程，曾诱发 `apps/api/test/app-client-match-event-create.test.ts:135`（10 秒）与 `apps/api/test/persistence.test.ts:13`（15 秒）的重开超时；这不是本次 C16 或仓库的最终门禁结果。确认没有残留进程后，以单一串行会话复跑 `npx --yes pnpm@10.33.0 run check`，明确 exit `0`：domain `19/19`、mini-program `332/332`、API `105/105` 全部通过。后续根检查必须等待前一轮完全退出，避免并行 SQLite worker 制造假失败。

## 2026-08-17 C16.1 教练权限范围真实运行态视觉收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1210 / C16.1 Permission Scope`。在线稿 TopNav 内容区为 88px，左内边距为 16px；换算到当前小程序为 `88rpx` 与 `32rpx`。
- 运行态基线证实 `.c161-nav` 的 `176rpx` 内容高度与 WXML 的真实 `navInset` 叠加，令标题和后续内容下移；现按 C16 同一安全区规则收口为 `88rpx + box-sizing: content-box`，左内边距收口为 `32rpx`。返回动作、右侧胶囊避让、TabBar 和背景未改。
- 当前真实 coach 会话没有已配置的 `roleEntrypoints.coach`，因此页面显示“暂无可用入口 / 仅管理员可调整”。在线稿的五项权限、开关和“保存更改”属于配置就绪样例；没有服务端契约时未伪造成真实数据或可用操作。
- 曾出现 `9424` Automator 连接拒绝，根因是旧会话端口失效而非页面或 API。重新读取当前 IDE HTTP 端口 `61245` 并通过唯一注册入口更新为 `9420` 后，路由握手确认 `pages/coach/permissions/index`，再取得可信截图。
- 可信证据：`tmp/coach-runtime-acceptance/C161-runtime-baseline-valid.png`、`C161-runtime-baseline-valid-compare.png`、`C161-acceptance-phone-final.png`、`C161-acceptance-compare-final.png`；均由 DevTools `print_window` 通道生成，最终图严格 `375×812`。修复后顶栏粉色边界、标题位置和 body 起点与在线稿的几何结构一致；系统状态栏、微信胶囊、TabBar 图标细节及空态/就绪态数据差异按运行环境与服务端数据豁免。
- 验证先红后绿：C16.1 定向 Vitest 先因旧 `176rpx/44rpx` 失败（1 failed / 4），改动后 `4/4` 通过；尚待本任务最后一次全仓门禁与独立提交。

## 2026-08-17 C16.2 教练私教兴趣真实运行态视觉收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1238 / C16.2 Private Interest`。在线稿要求 88px 粉色顶栏、返回箭头、居中标题和右侧 24px 占位；内容卡片左右内边距为 22px。
- 运行态基线发现两个确定的视觉差异：`.c162-nav` 仍为 `176rpx`，且 WXML 没有右侧占位，导致标题靠左。现将顶栏收口为 `88rpx + content-box`、右侧避让为 `200rpx`，补齐 `c162-nav__placeholder`，并使标题 `flex: 1; text-align: center`。
- 真实数据边界保持不变：当前会话只提供 `capabilities.features.private_lessons`，没有接单状态、周时段、价格或持久化契约。运行截图中的“暂无法确认俱乐部是否已开通私教服务 / 状态待同步 / 当前教练可用时段尚未接入”保留为诚实状态，未伪造 Figma 的 17:00–20:00 样例、绿色开关或确认排期。
- 可信证据：`tmp/coach-runtime-acceptance/C162-runtime-baseline.png`、`C162-runtime-baseline-compare.png`、`C162-acceptance-phone-final.png`、`C162-acceptance-compare-final.png`；均由当前 DevTools Automator 端口 `9420` 路由确认后使用 `print_window` 通道生成，最终 PNG 严格 `375×812`。状态栏、微信胶囊、TabBar 图标细节及配置样例/真实空契约差异按环境与数据边界豁免。
- 验证先红后绿：C16.2 定向 Vitest 先因缺少居中标题/占位和旧顶栏失败（1 failed / 4），补齐最小结构与样式后 `4/4` 通过；尚待本任务最后一次全仓门禁与独立提交。

## 2026-08-17 C16.3 教练账号真实运行态视觉收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`。在线稿为 88px 粉色 TopNav，标题居中，左侧返回与右侧 24px 占位维持视觉平衡。
- 运行态基线确认当前页仍有 `176rpx` 顶栏、无右侧占位和标题左对齐。现将 `.c163-nav` 收口为 `88rpx + content-box`，右侧按在线稿胶囊避让为 `200rpx`，增加无交互 `c163-nav__placeholder`，标题改为 `flex: 1; text-align: center`。
- 真实数据边界不变：显示名来自认证 coach session；球队来自单一的近 30 天 `getCoachHome()` 请求并受已有 request-token 防过期保护。手机号、微信绑定、密码、设备、缓存、编辑、认证及所有写操作没有可靠契约，运行图继续诚实显示“当前会话未提供 / 状态待同步”，未伪造 Figma 样例。
- 可信证据：`tmp/coach-runtime-acceptance/C163-runtime-baseline.png`、`C163-runtime-baseline-compare.png`、`C163-acceptance-phone-final.png`、`C163-acceptance-compare-final.png`。均先通过 Automator `9420` 确认路由 `pages/coach/account/index`，再经 `print_window` 生成严格 `375×812`。状态栏、微信胶囊、TabBar 图标细节及样例账号内容属于系统/真实数据差异。
- 验证先红后绿：C16.3 定向 Vitest 先因缺少右侧占位和旧顶栏失败（1 failed / 5），最小 WXML/WXSS 修复后 `5/5` 通过；尚待本任务最后一次全仓门禁与独立提交。

## 2026-08-17 C16.4 教练帮助中心真实运行态视觉收口

- 在线唯一基准已通过 Figma MCP 重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`。画板 TopNav 内容区为 88px；之前 `.c164-nav` 声明 `176rpx + content-box`，与 WXML 的真实 `navInset` 叠加后把搜索框和正文整体下移。
- 运行态基线 `tmp/coach-runtime-acceptance/C16.4-baseline.png` 证实该几何偏差。按已验收 C16.2/C16.3 的同型安全区规则，将 `.c164-nav` 收口为 `88rpx + box-sizing: content-box`；返回、居中标题、右侧占位、真实 FAQ 搜索/筛选/展开、支持空态和教练 TabBar 均保持不变。
- 修复后可信屏幕像素证据为 `tmp/coach-runtime-acceptance/C16.4-after-height-fix.png`（首屏）和 `tmp/coach-runtime-acceptance/C16.4-bottom.png`（下段），均严格 `375×812`，来源 `print_window`。搜索框、快速上手区、FAQ 起点与在线稿垂直结构对齐；真实接口当前返回的分类/问题数量及“支持方式待配置”与 Figma 样例不同，属于数据/契约差异，未伪造样例客服、公众号或咨询操作。
- 排障确认微信提示来自 `apps/miniprogram-cq-talent/scripts/__pycache__` 的 Python 生成缓存；该目录及 `.pyc` 已移除，后续截图统一使用 `python -B`，未修改 `project.config.json`。`donutAuthorize__` 是微信工具保留目录名提示，不是业务页面目录。
- 验证先红后绿：C16.4 定向 Vitest `4/4`、小程序 typecheck、`git diff --check` 和串行根门禁均通过；根门禁为 domain `19/19`、小程序 `332/332`、API `105/105`，退出码 `0`。

## 2026-08-17 P0 微信手机号授权单飞防重入任务收口

- 已确认实现提交 `3d4837b` 已在当前 `dev` 分支，不在遗留 hotfix worktree：登录按钮触摸入口同步取得锁，原生回调只消费一次；取消、空 code、`getPhoneNumber too frequently` 和超时均不自动重试，只有用户显式重试才释放锁。
- 真实登录契约未改变：没有伪造手机号、验证码、session、角色或 API 响应；`binding_required`、无孩子家长档案和错误提示继续保持受限状态，错误文案不回显原始授权/API payload。
- 验证：`pages/login/index.test.mjs` 定向 Vitest `15/15`，小程序 TypeScript typecheck 通过；该实现已随最近一次串行根门禁验证（domain `19/19`、mini-program `332/332`、API `105/105`）。

## 2026-08-17 双角色切换任务收口

- 复核 `08-10-active-role-switch`：服务端通过 SQLite 持久化哈希 bearer session，能力声明为 `X-App-Client-Capabilities: active-role-switch-v1`；双角色登录先创建 `activeRole: null` 的待选择 session，选择和日常切换都必须经过服务端 `POST /session/role`，每次轮换 token，旧 token 立即失效。
- 复核授权边界：每次 bearer 请求重新检查 club、app-client、用户、精确 membership、当前 entrypoint-filtered `availableRoles` 和 active role；本地修改 active role、`roleHint` 或旧 token 都不能获得另一端权限。父端只投影 guardian children，教练端不返回家长 children。
- 复验：`apps/api/test/app-client-role-switch.test.ts` 为 `2/2`（双实例、关闭全部实例后文件型 SQLite 重开、角色删除/用户/会籍/client 失效和 token 轮换）；OpenAPI/login 契约为 `2/2`；小程序登录选择器、家长/孩子/教练切换入口为 `44/44`。
- 本仓库任务的实现验收已满足；生产双角色测试账号导入、真实微信授权和真机运行态登录仍属于独立部署/设备验收，不以本地测试冒充生产证据。

## 2026-08-18 WeChatIDE MCP 截图通道迁移

- 已将可信视觉截图默认切换为 `scripts/devtools/wechatide-mcp-capture.cjs`：通过 WeChatIDE MCP 编译/打开精确路由，读取 `currentPage` 与 `systemInfo`，请求 `simulator_screenshot(optimize=false)`，再用 Pillow 归一化输出严格 `375×812` PNG + JSON sidecar。
- 已补充 MCP stdio JSON-RPC 客户端、Windows 中文安装路径的 encoded PowerShell 启动、路由/视口/PNG 比例 fail-closed 校验和原子发布；不触碰登录、授权、session、角色或 API 数据。
- 已更新 `scripts/devtools/README.md`、本地手工验收文档和两份交接文档。旧 Automator/PrintWindow/桌面裁图仅保留为人工明确指定的紧急回退。
- 当前真实 MCP smoke 已完成 Codex 客户端授权、工具发现和路由调用；当前模拟器实际是 iPhone 12/13 (Pro) 的 `390×844`，命令按 375×812 门禁停止，未伪造截图证据。切回 iPhone X 后可直接重跑同一命令完成最终 PNG/sidecar smoke。

## 2026-08-18 C11 测评任务浮动新增按钮层级复验

- 在线 Figma 基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。真实 iPhone X `375×812` 截图确认原 `.tasks-fab` 的 `z-index: 20` 被固定教练 TabBar（`z-index: 9999`）遮盖，只露出圆形按钮上半部。
- 已按测试先行将 C11 的布局断言从旧层级升级为 `z-index: 10000`：先观察到定向 Vitest 因旧值失败，再以单行 WXSS 改动使新增按钮浮于 TabBar 之上。没有改变测评任务 API、创建能力提示、真实任务数据或跳转行为。
- 新的可信证据：`tmp/coach-runtime-acceptance/C11-20260818-fab-layer.png`（真实 WeChatIDE MCP 模拟器）与 `tmp/coach-runtime-acceptance/C11-20260818-figma-online.png`（在线画板）。两张均为 `375×812`；任务日期、进度和状态仍为真实 API 数据差异。
- 验证：C11 定向 Vitest `332/332`、小程序 TypeScript `tsc --noEmit`、限定路径 `git diff --check` 均通过；全仓串行门禁待本轮其他页面审计结束后统一复跑。

## 2026-08-18 C15/C15.1 WeChatIDE MCP 运行态复验

- 在线 Figma 已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15 Assessment Entry` 与 `93:1163 / C15.1 Assessment Submit`。本轮截图改走 `scripts/devtools/wechatide-mcp-capture.cjs`，不是旧 Automator/PrintWindow 通道。
- C15 使用真实教练会话与接口任务 `assessment-template-technical`（“速度耐力体测”）打开；MCP sidecar 确认路由 `/pages/coach/assessment-entry/index`、原始及归一化 PNG 均为 `375×812`。证据：`tmp/coach-runtime-acceptance/C15-20260818-mcp-3.png`、`C15-20260818-mcp-3.png.json`、`C15-20260818-mcp-compare.png`。
- C15 顶栏、左返回、保存草稿、能力分组胶囊、学员卡、真实滑杆轨道、保存按钮和教练 TabBar 的几何与在线稿一致。Figma 示例有三组分组、三名学员和六项评分；当前真实模板只返回一个可录入分组、两名学员和真实指标，因此完整样例数量/分组差异标为数据/契约阻塞，不补造 Figma 数据。
- C15.1 使用 coach 角色、正整数真实确认人数契约打开提交态；MCP sidecar 确认 `/pages/coach/assessment-submit/index` 为 `375×812`。证据：`tmp/coach-runtime-acceptance/C151-20260818-mcp-1.png`、`C151-20260818-mcp-1.png.json`、`C151-20260818-mcp-compare.png`。成功图标、标题区、摘要卡、状态胶囊、双按钮和 TabBar 结构复验通过；任务标题、人数与状态按真实路由数据展示，未伪造在线稿中的“技术评估/18名/处理中”。本轮未重复写入生产评估，仅复验已存在的提交态路由契约。
- 诊断记录：第一次 C15 失败截图由 shell query 转义把模板 ID 变为 `assessment-template-technical^`，MCP network 明确返回 404；改用正确的 `&` 查询后复验成功。该问题属于取证命令，不是页面/API 业务缺陷。

## 2026-08-18 C16 退出登录按钮宽度收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me`。Figma 的退出登录 CTA 横向占满正文内容区（375px 画板中约 331px），而真实 MCP 截图中的原生 `<button>` 仅渲染为约 183px，属于明确的运行态视觉差异。
- 根因是该 CTA 继续使用微信原生 `button` 的默认布局行为；在相同 WXSS `width: 100%` 下仍被收缩。按项目其他自定义 CTA 的模式改为普通 `view` 交互节点，并显式使用 `display: flex`、`box-sizing: border-box`、`align-items/justify-content: center`，保留原有 `logout` 逻辑、确认弹窗和会话清理边界。
- 可信复验：`tmp/coach-runtime-acceptance/C16-20260818-mcp-after-logout-fix.png`，WeChatIDE MCP `simulator_screenshot`，严格 `375×812`；按钮已从约 183px 恢复为正文全宽约 331px，位置、红色描边、圆角和文字居中与在线稿一致。教练姓名、球队、统计、状态栏和微信胶囊仍按真实数据/系统壳层豁免。
- 验证先红后绿：C16 定向 Vitest 先因原生 button 标记与布局断言失败（1 failed / 9），改动后 `54` 个测试文件、`332/332` 用例通过；小程序 typecheck、`git diff --check` 和 MCP 截图均通过。本批代码文件待路径限定独立提交。

## 2026-08-18 七槽位安全演示账号幂等性修复与生产发布

- 提交 `afd20e0` 将 secure demo 的运营档案完整性由不可靠的固定行 ID 改为真实 SQLite 唯一边界 `(club_id, student_id)`：已存在的合法旧运营档案不被覆盖，完整安装的受控导入会正确返回 `already_present`。回归测试覆盖两个旧 ID 档案保留场景；提交 `30d2869` 同步记录脱敏交接与生产回读。
- 本地最终门禁：`npx --yes pnpm@10.33.0 run check` 退出 `0`（domain `19/19`、mini-program `332/332`、API `109/109`）；白名单 diff 检查通过。两笔提交均已推送 `dev`，未连带任何小程序、任务归档、工具或用户文件的在途改动。
- 经明确生产授权，已由纯 Git 提交树构建并发布 API release `30d2869`。发布前建立了受限 SQLite 一致性快照，并在私有服务器区域保留 WAL/SHM 状态；旧镜像以仅供回退的标签保留。发布只重建 `cq-talent-api`，不重跑 confirmed import、不清理数据库、不重建其他服务。
- 启动发布器最初把无间隔的 18 次 `/health` 查询误判为失败；只读诊断确认容器随后正常启动、退出码为 `0`、监听仍仅限 `127.0.0.1:3000`。之后内网和 `https://cqtc.pomi.tech/health` 均为 HTTP `200`，运行镜像标签为 `30d2869`。
- 生产受控 CLI dry-run 返回且仅返回 `{"operation":"import","status":"already_present","accountCount":7}`。临时创建并在 `finally` 精确删除的 14 个短时 bearer session 完成 BFF 回读：7 个家长 scope 合计 14 名绑定孩子、每槽至少 8 条能力指标；7 个教练 scope 合计 56 名队员、每槽 8 维雷达数据和一个已保存的 8 人战术板。日志、文档与结果均未记录手机号、token 或凭据。
- 本条是生产 API/数据回读证据，不替代任何真机微信手机号授权、首次角色选择、双角色切换或视觉验收。

## 2026-08-18 P5 新版 Figma 静态复原（家长会话待补）

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:278 / P5 Ability Radar`。新版画板明确为六维深色雷达模型：`#07111f` 主卡、`#1f1f24` 雷达画布、五层网格、六个真实分值胶囊、纵向“综合评分”以及六行维度详情。
- 代码批次将家长雷达展示模型限制为最多六个真实且可量化指标；八维真实数据不会被伪造成 Figma 样例，超出六项的指标仍由成长/指标详情契约承载。`radar-canvas` 新增 opt-in `geometry="p5"`，默认调用方的四维网格、方向和同龄基准绘制保持不变。
- 本批已完成 P5 顶栏、玩家胶囊、主卡/画布高度、综合分、维度条和 P5 专用雷达绘制参数；没有改 API、登录、角色或生产数据。
- 静态证据：P5 定向 Vitest `7/7`、小程序 TypeScript `tsc --noEmit`、限定路径 `git diff --check` 通过。在线 Figma PNG 临时取证已获取并保存于系统临时目录；可信运行态截图尚未发布。
- 运行态阻塞如实记录：当前微信开发者工具会话为不含 `parent` 可选角色的 coach 会话，尝试打开 `/pages/parent/radar/index` 被守卫留在 `/pages/coach/me/index`；C16 页面也没有渲染 `.c16-role-switch`。未执行会写入生产 SQLite 的旧种会话脚本，因此本条不能宣称 P5 视觉验收通过。

## 2026-08-18 C5 课时确认最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:734 / C5 Lesson Confirm`。本轮在施工前取得 design context 与原始 `375×812` 在线截图，确认最新画板仍是软粉 88px 顶栏、深色活动摘要、紧凑课时名单、底部“确认全部 / 发起更正”和三栏教练 TabBar。
- 使用当前已认证教练会话的真实活动 `event-cq-talent-secure-test-1-trn-0813` 打开 C5 成功态。WeChatIDE MCP sidecar 证实路由为 `/pages/coach/lesson/index`、运行窗口及输出 PNG 均为严格 `375×812`；证据位于系统临时目录 `cq-talent-runtime-c5-success-20260818-a.png`，在线稿及并排图为 `cq-talent-figma-c5-current-20260818.png`、`cq-talent-c5-compare-20260818.png`。
- 运行截图的活动标题、队名/时间、两名名单和“1课时”均来自真实 BFF；在线稿中的五名样例、日期和“1.5课时”不写回页面。除真实数据数量造成的白色内容区长度不同外，顶栏、活动卡、名单几何、确认操作和 TabBar 对齐，无需新增代码改动。

## 2026-08-18 C5.1 课时更正最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:765 / C5.1 Lesson Correction`。当前在线稿为软粉顶栏、警示卡、紧凑更正名单、正常内容流保存按钮和三栏教练 TabBar。
- 对照同一真实教练活动的 MCP 截图，修正了一处静态标题文案：`需要更正的学员` → `需更正学员`。真实服务端没有“系统差异”字段，因此保留真实的“课时调整”、实际姓名和“课时余额待核对”状态，未填入 Figma 样例头像、异常标签或 `1.5课时`。
- 截图前已调用 WeChatIDE MCP `simulator_refresh`，避免旧 bundle；最终 sidecar 证实 `/pages/coach/lesson-correction/index` 和 PNG 为严格 `375×812`。在线稿、最终运行图和并排图均位于系统临时目录，文件前缀分别为 `cq-talent-figma-c51-current-20260818`、`cq-talent-runtime-c51-after-refresh-20260818`、`cq-talent-c51-after-refresh-compare-20260818`。
- 验证按红→绿完成：C5.1 定向 Vitest `7/7`、小程序 TypeScript `tsc --noEmit`、限定路径 `git diff --check` 均通过。

## 2026-08-18 C6 比赛记录最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:796 / C6 Match Entry`。最新画板的内容区为顶栏后 `16px` 间距、深色比赛摘要、白色事件卡和固定教练 TabBar。
- 真实 `375×812` 基线确认 `.match-page__content` 仍保留旧的 `44px` 顶部留白，使英雄卡与事件卡整体下移约 `28px`。现按在线节点改为 `padding: 32rpx 32rpx 200rpx`；刷新模拟器并重截后，英雄卡顶边已与画板对齐，事件卡也回到正确首屏位置。
- 截图使用当前教练有权限的完成比赛 `event-cq-talent-secure-test-1-completed-match`。比赛标题、`4:2` 比分、七条事件、事件标签和当前 BFF 没有提供的分半场明细均保持真实数据；没有把 Figma 的样例对手、0:0 或四条事件写入前端。
- 可信在线稿、最终运行图和并排图位于系统临时目录，前缀为 `cq-talent-figma-c6-current-20260818`、`cq-talent-runtime-c6-after-gap-20260818`、`cq-talent-c6-after-gap-compare-20260818`。验证先红→绿：C6 定向 Vitest `10/10`、小程序 TypeScript `tsc --noEmit` 和限定路径 `git diff --check` 通过。

## 2026-08-18 C6.1 添加比赛事件最新在线稿验收状态

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:827 / C6.1 Add Match Event`。该画板要求事件类型、时间、球员、备注和提交动作；源码仍按真实 `capabilities.match.eventTypes`、真实比赛详情和名单构建，没有硬编码 Figma 的六个样例选项、45 分钟、球员头像或备注。
- 当前已认证教练会话打开 `event-cq-talent-secure-test-1-completed-match` 后，BFF 真实返回“当前客户端未配置可记录的比赛事件类型”，因此页面进入安全空态而不是 Figma 的可录入样例。该空态截图已由 WeChatIDE MCP 生成，sidecar 确认路由和图片均为严格 `375×812`；证据前缀为 `cq-talent-runtime-c61-baseline-20260818`，在线稿/并排图为 `cq-talent-figma-c61-current-20260818`、`cq-talent-c61-baseline-compare-20260818`。
- 此项不能宣称 C6.1 成功态视觉通过。阻塞点是生产会话的客户端能力配置，非 WXML/WXSS 几何缺陷；未改写真实 API 契约，也没有生成或提交任何比赛事件。

## 2026-08-18 C6.2 草稿保存态最新在线稿验收状态

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:858 / C6.2 Save State`。新版画板是“比赛进行中”的全场暂停/结束背景上的自动保存弹层，文案为“已自动保存 / 比赛记录已暂存，可稍后继续编辑”。
- 当前实现的唯一可用状态是 C6.1 为一条未提交比赛事件生成的设备本机草稿：C6 再读取同一活动后才显示 `hasLocalDraftOverlay`。它不声称保存整场比赛，故现有“未提交草稿已保存 / 这条未提交的比赛事件仅保存在当前设备”文案是对真实存储范围的准确描述。
- 本会话的 C6.1 缺少 `capabilities.match.eventTypes`，没有真实可录入事件，因而不能无写入地形成可验证本机草稿；同时后端没有画板所示的比赛进行中、暂停、结束和整场自动保存契约。此页面当前仅完成在线稿/源码契约审查，不能标为成功态视觉通过，也不会用 setData、mock 或伪草稿强行截图。

## 2026-08-18 C7 战术板最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:877 / LEGACY / C7 Tactical Board PoC`。该节点虽标记为 LEGACY，仍是当前画板↔路由表中 `pages/coach/tactical-board` 的唯一节点；本轮以它作为只读设计参照。
- 真实 `375×812` 截图发现 `.c7-header` 仍为旧 `176rpx` 内容高度，加上真实状态栏后将球场整体推低约 `44px`。按画板的 88px 顶栏收口为 `height: 88rpx; box-sizing: content-box`，刷新后球场首尾与在线图对齐：从约 `y=136` 至 `y=516`。
- 验证使用有真实持久化战术板的 `event-cq-talent-secure-test-1-scheduled-match`。红色球员圆点、实际阵型 `4-3-3` 和仅当前会籍可见的名单均来自 BFF；未填入画板左右两队的假蓝方球员或编号。定向 Vitest `6/6`、小程序 TypeScript、限定路径 `git diff --check` 通过；在线稿、最终图和并排图的临时前缀分别为 `cq-talent-figma-c7-current-20260818`、`cq-talent-runtime-c7-after-header-20260818`、`cq-talent-c7-after-header-compare-20260818`。
- 画板的 LEGACY 布局将 TabBar 置于球场正下方，并让工具栏绝对覆盖其下方；生产小程序的共享 `role-tabbar` 是固定底栏，当前 C7 工具栏也固定在其上。这一处是画板自身与全局导航组件的结构冲突，尚不能宣称 C7 全页像素通过；本轮不为匹配该旧 PoC 而破坏全局 TabBar 行为。

## 2026-08-18 C8 训练管理最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:896 / C8 Training Management`。当前画板要求 88px 安全顶栏、16px 圆角的深色统计 Hero、40px 四项标签栏，首项文案为“训练计划”，训练状态标签按已排定/待确认/已结束区分色彩。
- 真实 `375×812` MCP 截图确认旧页面缺少 Hero 圆角、标签栏偏高 8px，且直接显示 API 原始状态码。现将 Hero 收口为 `32rpx` 圆角、标签栏改为 `80rpx`、激活文案改为“训练计划”；TypeScript view model 预计算真实状态的中文标签和色调，WXML 不执行 JavaScript 方法。
- 运行态使用认证 coach 的实际数据：统计为 `10 / 93% / 8 / 5`，训练名称、日期、地点、人数及已结束状态均来自 BFF；在线稿中的 `46 / 89% / 18 / 3`、U10 队和三个样例地点没有写入小程序。微信系统状态栏、胶囊和 Home Indicator 作为平台壳层差异保留。
- 在线稿、最终运行图及并排图位于系统临时目录，前缀分别为 `cq-talent-figma-c8-current-20260818.png`、`cq-talent-runtime-c8-refresh-20260818.png`、`cq-talent-c8-refresh-compare-20260818.png`；运行 PNG sidecar 确认路由 `/pages/coach/training/index`、原始和归一化尺寸均为严格 `375×812`。
- 验证先红→绿：C8 定向 Vitest 从 `3 failed / 4 passed` 到 `7/7` 通过，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。

## 2026-08-18 C9 队伍详情最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:924 / C9 Team Detail`。当前画板为软粉 TopNav、16px 圆角深色队伍摘要、四列学员网格、横向教练卡和固定教练 TabBar；设计稿的完整高度为 `375×871`，首屏按 `375×812` 运行态对照。
- 真实基线确认 `.team-nav` 的旧 `176rpx` 内容高度与注入的 `navInset` 叠加，令 Hero 从约 `y=104` 下移至 `y=148`。现收口为 `88rpx + content-box`，并同步按在线稿调整返回/标题的 8px 间距、18px 标题字级和 Hero 的 16px 圆角；读取、返回和学员雷达跳转契约不变。
- 最终 MCP 截图中 Hero 已回到 `y≈104`，成员区和设计稿首屏的结构起点恢复一致。实际会话返回 8 名学员、1 名教练、`10 / 93% / 8` 等真实数据，而在线稿为 12 名学员、3 名教练和示例数值，因此教练卡更早进入首屏；未填充或伪造名单。
- 在线稿、基线及最终运行证据位于系统临时目录：`cq-talent-figma-c9-current-20260818.png`、`cq-talent-runtime-c9-baseline-20260818.png`、`cq-talent-runtime-c9-after-20260818.png`。最终 sidecar 确认路由 `/pages/coach/team/index`，原始和归一化 PNG 均为严格 `375×812`。
- 验证先红→绿：C9 定向 Vitest 从 `1 failed / 6 passed` 到 `7/7` 通过，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。

## 2026-08-18 C10 训练内容选择最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:952 / C10 Training Content Select`。当前画板为软粉返回顶栏、搜索、横向分类、64px 训练卡、70px 底部选择栏和教练 TabBar；内容区左右为 22px、上下为 16px。
- 真实基线中旧 `.select-nav` 的 `176rpx` 使搜索框、分类和训练库列表整体下移约 44px；返回标题也比在线稿更大且与图标距离过宽。现收口为 `88rpx + content-box`，并将标题改为 18px、标题与返回图标的间距改为 8px；筛选、选择、保存后 BFF readback 和返回行为未改动。
- 最终 MCP 截图中搜索框起点为 `y≈105`，训练列表、底部选择栏和 TabBar 与在线稿首屏结构对应。当前真实训练库返回运控球、1v1 等分类/项目，当前活动也没有已选内容，故显示真实的空心选择圈、`已选 0 项`和禁用按钮；未填充 Figma 的四个样例项目和三项已选状态。
- 在线稿、基线和最终证据位于系统临时目录：`cq-talent-figma-c10-current-20260818.png`、`cq-talent-runtime-c10-baseline-20260818.png`、`cq-talent-runtime-c10-after-20260818.png`。最终 sidecar 证实路由 `/pages/coach/content-select/index`、查询为当前训练活动，归一化 PNG 严格为 `375×812`。
- 验证先红→绿：C10 定向 Vitest 从 `1 failed / 7 passed` 到 `8/8` 通过，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。

## 2026-08-18 C10.1 覆盖预览最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:983 / C10.1 Coverage Preview`。当前画板为软粉返回顶栏、紧凑覆盖卡（12px 内边距、10px 行间距、6px 轨道）、70px 底部确认栏和教练 TabBar。
- 基线中 `.coverage-nav` 仍为 `176rpx`，使“学员覆盖”和第一张卡片整体下移约 44px。现按在线稿将顶栏收口为 `88rpx + content-box`，返回/标题间距改为 8px，标题改为 18px/22px；确认仅调用本地返回，不新增或伪造覆盖写入。
- 最终 MCP 截图中“学员覆盖”从 `y≈153` 回到 `y≈109`，第一张真实覆盖卡紧随其后，确认栏与 TabBar 位置不变。运行态实际返回两名学员、每人 8 个维度、`覆盖 8/10` 和若干待同步项；在线稿为三名学员、三维样例，属真实数据/契约差异，未删减或填充。
- 在线稿、基线与最终证据位于系统临时目录：`cq-talent-figma-c101-current-20260818.png`、`cq-talent-runtime-c101-baseline-20260818.png`、`cq-talent-runtime-c101-after-20260818.png`。最终 sidecar 确认路由 `/pages/coach/coverage/index`，PNG 归一化为严格 `375×812`。
- 验证先红→绿：C10.1 定向 Vitest 从 `1 failed / 5 passed` 到 `6/6` 通过，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。

## 2026-08-18 C16.3 新版 Figma 复原与共享 TabBar 校准

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`。新版稿确认 88px 粉色顶栏、左对齐“账号设置”、92px 资料卡、45px 分组行、16px 内容边距和 70px 三栏底部导航。
- `pages/coach/account` 已按新版结构收口：资料卡补齐编辑标签、状态徽标、微信绑定图标、手机号右侧动作和三组箭头行；账号字段仍显示真实会话可提供的信息（当前会话未提供/状态待同步），没有写入 Figma 示例手机号、姓名、认证结果或伪造 API 能力。
- 新版稿的 TabBar 图标框为 16px、标签为 9px、内容区高 56px；共享 `components/role-tabbar` 已同步为 `32rpx` 图标、`18rpx` 标签、`16rpx` 顶部内边距和 `84rpx` 指示点位置，家长端与教练端共用。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\c163-figma-current.png`；运行态截图：`C:\Users\ASUS\AppData\Local\Temp\c163-coach-runtime-after-tabbar-ed2e646615534f91b581683fbbb3050d.png`，sidecar 证实 `/pages/coach/account/index` 严格为 `375×812`；并排图：`C:\Users\ASUS\AppData\Local\Temp\c163-compare-1dcb603d1043494a9f7f0de37b1a616a.png`。状态栏、微信胶囊、真实账号文案作为平台/数据差异保留。
- 验证通过：C16.3 与共享 TabBar 定向 Vitest `12/12`、小程序 `tsc --noEmit`、限定路径 `git diff --check` 均通过。该批次尚待路径限定提交后继续下一页。

## 2026-08-18 C16.4 新版 Figma 复原

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`。新版稿确认 88px 粉色顶栏、44px 搜索栏、三行两列快速上手卡、FAQ 分组卡、支持卡和 70px 三栏底部导航。
- `pages/coach/help` 已将顶栏改为与新版稿一致的左对齐标题和返回间距；初始“全部”筛选不再显示未在新版稿出现的红色选中边框，选择具体真实分类时仍保留本地筛选反馈。搜索、分类、展开 FAQ 和返回行为不变。
- 真实 API 返回的分类、问题、文案和支持配置继续原样展示；当前运行态的“全部/出勤说明/训练规则/成长报告/账号设置/联系客服”等内容与在线稿示例不同，属于真实内容差异，未把 Figma FAQ 或联系渠道写进客户端。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\c164-figma-current.png`；最终运行态截图：`C:\Users\ASUS\AppData\Local\Temp\c164-coach-runtime-after-6439cb84603e4eedafa1fa1f04971996.png`，sidecar 证实 `/pages/coach/help/index` 严格为 `375×812`；并排图：`C:\Users\ASUS\AppData\Local\Temp\c164-compare-after-ba93df7869ab4f658e108ef3461b51be.png`。
- 验证通过：C16.4 定向 Vitest `4/4`、小程序 `tsc --noEmit`、限定路径 `git diff --check` 均通过；该批次待路径限定提交。

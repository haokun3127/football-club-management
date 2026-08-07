# 核心演示闭环 · 进度跟踪

> 依据《Figma 全量补齐决策》（../design/figma/figma-full-implementation-decision.md）执行。
> 本文档随每批工作实时更新：完成一项勾一项，新增发现随时补充。
> 最后更新：2026-08-07

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

# Research: C4 real persisted demo data and Figma repair plan

- Query: 为教练端 C4 快速点名、C4.1 提交成功、C4.2 出勤更正补足真实后端持久化演示数据，并按在线 Figma 节点 93:665、93:696、93:715 制定最小可验证修复计划；不修改业务代码、不提交、不触碰无关 dirty 文件。
- Scope: mixed
- Date: 2026-08-11

## Findings

### 当前结论

现有链路已经具备真实事件、真实名单、事件级出勤 PUT、SQLite 自然键 upsert、重启读回和出勤扣课幂等基础，不需要新增 API 路由、schema、migration 或 repository。最小修复应收敛为三组工作：

1. 仅在 opt-in acceptance seed 中补足可观察的出勤状态分布，并补 acceptance 身份下的 PUT -> GET -> SQLite restart -> GET 回归。
2. 修正 C4 对 RSVP 状态和出勤状态的边界：`invited/confirmed` 在 C4 必须显示为“未点名”，不能作为已完成点名直接提交；显式空备注必须能清除后端备注。
3. 保留当前已经出现的 C4/C4.1 局部视觉修复，只补在线 Figma 尚未满足的层级和尺寸；C4.2 不得伪造“家长异议”、异常数量或全局更正原因。

输入任务 `.trellis/tasks/08-11-08-11-coach-acceptance-demo-data/prd.md:11-12` 仍写“8 人名单”，但当前 seed 与测试已经是 16 人：`apps/api/src/seed/cq-talent-acceptance.ts:85-88` 选择 2 名 acceptance 家庭学员加 14 名同俱乐部学员，`apps/api/test/cq-talent-fixtures.test.ts:183-188` 和 `apps/api/test/server.test.ts:1349-1352` 均以 16 人为当前契约。C4 修复不应回退到 8 人，也不应复制 Figma 的 20 人示例计数。

### 现有真实数据覆盖矩阵

| 页面 / 状态 | 真实 API 与持久化来源 | 当前 acceptance 数据 | 是否足够 | 最小缺口 |
|---|---|---|---|---|
| C4 `93:665` 快速点名 | `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench`；`rosterContext.participants` 与 `students` 联结为真实名单（`apps/api/src/routes/app-client.routes.ts:1052-1127`，`apps/miniprogram-cq-talent/utils/api.ts:701-716`） | 6 个固定事件均有同一组 16 名真实 seed 学员。已完成基础训练与比赛全员 `present`；两场已完成训练均为 1 `present` + 15 `late`；两场未来活动均为 16 `confirmed`（`apps/api/src/seed/cq-talent-acceptance.ts:388-446`） | 部分足够 | 有真实名单、`present`、`late`，没有 seed 级 `absent`；`confirmed` 是 RSVP，不是已决定出勤。当前页面保留 `confirmed` 并只拦截 `pending`（`pages/coach/attendance/index.ts:9-18,146-151,175-188`），随后客户端 PUT normalizer 又拒绝 `confirmed`（`utils/api.ts:916-927`），因此未来训练无法直接完成点名。 |
| C4.1 `93:696` 提交成功 | C4 PUT 成功后重定向，成功页重新 GET 同一 workbench，并根据真实 roster 计算统计（`pages/coach/attendance/index.ts:146-158`；`pages/coach/attendance-success/index.ts:62-73,98-111`） | seed 本身能显示成功页数据；实际 PUT 后也能读回 | 功能链路足够，acceptance 证据不足 | 通用测试证明 PUT、幂等和 SQLite 重启，但 acceptance 16 人身份的现有重启测试只验证战术板，没有执行出勤 PUT/readback（`apps/api/test/server.test.ts:1340-1500`）。需补同一 acceptance coach token 下的出勤写入与重启读回。 |
| C4.2 `93:715` 出勤更正 | 与 C4 共用 GET 和 PUT；后端支持逐参与者 `status` 与可选 `note`，同一自然键更新（`apps/api/src/application/services.ts:394-443`；`apps/api/src/persistence/calendar-repositories.ts:91-112`） | 已完成训练已有真实状态和逐人备注，可作为更正入口 | 仅足够做真实逐人更正 | API 没有 parent dispute、anomaly、异常计数或全局 correction reason 字段。当前 truthful correction 文案是正确边界（`pages/coach/attendance/index.wxml:8-14`）。当前备注输入只在已有 `item.note` 时渲染（同文件 `:45`），空备注学员无法新增备注；客户端 `student.note || undefined` 也无法显式清空旧备注（`utils/api.ts:184-192`）。 |
| 后端持久化 | PUT 调用 `recordEventParticipants`，SQLite 以 `(club_id,event_id,student_id)` upsert；持久化行优先于 seed（`apps/api/src/routes/app-client.routes.ts:2138-2169`；`apps/api/src/persistence/calendar-repositories.ts:91-112`；`apps/api/src/store.ts:2440-2460`） | acceptance seed 启动开关为 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`（`apps/api/src/seed/index.ts:22-26,43-45`） | 基础能力足够 | seed 参与者使用 insert-if-absent（`apps/api/src/persistence/platform-persistence.ts:95-100`），所以修改 seed 状态只影响新数据库；已经 seed 过的数据库不会被覆盖。已有环境必须通过真实 coach PUT 准备演示状态，或使用新的干净 acceptance 数据库，不能靠重启“刷新”状态。 |

### 建议的最小 seed 状态分工

不新增第 7 个事件、不改固定 ID、不扩展普通 seed：

- `event-cq-talent-demo-training-upcoming` 保持 16 个 `confirmed`，但 C4 页面层将 `invited/confirmed` 规范化为内部 `pending`。它负责演示“尚未点名”及真实快速点名保存。
- `event-cq-talent-demo-training-completed` 改为确定性混合分布，例如 10 `present`、2 `late`、2 `absent`、1 `leave_requested`、1 `excused`，每类备注也保持确定性。它负责 C4 已保存状态、C4.1 真实统计与 C4.2 更正。
- 其余 4 个事件保持当前用途，避免同时改变 C1/C2/C7 等页面数据。
- fixture 测试必须按事件断言精确状态计数、16 个 student ID 一致、parent 仍只看到 2 个 guardian children。

该方案满足 pending/present/late/absent 的可观察性，但对已存在的 SQLite 不会自动生效。已有 acceptance 环境应使用现有认证 coach session 对目标 event 执行一次真实 PUT，并在同库重启后 GET workbench 复核；禁止新增公开 seed endpoint 或直接改库脚本。

### 在线 Figma 来源与最小差异计划

在线文件：`zZ6wKyOHKcO4UYXDd9jGwv`，2026-08-11 重新读取；本地旧导出文档均声明只能作历史参考。

| 状态 | 在线 URL | 在线节点关键结构 | 当前本地快照 | 最小修复 |
|---|---|---|---|---|
| C4 | https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-665 | 375x812；88px 粉色 top nav；16px 左、约 100px 右胶囊避让；22px 标题；内容左右 22px、区块间 16px；深色活动摘要；40px 快捷操作；60px 紧凑名单行；coach tabbar | 当前已使用 `app-header`、深色 hero、40px 操作、最小 60px 行、role-tabbar，且移除了普通态底部重复 submit（`pages/coach/attendance/index.wxml:1-55`；`index.wxss:1-61`）。共享 header 虽固定 88px，但默认标题仅 16px且 back side 会占据左侧（`components/app-header/index.ts:23-29`；`index.wxss:4-13`）。 | 先修 RSVP -> pending 与汇总/保存语义；再用 C4 opt-in header variant 或页面局部 header 达到 22px/x16，不能全局放大共享 header。保持 API 名称与真实人数；普通态行保持 60px，备注编辑移入 correction 分支。 |
| C4.1 | https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-696 | 80px 成功圆；20px 标题；摘要卡仅课程/日期/出席/时间四行；单一 48px 主按钮；coach tabbar | 当前模板已是四行真实数据、单一主按钮与 tabbar（`pages/coach/attendance-success/index.wxml:8-47`），统计来自重新 GET，不信任 query。 | 保留真实 readback；删除 controller load 中残留但未声明的 `venue/hasVenue` setData（`index.ts:50-60`）；将按钮文案由固定“工作台”预计算为真实活动类型对应的“查看训练详情/查看比赛详情”或中性的“查看活动详情”，不要照抄训练示例到比赛。只做尺寸微调和 header variant。 |
| C4.2 | https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-715 | 88px nav；22px content；橙色警示卡；紧凑异常名单；更正说明；52px 底部重新提交；coach tabbar | 当前已有 truthful 警示卡、同一真实 roster、逐人状态 picker、底部重新提交与 tabbar（`pages/coach/attendance/index.wxml:8-14,31-55`）。但仍复用 C4 hero，并且空备注不能新增。 | correction mode 单独排列“警示 -> 真实名单 -> 逐参与者备注 -> 重新提交”；不显示 Figma 示例的“家长异议”“共 2 条异常”或全局原因。若要完全实现这些语义，必须另开 API/PRD，不属于本最小修复。 |

Figma 中的姓名、队名、`20` 人、`18/20`、`2` 条异常均为设计示例，只验证层级、间距、字号、颜色和交互位置，不得进入运行数据或测试 fixture。

### API 契约

#### 读取

- `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench`
- 仅 active coach app client 与拥有该 event 访问范围的 coach 可读；事件不存在为 404，越权为 403（`apps/api/src/routes/app-client.routes.ts:1052-1090`）。
- 返回真实 `event`、`rosterContext.participants/students/teams` 以及 workflow/training/match/assessment（同文件 `:1101-1127`）。
- 规范要求 `rosterContext.participants[].status` 首先是 participation/RSVP 状态；C4 对未形成出勤决定的状态必须显示 `pending`，不能默认 `present`（`.trellis/spec/api/backend/app-client-bff-contracts.md:264-266`）。

#### 写入

- `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/attendance`
- Body：`{ participants: [{ studentId, status, note? }] }`；至少 1 项；status schema 为 `invited|confirmed|present|absent|late|leave_requested|excused`（`apps/api/src/http/schemas.ts:892-919`）。C4 点名完成态应只发送 `present|absent|late|leave_requested|excused`。
- Response：`{ clubId, client, eventId, participants }`（`apps/api/src/routes/app-client.routes.ts:2155-2166`）。
- 仅 active coach 且有 event access；错误边界 400/403/404。请求使用 idempotency key；相同 payload 重放不重复扣课，冲突 payload 为 409，现有通用回归位于 `apps/api/test/server.test.ts:1207-1276`。
- 同一 `(club,event,student)` 是 partial upsert。省略 note 保留旧值；显式空字符串清空旧值（`apps/api/src/application/services.ts:417-439`）。客户端必须保留 `""`，不能用 `|| undefined`。
- `present/late` 会产生一次 lesson debit，source ID 为 `${eventId}-${studentId}`（`apps/api/src/store.ts:2054-2076`）。seed 里预置的状态不等价于通过 PUT 证明扣课副作用，因此 acceptance 回归仍需走真实 PUT。

### 涉及文件

建议 implement agent 仅触碰下列已有文件；遇到其中已有 dirty 修改时必须逐块合并，不覆盖或清理用户内容：

| 文件 | 责任 / 计划 |
|---|---|
| `apps/api/src/seed/cq-talent-acceptance.ts` | 仅调整一个固定 completed training 的确定性状态分布；保持 opt-in、16 人、6 事件、固定 ID、parent 绑定不变。 |
| `apps/api/test/cq-talent-fixtures.test.ts` | 先写失败断言：16 人、六事件同名单、upcoming 为 RSVP、completed mixed 状态计数、parent 2 children。 |
| `apps/api/test/server.test.ts` | 在现有 acceptance SQLite restart 场景中加入 coach workbench -> attendance PUT -> workbench -> close/reopen -> workbench 状态/备注读回。 |
| `apps/miniprogram-cq-talent/utils/api.ts` | 保留显式空 note；不要在共享 workbench normalizer 中把 RSVP 全局改为 pending，以免影响其他页面。 |
| `apps/miniprogram-cq-talent/utils/api.test.mjs` | 断言空字符串 note 被发送、pending/confirmed 不会被当作可提交的决定态。 |
| `apps/miniprogram-cq-talent/pages/coach/attendance/index.ts` | 页面级映射 `invited/confirmed -> pending`；picker 只暴露 C4 合法决定态；汇总与保存门禁覆盖所有未决定状态；保留失败后编辑内容。 |
| `apps/miniprogram-cq-talent/pages/coach/attendance/index.wxml` | C4 与 correction mode 的最小分支层级；只渲染真实 event/roster/note；不使用 WXML 数组方法。 |
| `apps/miniprogram-cq-talent/pages/coach/attendance/index.wxss` | 对齐 C4/C4.2 的 22px content、16px gap、60px normal rows、警示卡、底部提交与 tabbar 安全区。 |
| `apps/miniprogram-cq-talent/pages/coach/attendance/index.json` | 仅在 header/component 方案需要时调整注册；当前已有 app-header、role-tabbar、status-chip/status-view。 |
| `apps/miniprogram-cq-talent/pages/coach/attendance/index.test.mjs` | 增加 confirmed/invited 映射、汇总、保存拦截、correction 空备注可编辑、truthful copy 和静态几何门禁。 |
| `apps/miniprogram-cq-talent/pages/coach/attendance-success/index.ts` | 保持 GET readback；清理未声明字段；预计算真实类型的详情按钮文案。 |
| `apps/miniprogram-cq-talent/pages/coach/attendance-success/index.wxml`、`index.wxss`、`index.test.mjs` | 保持四行真实摘要与单 CTA，补在线尺寸/文案门禁。 |
| `apps/miniprogram-cq-talent/components/app-header/index.ts`、`index.wxml`、`index.wxss` | 只有在无法页面局部实现时新增 opt-in C4 大标题/左对齐 variant；不得改变默认样式影响其他页面。 |

明确不需要修改：`apps/api/src/routes/app-client.routes.ts`、`apps/api/src/http/schemas.ts`、`apps/api/src/application/services.ts`、`apps/api/src/persistence/*`、数据库 migrations。现有契约和持久化能力已覆盖本任务。

### 最小实施顺序

1. 先加 seed 状态分布和 acceptance restart 出勤回归的失败断言。
2. 最小调整 opt-in seed，使 fixture 精确通过；普通 seed、事件数、名单、guardian projection 不变。
3. 先加 C4 `confirmed/invited -> pending`、不可提交、空 note 清除的失败测试，再修页面 view model 与 API client serialization。
4. 基于此刻已有的 app-header/hero/compact row/tabbar 改动做局部视觉补齐；不要重写整个页面或覆盖 dirty 内容。
5. 单独整理 C4.1 四行摘要与 C4.2 truthful correction 层级。
6. 运行 focused tests、两个 package typecheck、root check；最后取得三个真实状态截图。没有可信截图时只能报告静态/API 验证，不能报告视觉完成。

### 最小验证命令

以下命令供 implement agent 使用；本次 researcher 未执行：

```powershell
npx.cmd --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/cq-talent-fixtures.test.ts test/server.test.ts test/persistence.test.ts
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/attendance/index.test.mjs pages/coach/attendance-success/index.test.mjs utils/api.test.mjs
npx.cmd --yes pnpm@10.33.0 --filter @football-club/api typecheck
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
npx.cmd --yes pnpm@10.33.0 run check
```

命令依据：根仓库固定 `pnpm@10.33.0`，Vitest `4.1.9`、TypeScript `6.0.3`（`package.json:6,8-20`）；小程序截图工具使用 `miniprogram-automator 0.12.1`（`apps/miniprogram-cq-talent/package.json:6-17`）。不把任何 git 命令列入本研究验收。

### 截图验收方式

1. 使用真实微信登录与后端返回的 active coach role；禁止开发身份、假 token、client fixture 或手工拼成功页 query 数据。
2. C4：从真实 schedule/workbench 打开 `pages/coach/attendance/index?id=event-cq-talent-demo-training-upcoming`，确认 GET 返回 16 人且 RSVP 在 UI 为“未点名”。
3. 对 16 人完成真实点名并提交；只在 PUT 200 后由页面重定向到 `pages/coach/attendance-success/index?eventId=...`，C4.1 再 GET 同事件并显示真实统计。
4. C4.2：打开 `pages/coach/attendance/index?id=event-cq-talent-demo-training-completed&mode=correction`，修改真实参与者状态/备注，提交后再次 GET；不得显示未经 API 支持的家长异议事实。
5. 先启动 DevTools automation，再将每张 PNG 写到仓库外、已存在目录中的全新绝对路径：

```powershell
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent devtools:automator:open
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent devtools:screenshot -- --output <new-absolute-path-outside-repo.png> --expect-route-prefix /pages/coach/attendance/ --port <automation-port>
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent devtools:screenshot -- --output <new-absolute-path-outside-repo.png> --expect-route-prefix /pages/coach/attendance-success/ --port <automation-port>
```

6. 每张证据必须有可解析 sidecar、两次路由复核、逻辑视口 375x812 和未裁剪小程序画布；Windows PrintWindow 只在唯一可见模拟器、正确 DPI/crop 与二次路由校验全部满足时接受（`.trellis/spec/guides/cross-layer-thinking-guide.md:136-141,210`；`docs/current/miniprogram-manual-acceptance-cq-talent.md:3-6`）。
7. 三张图分别对照对应在线节点。动态姓名、人数、活动名和比值只核对来自 API；几何核对 header、22px 边距、区块 gap、hero、60px 行、摘要卡、CTA、tabbar 与 safe area。
8. 三张 PNG 应有不同哈希；若 PrintWindow 与上一张哈希相同，按已知陈旧帧问题判为不可信并重取。超时、无 PNG、错误路由、错误视口或缺 sidecar 时，不得宣称视觉通过。

### 相关规范与文档

- `.trellis/workflow.md` — 当前 planning/research 工作流与质量门禁。
- `.trellis/tasks/08-11-08-11-coach-c4-attendance/prd.md:9-22` — 在线节点、真实 API、seed 状态覆盖与截图 AC。
- `.trellis/tasks/08-11-08-11-coach-c4-attendance/design.md:12-23` — seed -> persistence -> workbench -> PUT -> reload 数据流及扣课风险。
- `.trellis/tasks/08-11-08-11-coach-acceptance-demo-data/prd.md:9-23` — opt-in、guardian projection、固定事件与重启目标；人数描述已落后于当前代码。
- `.trellis/spec/api/backend/app-client-bff-contracts.md:264-266,305-327` — workbench RSVP/attendance 语义、C4 PUT、幂等、note、seed 与截图契约。
- `.trellis/spec/api/backend/database-guidelines.md` — 自然键、club scope、file-backed reopen 规则。
- `.trellis/spec/api/backend/active-role-sessions.md` — active coach role 必须由后端 session 决定。
- `.trellis/spec/api/backend/quality-guidelines.md` — API focused test、typecheck 与 root check。
- `.trellis/spec/guides/cross-layer-thinking-guide.md:136-141,210` — 375x812 截图、sidecar、路由复核与 Windows fallback。
- `docs/design/specifications/batches/design-spec-batch14-c4-attendance.md:3-5`、`docs/design/specifications/coach/design-spec-C4.1-attendance-success.md:3-5`、`docs/design/specifications/coach/design-spec-C4.2-attendance-correction.md:3-5` — 本地导出只作历史记录，在线 Figma 优先。
- `docs/current/production-dual-role-demo-2026-08-11.md:6-12` — production acceptance seed 为私有 opt-in，六个固定事件已发布；该文档未证明当前 C4 三态截图或 acceptance 出勤重启写回。

## Caveats / Not Found

- 当前 Trellis active task 是 `.trellis/tasks/08-11-08-11-coach-c4-attendance`，不是用户点名的已完成 acceptance-demo-data 任务；因此研究落在当前任务的 `research/`，同时把旧任务作为输入资料。
- 调研期间目标 C4 文件的内容相对先前读取快照发生变化，当前已经包含 app-header、role-tabbar、compact row 与精简 success card。未执行任何 git 操作，无法也不应判断这些变化属于哪个 dirty 批次；implement agent 必须以增量合并方式处理。
- 未检查或修改线上生产数据库、私有手机号、token、环境变量值；不能断言线上已有 SQLite 会获得新的 seed 状态分布。
- 未找到 parent dispute/anomaly/global correction reason 的 API 或持久化字段。精确复制 C4.2 的“家长异议/2 条异常”会制造假数据，应明确排除。
- 未取得本轮真实 coach 375x812 C4/C4.1/C4.2 截图，因此当前结论不是视觉验收通过。
- 本轮没有运行测试或 typecheck，也没有修改业务代码、spec、docs、其他任务或提交记录；唯一写入是本研究文件。

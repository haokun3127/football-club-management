# Research: 教练端页面数据与持久化证据审计

- Query: 盘点教练端日程、签到、课次/训练计划、测试指标、比赛、战术板、成长/训练历程、帮助所依赖的真实实体、现有演示数据、持久化缺口及重启验证方式；不采用前端假数据。
- Scope: internal
- Date: 2026-08-12

## Findings

### 结论与真实性分级

- **P1（SQLite 持久化）**：身份/团队、日历事件、参与人/签到、课次流水、测评结果与指标、比赛主体与比赛事件、战术板均有 migration + repository 写入口；进程重启且不重新注入验收 seed 后仍可保留。
- **P2（后端 seed 重建）**：训练计划/训练课、比赛名单/球员评语、测试任务定义、FAQ、训练观察主要存在于 `ApiStore` seed 内存模型；它们是真实后端 API 数据，不是前端假数据，但不是数据库持久化事实，关闭 seed 或变更 seed 后不可保证保留。
- **D（派生视图）**：教练首页、月日程、训练统计、雷达、团队能力、测试任务完成度由 P1/P2 数据计算，不是单独的数据表。
- CQ 验收 seed 当前提供：1 个双角色验收身份、1 名验收教练、1 支演示队、200 名学员，其中演示队附加 16 名可操作学员；没有在本文记录任何密码、令牌、手机号或可识别联系方式（`apps/api/src/seed/cq-talent-acceptance.ts:69-223`）。
- 验收 seed 是显式开关：仅 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` 时加载（`apps/api/src/seed/index.ts:12-26,43-44`）；服务启动时执行 migration/seed（`apps/api/src/persistence/platform-persistence.ts:239-256`）。

### 页面—实体—现有数据—缺口—重启验证矩阵

| 领域 | 页面/API 实际依赖与写入口 | 当前验收数据 | 真实性与缺口 | 重启后验证方式 |
| --- | --- | --- | --- | --- |
| 日程 | 页面读取 `GET /coach/home`（`apps/miniprogram-cq-talent/utils/api.ts:132-142`；`pages/coach/schedule/index.ts:64-100`）。核心实体为 `calendar_events`、`event_participants`、team/member；首页再联结训练课或比赛投影（`apps/api/src/routes/app-client.routes.ts:1553-1619`）。事件/参与人由 `CalendarRepository` 保存和自然键更新（`apps/api/src/persistence/calendar-repositories.ts:9-113`）。 | 固定 6 个事件：8 月 3/6/10 三次已完成训练、8 月 9 日已完成比赛、8 月 12 日待训练、8 月 13 日待比赛；每场 16 名参与人（`apps/api/src/seed/cq-talent-acceptance.ts:273-446`）。 | 事件与参与人是 P1；首页摘要是 D。演示事件未形成完整场地资料，依赖 venue/location 的展示可能为空。训练事件关联的训练课详情仍是 P2。 | 以同一临时 SQLite 文件启动，读取日期范围；关闭服务，用同一 DB 且关闭验收 seed 重启，再读 `/coach/home`，核对 6 个事件 ID、时间和参与人数；现有通用事件重启证据见 `apps/api/test/persistence.test.ts:13-76`。 |
| 签到 | `GET /coach/events/:id/workbench`、`PUT /coach/events/:id/attendance`（`apps/miniprogram-cq-talent/utils/api.ts:145-199`；路由写入口 `apps/api/src/routes/app-client.routes.ts:2138-2170`）。写入 `event_participants`，present/late 同时生成课次扣减流水（`apps/api/src/store.ts:2054-2076`）。 | 三场已完成训练均有 16 人且含出勤、迟到、缺勤、请假、豁免状态；8 月 12 日训练为可编辑 confirmed 状态（`apps/api/src/seed/cq-talent-acceptance.ts:388-446`）。 | 签到状态/备注和由签到产生的课次流水均为 P1。seed 对事件/参与人采用 insert-if-absent，重启不会覆盖人工签到（`apps/api/src/persistence/platform-persistence.ts:96-119`）。 | 对待训练执行真实 PUT，立即 GET 回读；关闭并以同一 DB 重启后再次 GET，核对 status/note。现成端到端重启断言在 `apps/api/test/server.test.ts:1340-1551`，底层重启断言在 `apps/api/test/persistence.test.ts:13-76`。 |
| 课次 / 训练计划 | 课次：`GET/POST/PATCH /coach/events/:id/lesson`（`apps/miniprogram-cq-talent/utils/api.ts:176-240`），持久化读写由 `DataCapabilityRepositories` 处理（`apps/api/src/persistence/data-capability-repositories.ts:755-850`；Persistent store override `apps/api/src/store.ts:3096-3109`）。训练项目：`GET /coach/training-projects`、`PUT /coach/events/:id/training-projects`（`apps/miniprogram-cq-talent/utils/api.ts:262-302`；路由 `apps/api/src/routes/app-client.routes.ts:1413-1538`）。 | seed 有 1 个 finishing 训练计划和 4 个训练课（`apps/api/src/seed/cq-talent-acceptance.ts:449-490`）；课次初值来自验收 seed/外部导入快照。 | 课次确认、扣减、纠错为 P1；训练计划与训练课保存仅调用内存 `upsertById`（`apps/api/src/store.ts:903-948`），Persistent store 没有对应 override/repository，是明确 P2 缺口。`0001`—`0009` 无 session plan/training session 表。直接 seed 的 lessonLedger 数组未被逐条落库，但外部原始记录确认流程可物化课次快照（`apps/api/src/persistence/platform-persistence.ts:211-219`），须以 DB 实查确认具体初值。 | 课次：POST/PATCH 后关闭并重开同一 DB，GET 核对余额/流水/纠错；现有证据 `apps/api/test/lesson-correction.test.ts:134-190`。训练计划：PUT 后进程内 GET 可回读；同 DB 重启并关闭验收 seed 后应丢失或回退，作为“不持久化”的负向证据；目前仅有进程内测试 `apps/api/test/server.test.ts:917-1042`。 |
| 测试指标 | 测试任务 `GET /coach/assessment-tasks`；录入 `GET /coach/assessments/:id/form`、`POST /coach/assessments`；雷达/团队能力读取 `/coach/students/:id/radar`、`/coach/team/ability`（`apps/miniprogram-cq-talent/utils/api.ts:305-354,1091-1134`）。写入 player assessment、raw result、score、metric record、lineage（`apps/api/src/store.ts:2478-2533`）。 | 16 名演示队员每人有 8 个 8 月 10 日指标及旧基线；另有 7 月、8 月两项任务，8 月任务在 2026-08-12 为进行中（`apps/api/src/seed/cq-talent-acceptance.ts:448,635-652,752-768`）。fixture 验证每人 8 项指标（`apps/api/test/cq-talent-fixtures.test.ts:186-268`）。 | 测评结果及指标为 P1，雷达/能力/任务完成度为 D；任务“定义”数组本身是 P2，migration 中没有 assessment_tasks 表。因此已有指标重启后仍在，但关闭验收 seed 后任务卡定义不保证存在。 | POST 一次真实测评，记录返回 assessment ID；关闭/重开同一 DB 后读雷达、能力和任务进度，并直接只读核对 `player_assessments`、`assessment_raw_results`、`assessment_scores`、`player_metric_records`、`metric_lineages`。完整重启证据见 `apps/api/test/persistence.test.ts:82-205`。 |
| 比赛 | 比赛详情 `GET /coach/matches/:eventId`，事件写入 `POST /coach/matches/:eventId/events`（`apps/miniprogram-cq-talent/utils/api.ts:153-173`；`apps/api/src/routes/app-client.routes.ts:437-515,1138-1184`）。`matches`、`match_events` 由 repository 落库（`apps/api/src/persistence/match-repository.ts:40-84`）。 | 8 月 9 日有一场已完成 3:2 比赛、16 人名单、4 种事件（进球/助攻/黄牌/扑救）和 16 条球员评语（`apps/api/src/seed/cq-talent-acceptance.ts:491-565`）。 | 比赛主体、事件及伴生指标为 P1；名单和球员评语是 P2，migration 只有 `matches`、`match_events`，无 roster/note 表（`apps/api/db/migrations/0008_match_event_bundles.sql:1-29`）。8 月 13 日“待比赛”仅是日历事件，没有对应 Match 记录，因此不能作为可写比赛事件的完整对象；当前 POST 只能针对已有的 8 月 9 日比赛且仍依赖 seed 名单通过参赛校验。 | 对已有比赛 POST 一个带幂等键的真实事件；关闭/重开同一 DB，再 GET 并核对事件和派生指标。现有文件 DB 重启证据见 `apps/api/test/app-client-match-event-create.test.ts:135-176`。另以 seed 关闭重启检查名单，预期暴露 roster P2 缺口。 |
| 战术板 | `GET/PUT /coach/tactical-board/:eventId`（`apps/miniprogram-cq-talent/utils/api.ts:278-292`；`apps/api/src/routes/app-client.routes.ts:79-150`），`tactical_boards` 使用 upsert repository（`apps/api/src/persistence/tactical-board-repository.ts:7-25`）。名单由事件参与人生成（`apps/api/src/routes/app-client.routes.ts:2454-2460`）。 | 8 月 13 日待比赛有 16 名参与人；首次 GET 可派生 4-3-3、11 首发 + 5 替补，但 seed 没有预存战术板，初始 `saved=false`。 | PUT 后是 P1；首次默认阵型是 D，并非持久化 seed。因为 roster 来自 P1 的 event participants，战术板本身可以在无 Match 主体时保存；但比赛详情/事件录入仍受上一行 Match 缺口影响。 | 对待比赛执行真实 PUT，关闭/重开同一 DB 后 GET，核对 formation、球员坐标、替补与 `saved=true`；migration `apps/api/db/migrations/0006_tactical_boards.sql:1-14`，现成重启断言 `apps/api/test/persistence.test.ts:211-233` 和 `apps/api/test/server.test.ts:1340-1551`。 |
| 成长 / 训练历程 | 教练侧现有可用视图是训练月页 `getCoachHome/getCoachTeam`（`apps/miniprogram-cq-talent/pages/coach/training/index.ts:36-58,111-133`）、雷达、团队能力、训练覆盖率；它们分别由事件/参与人和指标聚合（`apps/api/src/routes/app-client.routes.ts:1629-1807,1881-1937`）。 | 三次已完成训练、一次待训练、当前/历史指标可形成月统计和能力变化。seed 还有 session observations，但主要挂在通用 `training-session-1`，不是这 4 个 CQ 演示训练课（`apps/api/src/seed/cq-talent-acceptance.ts:566-597`）。 | 事件和指标为 P1，聚合为 D；没有专门的教练端成长/训练时间线 endpoint，也没有持久化 training delivery/observation/session 表。父端 timeline 不能当作教练端数据源。故“月活动 + 能力变化”可真实演示，逐课观察/成长时间线不可声称已具备。 | 重启后读取同月份 home/team/radar/ability，核对完成训练数 3、事件列表和指标变化；这些 P1 来源可保持。若验证逐课观察，关闭 seed 后会缺失，属于负向证据。 |
| 帮助 | 页面调用 `GET /content/faqs` 并仅在客户端搜索/筛选（`apps/miniprogram-cq-talent/pages/coach/help/index.ts:41-67`；`utils/api.ts:1145-1149`）；服务读取 `listContentFaqs`（`apps/api/src/routes/app-client.routes.ts:2034-2047`）。 | seed 有 5 条 FAQ（`apps/api/src/seed/cq-talent-acceptance.ts:659-665`）。 | 响应来自真实后端 API，但 FAQ 是 P2：无 content_faq/content_article migration、repository 或受控写入口。重启时只有继续打开同一 acceptance seed 才能重建；关闭开关不可保证存在。 | 先在 seed 开启时 GET 并记录 5 个稳定 ID；同 DB、seed 开启重启应仍返回；随后在隔离环境关闭 seed 重启，缺失即证明没有 DB 持久化。不得用前端常量补齐。 |

### 持久化结构与代码路径

- 核心身份/团队表：`apps/api/db/migrations/0001_platform_foundation.sql:1-105`。
- 日历、参与人、课次、指标与测评表：`apps/api/db/migrations/0002_data_capability_foundation.sql:78-443`。
- 战术板：`apps/api/db/migrations/0006_tactical_boards.sql:1-14`。
- 比赛及比赛事件：`apps/api/db/migrations/0008_match_event_bundles.sql:1-29`。
- 数据库路径与 Persistent store 装配：`apps/api/src/index.ts:7-12`；持久化 seed 分发：`apps/api/src/persistence/platform-persistence.ts:43-237`。
- Persistent store 只回灌持久化测评/比赛数据，并覆写事件、参与人、指标、测评、比赛事件、战术板、课次等入口（`apps/api/src/store.ts:2407-2631,3096-3109,3286-3320`）；未覆写训练计划/训练课、任务、FAQ、比赛名单/评语。

### 已发现文件

- `apps/api/src/seed/cq-talent-acceptance.ts` — CQ 双角色验收实体和所有演示业务对象。
- `apps/api/src/seed/index.ts` — 验收 seed 开关与装配入口。
- `apps/api/src/routes/app-client.routes.ts` — 教练 BFF 读写路由与派生逻辑。
- `apps/api/src/store.ts` — 内存 store、Persistent store 覆写和业务写入边界。
- `apps/api/src/persistence/platform-persistence.ts` — migration、seed 落库及 repository 装配。
- `apps/api/src/persistence/calendar-repositories.ts` — 日程/签到持久化。
- `apps/api/src/persistence/data-capability-repositories.ts` — 课次与数据能力持久化。
- `apps/api/src/persistence/assessment-repositories.ts` — 测评/指标持久化。
- `apps/api/src/persistence/match-repository.ts` — 比赛/比赛事件持久化。
- `apps/api/src/persistence/tactical-board-repository.ts` — 战术板持久化。
- `apps/api/db/migrations/0001_platform_foundation.sql`、`0002_data_capability_foundation.sql`、`0006_tactical_boards.sql`、`0008_match_event_bundles.sql` — 当前相关数据库事实。
- `apps/miniprogram-cq-talent/utils/api.ts` 与 `pages/coach/**` — 页面实际 API 依赖。
- `apps/api/test/cq-talent-fixtures.test.ts` — 当前 seed 数量与结构断言。
- `apps/api/test/persistence.test.ts`、`app-client-match-event-create.test.ts`、`lesson-correction.test.ts`、`server.test.ts` — 文件 SQLite 重启证据。

### 建议验证命令（只在隔离测试 DB 执行）

```powershell
pnpm --filter @football-club/api exec vitest run test/cq-talent-fixtures.test.ts
pnpm --filter @football-club/api exec vitest run test/persistence.test.ts test/app-client-match-event-create.test.ts test/lesson-correction.test.ts
pnpm --filter @football-club/api exec vitest run test/server.test.ts
```

手工证据应采用同一个临时 SQLite 文件完成“真实 API 写入 → 立即 GET → 正常关闭进程 → 同 DB 重启 → 再 GET/只读 SQL 核对”；第二轮再在隔离环境关闭 acceptance seed，以区分 P1 持久化与 P2 seed 重建。不要直接在生产库试验，不要增加公开 seed API、伪 API、伪角色或前端 fixture。

### Related specs

- `.trellis/spec/api/backend/database-guidelines.md` — migration/repository、club scope、自然键 upsert 和 calendar seed insert-if-absent 约束。
- `.trellis/spec/api/backend/app-client-bff-contracts.md` — 小程序 BFF、教练首页/工作台、签到持久化与回读契约。
- `.trellis/spec/api/backend/active-role-sessions.md` — 双角色会话和服务端角色权威。
- `.trellis/spec/guides/cross-layer-thinking-guide.md` — 页面到 API、store、repository、DB 的跨层核验方法。

### External references

- 无。本结论只基于当前仓库代码、migration、seed 与测试，不依赖外部文档或版本声明。

## Caveats / Not Found

- 本次没有连接或读取线上生产数据库，因此“已存在数据”指当前仓库验收 seed 及测试可证明的数据，不等价于某个已部署环境当前行数；生产环境必须通过只读 SQL/API 再确认。
- 未发现训练计划/训练课、比赛名单/球员评语、测试任务定义、FAQ/文章、训练观察/交付的 SQLite migration 或 repository；这些是目前最主要的持久化缺口。
- 未发现可写的 8 月 13 日 Match 主体；它只有 calendar event/participants。若需完整演示比赛事件录入，必须通过正式持久化模型/受控导入补齐 Match 与 roster，不能靠前端假数据。
- 未发现专门的教练端“成长/训练历程”时间线 API；现有真实能力仅覆盖月训练活动、雷达、团队能力和覆盖率。
- 现有 `server.test.ts` 的 acceptance 重启场景仍会重新装载 seed，能证明 SQLite 写入不会被 seed 覆盖，但不能单独证明 P2 对象在关闭 seed 时仍存在；因此必须补做“同 DB、seed 关闭”的隔离负向验证。

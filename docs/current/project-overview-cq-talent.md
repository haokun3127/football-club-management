# 重庆天才项目全景（2026-09-18）

> 历史快照（2026-09-18）：本文的规模、销课路径、Figma来源及发布状态已被后续实现改变。当前事实与优先级以[交付现状](development-delivery-channel.md)为准，日常路径见[主开发入口](development-workspace.md)；保留本文用于追溯，不把历史缺口当作当前缺陷。

本文用途：让新接手的人或 agent 一次看懂这个项目「是什么、做到哪、怎么跑、卡在哪」。它是导航与现状摘要，不替代权威文档：架构细节见 [架构骨架](architecture.md)、接口约定见 [API 契约基线](api-contract.md)、部署与运维要求见 [部署需求与运维关注点](deployment-requirements.md)、需求目标见 [产品需求文档 v1.1](product-requirements/README.md)。

## 0. 证据等级与本文口径

- **[实测]** 2026-09-18 在本机可写环境实际执行命令并取得结果，命令与输出可复现。
- **[记录]** 来自仓库内带日期的发布/运维/上传记录。**这类内容是时点快照，不是当前状态**；引用时必须保留日期，服务器内部状态需重新只读核验后才可升级为现状。
- **[未验证]** 需要服务器内部访问、微信管理后台或真机才能确认，本轮不具备条件。

本文写作时对以下事项**只做了公开面复核**：公网 `/health`、Git 远端只读查询、本机测试与静态检查。**未复验**：线上容器与版本、SQLite 卷与数据量、后台 allowlist、微信平台版本状态、DNS/TLS/反代细节、真机表现。

---

## 1. 项目定位与仓库结构

重庆天才足球俱乐部数字化管理系统。pnpm monorepo（`packageManager: pnpm@10.33.0`），三个工作区 **[实测]**：

| 路径 | 包名 | 职责 |
| --- | --- | --- |
| `apps/api` | `@football-club/api` | Fastify 5 + SQLite 后端：迁移、种子、鉴权、BFF、OpenAPI |
| `apps/miniprogram-cq-talent` | `@football-club/miniprogram-cq-talent` | 原生微信小程序（家长端 + 教练端） |
| `packages/domain` | `@football-club/domain` | 领域模型、基础规则、指标派生算法 |

设计目标是「通用业务骨架 + 多前台接入」：小程序、管理后台、公众号运营、AI 分析与未来的支付/CRM 都应接同一套领域模型；`Club` 是租户边界，`CalendarEvent` 是业务主轴，`PlayerMetricRecord` 是球员数据资产的最小单元（见 [架构骨架](architecture.md)）。

**当前没有后台应用工作区**：仓库只有上面三个包，后台相关能力目前都体现在 API 与 `packages/domain` 里 **[实测]**。

---

## 2. 产品面

### 2.1 客户端形态

原生微信小程序，AppID `wx4c588cd106e520e0`，`miniprogramRoot: ./`、`libVersion 3.17.0` **[实测]**。`app.json` 注册 **56 个页面，全部在主包，无分包** **[实测]**：

- 公共 2 页：`pages/launch`（解析 app-client，有会话直接分流）、`pages/login`（手机号授权 + 双角色分流）。
- 家长端 24 页：日程/单日/活动详情、成长（足迹、雷达、指标、能力史、训练历程、比赛记录、里程碑、学期报告）、我的孩子、课时与保险、提醒、绑定与家庭成员、内容中心/文章/攻略/帮助、教练团队、场地、私教预约、账号。
- 教练端 30 页：日程与工作台、点名、销课与历史、训练管理与内容选择、课堂评测、球队/学员雷达/球队能力、比赛记录与事件、战术板、测评任务全链路（任务创建 → 项目选择 → 批量录入 → 提交）、活动变更、权限范围、账号。

`app.json` 无 `tabBar` 字段，改用自定义组件 `components/role-tabbar`（家长 4 个 Tab / 教练 3 个 Tab），56 个页面 json 中有 38 个注册该组件 **[实测]**。

注意：**页面已注册 ≠ 业务流程已验收**。上述清单只证明入口存在，与真机/视觉验收无关。

### 2.2 核心业务域

身份与绑定（`UserAccount` 全局账号 + 俱乐部内 profile + guardian binding）、三类日历（训练/比赛/其他）、训练交付（内容库/课程计划/当堂快照）、比赛与战术板、能力指标图谱（DAG + 血缘）、测评工作流（任务/周期/批量录入/发布版本）、成长档案、课时台账、保险、隐私合规、外部集成（WPS connector + Excel 导入）。这是架构归类，不代表各域的 v1.1 流程都已实现。

### 2.3 销课：现行实现与新需求冲突（升级前必须先定唯一写入源）

现行实现是「点名即扣课」，而且**存在三条都还能写课时账的后端路径**（前两条面向小程序，第三条面向后台 admin） **[实测]**：

| 路径 | 位置 | 行为 |
| --- | --- | --- |
| 点名保存 | `apps/api/src/routes/app-client.routes.ts:2801-2843`（`PUT .../coach/events/:eventId/attendance`，路径字面量在 `:2811`） | 出勤为 `present`/`late` 时直接扣减 1 课时；`apps/api/src/store.ts:2131` 在写参与名单时调用 `recordLessonAdjustment`（接口声明 `store.ts:175`，SQLite 实现委托 `apps/api/src/persistence/data-capability-repositories.ts:781`） |
| 销课确认/调整 | `apps/api/src/routes/app-client.routes.ts:2847-3032`（GET `:2847` / POST `:2890` / PATCH `:2948`，三个 `.../coach/events/:eventId/lesson-confirmation` 端点） | 仍保留确认、返还、补扣能力；POST 在 `:2925`、PATCH 在 `:3013` 调用 `recordLessonAdjustment`；响应里出现 `mode: "attendance_debit_confirmation"`（`:2883`） |
| 后台管理接口 | `apps/api/src/routes/data-capability.routes.ts:548-570`（`POST /clubs/:clubId/admin/students/:studentId/lesson-adjustments`，仅 `admin` 角色） | 可新增课时调整，成功返回 201 |

两点澄清（避免误读）：

- `attendance_debit_confirmation` 是响应里的模式值，`recordLessonAdjustment` 是内部 store 方法，**都不是接口名**。
- 「课时更正已退役」只对旧 Figma 的独立 C5.1 画板成立；**后端端点未删除，小程序仍导出并调用相关函数**（`utils/api.ts:269-308`），相关页面仍注册在 `app.json`；后台 admin 路径（表格第 3 行）也仍然可写。

v1.1 已确认的新规则是：训练日期过后按应参与名单**默认全员销课**、有效请假不销、家长与授权教练**可直接修正**并留痕、与真实金额/财务结算**彻底分离**（[01 产品目标与小程序需求](product-requirements/01-product-and-miniprogram.md) 的 REQ-ATT-001..003）。因此实施前必须先定义：唯一写入源、幂等/防重复扣减策略、历史流水迁移与新旧路由兼容方式——否则多条路径会同时写账。

### 2.4 需求与交付边界基线

[产品需求文档 v1.1](product-requirements/README.md)：**52 个稳定需求编号、62 条验收场景、23 条决策、15 个待决项（O-01..O-15）**，每条带 C（已确认）/P（设计建议）/O（待决）/E（演进方向）标记；后台统一按 **数据管理、评测与模型、BI、专业服务** 四模块组织。明确排除：销课自动推导财务结算、个人评价自动计入能力分、未测计零分、学员排名、完整财务结算与线上支付、复杂赛事平台、设备实时接入。

---

## 3. 设计权威

| 用途 | 来源 | 说明 |
| --- | --- | --- |
| 现行实现修改依据 | 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv`（家长根 `4:6`、教练根 `4:7`） | 见 [Figma 权威来源](figma-source-of-truth.md)；离线 PNG 目录 `docs/design/reference/figma/` 实测 **52 张**（375×812 原尺寸）**[实测]**。该目录 README 与 `docs/README.md` 仍写「49 张（家长 21 + 教练 28）」，实际少登记 3 张：`c11-1-assessment-task-create.png`、`p4-1-milestones.png`、`p4-2-training-history.png`（没有「已登记但文件缺失」的情况） |
| 升级版完整设计 | 在线 Figma `EyQtDtILGDZDf6neLBL6vs` | 2026-09-18 新建：16 个页面分区、**130 个画板全部 `rendered`**、3289 段文本、568 个原型动作、结构校验 0 问题、覆盖 52/52 需求与 56/56 旧路由映射（`.trellis/tasks/09-18-fullstack-readiness-figma-design/figma-state.json`，`validation` 字段）**[实测]**。其中「44 个变量、7 个文字样式、5 个组件系列」记录在该任务 `implement.md`，不在 `figma-state.json` 的结构化字段里 **[记录]** |

视觉验收规则：类型检查、单测、构建**都不等于**视觉验收；可信样本只能来自微信开发者工具或真机的 375×812 截图与在线稿比对。

**设计稿渲染完成也不等于可实现**：新旧 UI 的逐页配对视觉/交互比较尚未完成（见 `.trellis/tasks/09-18-fullstack-readiness-figma-design/implement.md`）。

---

## 4. 技术面

### 4.1 后端 `apps/api`

- 框架 Fastify ^5.8.5，ESM，TS；**除框架与工作区 `@football-club/domain` 外，唯一额外第三方运行期依赖是 `exceljs`** **[实测]**。
- 持久化用 Node 内置 `node:sqlite`（非 better-sqlite3）；数据库文件路径由入口层从 `DATABASE_URL` 传入，默认 `apps/api/data/dev.sqlite`（`openSqliteDatabase()` 自身的默认值是 `:memory:`）**[实测]**。
- **20 个版本化迁移**（`apps/api/db/migrations/0001..0020_*.sql`），共定义 **65 张表**（60 条 `CREATE TABLE IF NOT EXISTS` + 5 条 `CREATE TABLE`，另有 47 条 `CREATE INDEX`、13 条 `ALTER TABLE`）；迁移按文件名排序、逐个 `BEGIN/COMMIT/ROLLBACK`，**无 down/回滚脚本**；运行期另有元数据表 `schema_migrations`（由 `apps/api/src/persistence/sqlite.ts:29` 创建）**[实测]**。
- **107 个路由注册点**（含 `GET /openapi.json`），业务路由 106；其中 `app-client.routes.ts` 单文件 4089 行、承载 **50 个**小程序 BFF 端点，其余按域拆分（platform 8 / data-capability 28 / calendar 6 / training 4 / match 2 / metrics 3 / assessment 1 / assessment-workflow 4）**[实测]**。
- 鉴权：不透明 Bearer 令牌；**数据库 `token_hash` 列保存原始令牌的 SHA-256**，查询时按散列匹配；默认 TTL 30 天（注释说明为俱乐部内部应用，避免 2 小时强制重授权）。校验包含 club/client/membership/activeRole 一致性；角色守卫 `requireClubRole`/`requireStudentAccess`；家长读权限靠 guardian binding 判定 **[实测]**。
- `X-User-Id` 只在正式工厂为 `development|test` 时生效（本地隔离 smoke 用）；直接实例化 header resolver 的默认条件更宽，安全结论依赖使用正式工厂 **[实测]**。
- 幂等与缓存：`preHandler` 做幂等键重放（默认 30 分钟 TTL），`onSend` 处理 ETag/缓存控制；**并非所有幂等键都是 30 分钟**——例如比赛事件另有 24 小时幂等记录（`app-client.routes.ts:811`）**[实测]**。
- 错误体统一 `{error:{code,message,details}}`；无 `statusCode` 的异常会落到 400，且 500 以下会回显原始 `error.message` **[实测]**。
- 微信登录 connector 已实现（读 `WECHAT_MINIPROGRAM_APP_ID`/`WECHAT_MINIPROGRAM_APP_SECRET`）；未绑定手机号返回 `binding_required`，前端不得伪造角色 **[实测]**。
- 启动行为：进程启动即 `migrate`，并按 `options.seed ?? true`（`apps/api/src/persistence/platform-persistence.ts:295`，种子函数 `seedPlatformData` 定义在 `:80`）跑种子 upsert；验收专用种子另受双闸（`apps/api/src/seed/index.ts:52-53`：`NODE_ENV !== production` 且 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`，入口判定在 `:23`）**[实测]**。

### 4.2 领域包 `packages/domain`

生产源码 **20 个文件约 2301 行**（另有一个测试文件 `tactical-board.test.ts`，合计 21 个文件 2319 行）：指标（`metrics.ts` 459 行）、指标图谱服务、比赛服务、测评服务、日历、隐私、战术板、俱乐部/人员/队伍基础模型与 ports **[实测]**。

### 4.3 小程序端

- `utils/api.ts` 1594 行、50 个导出函数，是唯一取数入口，路径统一 `/clubs/{clubId}/app-clients/{clientId}/...`；`utils/types.ts` 581 行是**手写 DTO**，不引用 `@football-club/domain` **[实测]**。
- `utils/request.ts` 走 `wx.request`：有上下文/会话时才带 `X-Club-Id`/`X-Client-Id`/`Authorization` 等头；**只有调用方显式标记 `idempotent`/`idempotencyKey` 的非 GET 请求才自动生成幂等键**；401 清会话并回登录页；baseURL 三环境同为 `https://cqtc.pomi.tech` **[实测]**。
- **没有通用 HTTP 响应缓存层**；个别接口用 `forceRefresh` 拼时间戳绕缓存（`utils/api.ts:247`、`:1512`）；字段缺失靠大量 `normalizeXxx` 兜底 **[实测]**。
- 本地持久化：会话（token/role/availableRoles/userId/phone/expiresAt/currentStudentId）、测评与比赛草稿、提醒已读、教练选队 **[实测]**。
- 自定义 role-tabbar 切 Tab 用 `wx.reLaunch` → **每次切换清空页面栈** **[实测]**。

### 4.4 契约与校验

OpenAPI 3.1 由 `http/openapi.ts`（606 行）手工声明后经 `GET /openapi.json` 暴露，schema 集中在 `http/schemas.ts`（2297 行）。**有部分契约断言（paths、headers、响应字段），但没有代码生成，也没有把 107 个实际注册点与 OpenAPI paths 做自动穷尽 drift 对比** **[实测]**。

### 4.5 测试与质量基线

2026-09-18 本机实跑 `pnpm -w run check` → **exit 0** **[实测]**：

| 范围 | 结果 |
| --- | --- |
| 领域包 | 9 个测试文件 / 23 项通过 |
| 小程序 | 71 个测试文件 / 506 用例：505 通过 + 1 跳过（原生 Windows 相关） |
| API | 17 个测试文件 / 147 项通过 |

CI（`.github/workflows/ci.yml`）在 Node 24、只读权限下跑 frozen install + check + build **[实测]**。

---

## 5. 部署与运行

### 5.1 生产拓扑（**[记录]**，本轮未复验）

- 域名 `https://cqtc.pomi.tech`，DNS 目标 `43.136.114.225`，操作系统 Ubuntu Server 24.04 LTS；Nginx TLS 反代到容器内 `127.0.0.1:3000`。这些来自历史交接资料，`deployment-requirements.md` 也明确要求移交后重新只读核对，**不得当作当前事实**。
- 仓库内编排（这部分是**代码事实**，不是服务器状态）**[实测]**：`docker-compose.yml` 两个服务——`data-init`（修数据卷属主后退出）与 `api`（`restart: unless-stopped`）；SQLite 落在 named volume `cq-talent-api-data`（`/var/lib/cq-talent/api.sqlite`）；`cap_drop: ALL`、`no-new-privileges`；端口映射 `127.0.0.1:3000:3000`；`env_file: .env.runtime`。
- `Dockerfile` 两段式，基础镜像 `docker.1ms.run/library/node:24-bookworm-slim`（走国内镜像源，不是直接 Docker Hub）；运行期非 root 用户 `node`，启动命令 `node apps/api/dist/index.js` **[实测]**。
- **基础 compose 的镜像标签是可变 `latest`**；固定发布标签依赖生产侧 override（见 5.3）**[实测]**。

### 5.2 发布 playbook（已采用，建议继续遵守）

只读盘点 → 受限 SQLite 备份（含 WAL/SHM，目录 0700、文件 0600）→ 按**已提交的 Git 树**构建固定标签镜像（不用可变 `latest`）→ 只重建 API 容器（`--no-build --no-deps --pull never`）→ 内外健康检查（`/health` 与未认证业务请求 403）→ 有界读回（关键表逐值比对）→ 写发布记录。**API 部署与 `git push` 无关**，Git 平台状态不能当部署状态。

### 5.3 最近一次有仓库证据的线上发布（**[记录]** 2026-09-16，本轮未复验）

- 发布对象：提交 `b050391`，镜像 `cq-talent-api:b050391`，发布目录 `/opt/cq-talent-releases/b050391`，回滚镜像 `cq-talent-api:rollback-c893adb-20260916`。
- 切换前备份：`/opt/cq-talent-backups/assessment-release-20260916T014512Z/api.sqlite`，68,087,808 字节，SHA-256 与 integrity 均有记录；12 张关键表逐值比对无缺失/变更。
- 发布当时的数据规模：users 206、parents 197、students 334、sessions 244、assessments 267、raw results 16,492、scores 16,493、metric records 30,162、lineage 9,842。**这是当时快照，不是当前值。**

公开面复核 **[实测]**：2026-09-18 本机 `curl -s https://cqtc.pomi.tech/health` → HTTP 200，`{"status":"ok","service":"@football-club/api"}`（0.28s；另有同日一次 0.47s 记录）。`/health` 不返回版本号，因此**线上当前具体版本本轮未复验**。

### 5.4 环境变量（只记名称）

`DATABASE_URL`、`PORT`、`HOST`、`NODE_ENV`、`WECHAT_MINIPROGRAM_APP_ID`、`WECHAT_MINIPROGRAM_APP_SECRET`、`API_DEFAULT_USER_ID`、`CQ_TALENT_MATCH_EVENT_TYPES`、`FCM_CQ_TALENT_ACCEPTANCE_SEED`、`FCM_CQ_TALENT_ACCEPTANCE_PHONE`、`FCM_ASSESSMENT_PUBLICATION_CLUBS`。另有安全测试账号与 WPS connector 的独立私有变量，未在此列全。服务器私有运行时用 `.env.runtime`（已 gitignore；其内容属外部状态，仓库无法验证）。

任何密码、密钥、令牌、手机号、会话内容不得写入仓库、文档、日志或命令历史。

### 5.5 本地命令与工具

```bash
pnpm install --frozen-lockfile
pnpm -w run check                        # typecheck + test
pnpm -w run dev:api                      # tsx watch src/dev.ts（本地开发入口）
pnpm -w run check:miniprogram-policy     # 小程序平台规则报告式检查（恒 exit 0）
```

- 小程序预览/上传：`pnpm --filter @football-club/miniprogram-cq-talent devtools:preview`，**运行前需要开发者工具处于登录态**。
- 开发者工具自动化（miniprogram-automator 截图/路由脚本）：需要 IDE 已打开并开启「服务端口」；本轮实测 9420–9425 无监听 **[实测]**。这是「恢复步骤」，不是永久不可用。
- 本机当前没有运行本项目的 API 进程 **[实测]**。

---

## 6. 交付与发布状态

| 项 | 状态 |
| --- | --- |
| 小程序体验版 | **[记录]** 2026-09-16 已上传 `9.7.4`（包体 1,243,081 字节，官方 CLI 上传成功）；「设为体验版 / 提交审核 / 正式发布」在微信平台侧**未确认**，需人工在平台完成 **[未验证]** |
| 新评测发布流程 | 代码默认 allowlist 为空，且 2026-09-16 发布记录为空 → 未对线上俱乐部启用；**当前运行容器的值未复验** |
| GitHub | 本地分支 `dev`、HEAD `cccd8d57`，本地 tracking ref `origin/dev = 1453e54`，`git rev-list --left-right --count` 为 `0 21`（本地 ahead 21）**[实测]**。这**只说明相对本地缓存的远端引用**，不等于相对生产部署的差异。2026-09-18 本机复核：`gh auth status` 已登录账号 `clint-cpu`，`gh api repos/haokun3127/football-club-management` 返回 `permissions.push = true`，`git ls-remote`/`git fetch` 正常 **[实测]**；**但本轮没有尝试实际推送**，且 2026-09-16 记录里当时仍是 403。是否已能成功推送，需以一次显式推送为准 |
| 生产数据 | **[记录]** 7 套受控双角色测试账号（每队 19 人、家长各绑 2 名学员）为**合成演示数据**，不是真实成绩；客户开始录入后，未经新授权不得重复重建。当前库内实际状态未复验 |

必须由人工或后台完成的确认（无法由代码验证）：微信 request 合法域名、备案与服务类目、手机号计费余额、审核测试号、iOS/Android 真机授权与安全区/键盘/字号、冷启动与深链、服务器内部容器/卷/配置/备份一致性 **[未验证]**。

---

## 7. 平台合规与官方规范留档

- `docs/reference/wechat-miniprogram/`：2026-09-18 抓取的 **46 篇腾讯官方正文**（框架/配置/分包/能力限制/隐私/开放能力/性能/审核运营/设计），含 `manifest.json`（URL/HTTP/字节/SHA-256）与可重跑脚本 `scripts/wechat-docs/fetch-official-docs.py`；抓取时点最新基础库 **3.17.3（2026-08-20）**，项目 `libVersion` 3.17.0 **[实测]**。
- `.trellis/spec/miniprogram/frontend/`：27 条带编号的开发规则（依据行号、判定方式、处理、Owner TBD、复核日期）**[实测]**；`scripts/miniprogram-policy/check.mjs` 是**报告式**检查器（恒 exit 0，不阻断），当前输出 84 项发现（CONF-002=1、CONF-003=1、PERF-001=2、PKG-001=79、PKG-002=1）**[实测]**。**84 是发现数，不等于 84 个已确认缺陷。**
- 已核对的本项目平台差距见 `docs/reference/wechat-miniprogram/notes/08-本项目平台合规差距-2026-09-18.md`，要点：主包逐文件预算约 1.96 MiB（仓库扫描值，**不等于**微信官方 2M 结论，硬结论只能来自开发者工具/官方上传构建）、`miniprogramRoot` 内混有 72 个测试文件（69 `.test.mjs` + 2 `.test.ts` + 1 `.test.py`，按字节合计约 527 KiB）与 `scripts/`（75 KiB）、隐私授权链路缺失、`wx.getSystemInfoSync` 仍作降级分支、`urlCheck: false`、`libVersion` 落后 **[实测]**。

---

## 8. 风险清单（按严重度）

1. **隐私授权链路缺失（代码级确认）**：`requirePrivacyAuthorize` / `onNeedPrivacyAuthorization` / `getPrivacySetting` / `agreePrivacyAuthorization` / `__usePrivacyCheck__` 在运行时代码中零命中；而登录页已用 `open-type="getPhoneNumber"`（`pages/login/index.wxml:35`）、家长端教练团队页用 `wx.setClipboardData`（`pages/parent/coaches/index.ts:53`）。是否会被真机/审核拦截无法由仓库证明，但风险成立 **[实测]**。
2. **销课存在三条写入路径**：点名扣课（`app-client.routes.ts:2801-2843` → `store.ts:2131` → `data-capability-repositories.ts:781`）、`/lesson-confirmation` 的 POST/PATCH（`:2925`、`:3013`）、后台 `POST /clubs/:clubId/admin/students/:studentId/lesson-adjustments`（`data-capability.routes.ts:548-570`）都能改课时账；实施 v1.1 前必须先定唯一写入源与去重策略，否则可能重复扣减 **[实测]**。
3. **三环境同域名**：`utils/config.ts:4-9` 的 develop/trial/release 都指向 `https://cqtc.pomi.tech`，体验或开发测试可直接写生产库（仍受合法 session 与接口权限约束，但隔离风险成立）**[实测]**。
4. **包体与打包卫生**：56 页全在主包无分包；`miniprogramRoot` 含测试与脚本；`project.config.json` 的 `packOptions.ignore` 只有 3 条（逐个文件名排除 venue 原图）；`miniprogramRoot` 下还留着 4 张 `\var\folders\...\parent*.png` 及其 4 个 `.png.json` 伴随文件，共 8 个文件未被 ignore（会参与打包）**[实测]**。
5. **无账号注销/删除数据入口**：`pages/parent/account/index.ts:68-76` 只清本地会话，未找到账号或数据删除接口 **[实测]**。
6. **会话与端点防护**：`app_client_sessions` 有 `revoked_at` 字段，但未见 logout/revoke HTTP 路由（仅角色切换等内部流程会撤销）；依赖里没有任何入站 CORS / helmet / rate-limit 类 Fastify 插件或等价全局实现（只有 WPS **出站**连接器自带 `rateLimitPerMinute` 节流，`integration/wps-connector.ts:325-331`）；无 `statusCode` 的异常会成为 400 并回显 `error.message`（`server.ts:44-60`）**[实测]**。
7. **种子与生产环境的耦合**：基础 compose 在 production 下仍配置 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`（`docker-compose.yml:34-38`），目前靠 `apps/api/src/seed/index.ts:52-53` 的 `NODE_ENV !== production` 闸门拦住；而平台种子本身是启动即 upsert（`platform-persistence.ts:295`）。改动 seed 或环境判断时这是高风险耦合 **[实测]**。
8. **占位兜底可能被当成真实内容**：部分 `normalizeXxx` 兜底会把不完整的成功响应显示成固定文案或空列表（`utils/api.ts:631`、`:940`、`:1348`）。页面对请求失败有自己的 error state，所以不能笼统说「失败时只显示占位」，但这类兜底确实会掩盖数据缺失 **[实测]**。
9. **本地与远端/生产的差异容易混淆**：本地相对本地 tracking ref ahead 21 个提交；生产当前版本未复验。判断「某改动是否已生效」时必须分别查 Git 远端与生产记录 **[实测]**。

---

## 9. 当前在飞的工作与开工前仍缺的事实

`.trellis/tasks/09-18-fullstack-readiness-figma-design`（`in_progress`）：全栈升级开发准备与完整 Figma 设计。已完成：52 项需求的现状/差距映射（`upgrade-readiness-2026-09-18/01-existing-system-and-gaps.md`）、数据与权限、迁移与部署、实施分期与待决登记、130 画板设计。**未完成**：服务器内部与微信后台核验（缺访问条件）、R1–R7 数据/业务专项评审项（R1–R5 被标为开发前必须闭合）、**完整的新旧 UI 逐页配对截图与交互比较**、实现后的真机与 62 条验收执行。

下一步动代码前仍缺的关键事实（按对实施的影响排序）：

1. 后台没有对应应用工作区（`pnpm-workspace.yaml` 只有三个包），后台四模块要新建客户端还是并入现有 API 工作区，未定。
2. 销课唯一写入源与幂等策略未定（见风险 2）。
3. R1–R5 的数据/业务问题未闭合（`.trellis/tasks/09-18-fullstack-readiness-figma-design/implement.md`）。
4. 新旧 UI 逐页配对比较未完成，不能由「130 画板已渲染」推断可实现。
5. 生产侧当前状态（容器版本、卷、allowlist、数据量、后台平台版本状态）全部未复验。

---

## 10. 文档地图与维护约定

- 交接入口：[HANDOFF-GITHUB-2026-09-08.md](../../HANDOFF-GITHUB-2026-09-08.md)
- 进度记录：[progress.md](progress.md)（最新在文件末尾）
- 架构/契约：[architecture.md](architecture.md)、[api-contract.md](api-contract.md)
- 产品需求：[product-requirements/README.md](product-requirements/README.md)
- 设计权威：[figma-source-of-truth.md](figma-source-of-truth.md)
- 部署与运维：[deployment-requirements.md](deployment-requirements.md)
- 平台规范留档：`docs/reference/wechat-miniprogram/README.md`
- 升级准备：[upgrade-readiness-2026-09-18/README.md](upgrade-readiness-2026-09-18/README.md)

维护约定（**本文提出的建议，尚未纳入项目权威工作流**）：事实变化时更新对应条目、在 [progress.md](progress.md) 追加当日记录；引用 **[记录]** 类内容必须带日期；本文不复制设计稿与需求细节，避免与权威文档双写；服务器与微信后台状态的复验结果应写明复核方式与时间。

本文与 `upgrade-readiness-2026-09-18/` 的分工：那套文档服务「本次升级的设计与准备」，本文服务「任何时候接手时的现状导航」。

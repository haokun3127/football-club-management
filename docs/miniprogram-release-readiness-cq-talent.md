# 重庆天才小程序真实数据验收与发布前准备

## 1. 目标

本文件用于推进重庆天才小程序从 MVP 页面重做到发布前准备环境。范围只覆盖：

- 重庆天才足球俱乐部：`club-chongqing-talent / cq-talent / 重庆天才足球俱乐部`
- 微信原生小程序：`apps/miniprogram-cq-talent`
- 本地开发后端 API：`apps/api`
- 总控导入的真实测试数据，目标为 200 人测试数据

不使用 `club-demo`、`demoClubId`、`Demo Football`。不提交 git，由总控统一验收和提交。

## 2. 运行链路

小程序运行链路固定为：

```text
clientKey/appId -> /app-clients/resolve -> clubId/clientId/capabilities -> app-client BFF
```

要求：

- 生产 UI 禁止用户自行选择家长/教练身份。
- 小程序端禁止硬编码 `clubId`、WPS 字段、评测字段和课时规则。
- 缺失 BFF 只能显示“接口待接入/数据待同步”，不得伪造业务结果。
- 写操作只预留 app-client BFF 和 `Idempotency-Key`，不得拼 admin API。

## 3. 本地启动命令

推荐使用临时 sqlite 做小程序验收，避免污染长期 `dev.sqlite`，也避免重复 seed 触发唯一约束冲突：

```bash
find /tmp -maxdepth 1 -name 'fcm-cq-talent-smoke.sqlite*' -delete
DATABASE_URL=/tmp/fcm-cq-talent-smoke.sqlite PORT=3000 HOST=127.0.0.1 pnpm --filter @football-club/api dev
```

如需要使用长期本地库，再显式指定绝对路径，避免 `pnpm --filter` 的包目录相对路径造成歧义。

微信开发者工具：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli islogin
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent --port 9420
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent --port 9420
```

## 4. 真实数据前置检查

验收前必须确认当前数据库是总控导入的 200 人测试数据：

```bash
sqlite3 /tmp/fcm-cq-talent-smoke.sqlite \
  "SELECT 'students', count(*) FROM student_profiles
   UNION ALL SELECT 'parents', count(*) FROM parent_profiles
   UNION ALL SELECT 'coaches', count(*) FROM coach_profiles
   UNION ALL SELECT 'teams', count(*) FROM teams
   UNION ALL SELECT 'events', count(*) FROM calendar_events
   UNION ALL SELECT 'participants', count(*) FROM event_participants
   UNION ALL SELECT 'payments', count(*) FROM payment_events
   UNION ALL SELECT 'insurance', count(*) FROM insurance_policies
   UNION ALL SELECT 'metric_records', count(*) FROM player_metric_records
   UNION ALL SELECT 'external_raw', count(*) FROM external_raw_records;"
```

本轮检查结果：

| 数据项 | 当前数量 |
| --- | ---: |
| student_profiles | 201 |
| parent_profiles | 159 |
| coach_profiles | 8 |
| teams | 9 |
| team_members | 257 |
| external_raw_records | 801 |
| external_record_links | 800 |
| student_operational_profiles | 200 |
| student_contacts | 200 |
| lesson_credit_ledger | 400 |
| insurance_policies | 200 |

结论：当前 smoke sqlite 已具备 200 名重庆天才导入测试学员的运营档案、联系人、课时和保险数据。`student_profiles=201` 是因为保留了后端原始回归样例 `student-1`；小程序 dev 家长身份使用 `user-parent-cq-talent-acceptance`，绑定 200 名导入测试学员。活动、评测和部分能力图谱仍由 seed-backed store 提供给 BFF，不能仅用 sqlite 表计数判断页面数据完整性。

## 5. 家长端手工验收清单

使用 dev 家长身份：

- `DEV_IDENTITY_ROLE = "parent"` 或启动页隐藏切换到家长身份。
- 请求头应带 `X-User-Id: user-parent-cq-talent-acceptance`。
- 启动后不得出现家长/教练自选按钮。

验收项：

| 页面/流程 | 验收点 | 通过标准 | 结果 |
| --- | --- | --- | --- |
| 启动页 | resolve app-client | 成功解析 `club-chongqing-talent` 和 `app-client-cq-talent-wechat-main` | 已通过 |
| 家长日程 | 孩子绑定 | 展示当前家长绑定孩子；无其他孩子隐私 | 已通过，200 名导入学员 |
| 家长日程 | 活动列表 | 展示训练/比赛/其他活动，字段来自 BFF | 已通过，单学员 2 个活动 |
| 活动详情 | 训练/比赛详情 | 展示时间、场地、队伍、状态、摘要；缺字段显示待同步 | 已通过基础读取 |
| 成长 | 雷达图 | 指标来自 `growth-summary`；指标不足不画误导性 0 分 | 已通过基础读取 |
| 指标详情 | 下钻入口 | 缺 BFF 时显示待接入，不展示内部公式/其他孩子数据 | 待 200 人数据复验 |
| 我的孩子 | 课时/保险 | 只读展示；不提供充值、投保、申诉、修改入口 | 已通过，课时/保险来自导入数据 |
| 私教意向 | 提交入口 | 当前显示 app-client BFF 待接入，不伪造成功 | 待 200 人数据复验 |

## 6. 教练端手工验收清单

使用 dev 教练身份：

- `DEV_IDENTITY_ROLE = "coach"` 或启动页隐藏切换到教练身份。
- 请求头应带 `X-User-Id: user-coach-1`。
- 启动后不得出现家长/教练自选按钮。

验收项：

| 页面/流程 | 验收点 | 通过标准 | 结果 |
| --- | --- | --- | --- |
| 教练日程 | 今日/周课表 | 只展示教练权限范围内活动 | 已通过，2026-06-28 训练活动 |
| 活动工作台 | roster/workflow | 显示点名、销课、记录完善度和学员名单 | 已通过，`2026-06-28` 教练活动 roster 25 人 |
| 点名 | 学员名单 | 读取 workbench roster；保存走 app-client BFF | 已通过读取与写入 smoke |
| 销课 | 默认全员销课、返还/补扣纠正 | 确认和纠正都走 app-client lesson-confirmation BFF | 已通过写入 smoke |
| 比赛录入 | 比赛摘要入口 | 使用 app-client matches BFF，不拼 admin API | 最小摘要表单已接入；球员事件/点评后续完善 |
| 训练管理 | 训练内容/覆盖 | 训练项目树、覆盖预览缺口清晰呈现 | 待 200 人数据复验 |
| 评测录入 | assessment form | 可读取表单配置；手动完整提交走 app-client assessment BFF；自动保存/任务模型待补 | 已通过完整 62 项提交 smoke |
| 我的 | 权限范围 | 明确可读、可写、不可见范围 | 待 200 人数据复验 |

## 7. P0 后端交付清单

以下缺口需要 F/总控安排后端补齐，小程序前端已预留入口和状态：

| P0 BFF | 建议路径 | 前端入口 | 验收标准 |
| --- | --- | --- | --- |
| 微信登录 + 手机号匹配 | `POST /clubs/:clubId/app-clients/:clientId/wechat-login` | 启动/登录绑定 | 返回 session、role、profile、children/capabilities；失败不进入业务页 |
| 家庭聚合日程 | `GET /clubs/:clubId/app-clients/:clientId/parent/calendar?from=&to=` | 家长日程 | 多孩子家庭日程一次返回，按绑定权限裁剪 |
| 训练内容树 | `GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree` | 训练管理 | 返回核心能力 -> 二级 -> 三级 -> 推荐训练项目 |
| 训练内容保存 | `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects` | 训练管理 | 保存本活动训练内容，支持后续覆盖预览 |

## 8. 发布前准备状态

| 项 | 当前状态 | 下一步 |
| --- | --- | --- |
| 小程序 typecheck | 已通过 | 保持每次改动后运行 |
| 小程序 app-client smoke | 已固化为 `pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client` | 后端补 P0 或页面改动后复跑 |
| DevTools CLI 登录 | 已通过 | 用真机预览复验 |
| DevTools open/preview | 已固化为 `pnpm --filter @football-club/miniprogram-cq-talent devtools:preview`，已通过 | 真机预览复验 |
| 测试 AppID | 已配置 `wx3df49f3b936ab2ed` | 发布前替换正式 AppID |
| 合法域名/HTTPS | 未配置 | 后端部署到 HTTPS 后配置微信后台 |
| 生产登录 | 缺 P0 BFF | 后端补齐 `wechat-login` |
| 200 人数据 | 已接入本地 dev seed/BFF smoke | 继续做真机手工验收 |
| 点名/销课写入 | 点名、销课确认、销课纠正已接入并通过本地 API smoke | 真机点击复验 |
| 比赛摘要写入 | 已接入 app-client BFF，并通过本地 API smoke | 真机点击复验 |
| 评测完整提交 | 已接入 app-client BFF，并通过本地 API smoke | 真机点击复验 |

## 9. 2026-06-28 本轮验证记录

### 小程序静态检查

```bash
pnpm --filter @football-club/miniprogram-cq-talent typecheck
rg -n "club-chongqing-talent|app-client-cq-talent|club-demo|demoClubId|Demo Football|mock 登录|张小明|王教练" apps/miniprogram-cq-talent
```

结果：

- TypeScript 检查通过。
- 小程序实现目录未发现硬编码 `clubId/clientId`、demo 标识、旧 mock 登录文案或演示姓名。

### 本地 API smoke

本地 API 启动：

```bash
DATABASE_URL=/tmp/fcm-cq-talent-smoke.sqlite PORT=3000 HOST=127.0.0.1 pnpm --filter @football-club/api dev
pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client
```

验证结果：

| 检查 | 结果 |
| --- | --- |
| `GET /health` | 200，`service=@football-club/api` |
| `GET /app-clients/resolve?clientKey=cq-talent-wechat-main` | `clubId=club-chongqing-talent`，`clientId=app-client-cq-talent-wechat-main` |
| `GET /app-clients/resolve?clientKey=cq-talent-wechat-main` | `clubId=club-chongqing-talent`，`clientId=app-client-cq-talent-wechat-main`，主题色 `#E60012/#C4000F/#FFF1F0` |
| parent children，`X-User-Id: user-parent-cq-talent-acceptance` | 200 个孩子，首个孩子 `丁云帆` |
| parent schedule，首个导入学员 | 3 个活动，字段来自 app-client BFF |
| parent growth-summary，首个导入学员 | `latest=1` |
| coach home，`X-User-Id: user-coach-1`，`date=2026-06-28` | 1 个活动：`event-cq-talent-u10-dev-training` |
| coach workbench，`event-cq-talent-u10-dev-training` | participants 25 |
| coach lesson confirmation，`POST .../lesson-confirmation` | 单学员销课确认写入 1 条 debit ledger |
| coach lesson correction，`PATCH .../lesson-confirmation` | 单学员返还 1 课时写入 adjustment ledger |
| coach match write，`POST .../coach/matches` | `event-cq-talent-u10-dev-training` 写入比赛摘要，比分 `3:1` |
| coach assessment write，`POST .../coach/assessments` | 精英评测模板 62 个 input 项完整提交成功，生成 62 条 rawResults、62 条 scores、99 条 metricRecords |

### DevTools CLI

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli islogin
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent --port 9420
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent --port 9420
pnpm --filter @football-club/miniprogram-cq-talent devtools:preview
```

结果：

- CLI 已登录。
- `open` 成功。
- `preview` 成功，测试 AppID `wx3df49f3b936ab2ed`，当前包体约 `94.8 KB`。

### 2026-06-28 追加验证

本轮继续推进后：

- 小程序点名页已接入 `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/attendance`。
- 小程序销课页已接入 `POST/PATCH /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation`，支持确认、返还 1 课时、补扣 1 课时。
- 本地 API 写入 smoke 已通过：`event-cq-talent-u10-dev-training` roster 25 人，前 3 名点名写入 `present`，`student-cq-talent-003` 销课确认和返还纠正成功写入课时流水。
- 小程序比赛摘要页已接入 `POST /clubs/:clubId/app-clients/:clientId/coach/matches`，保存 `eventId/matchType/status/opponentName/homeScore/awayScore`。
- 小程序评测录入页已接入 `POST /clubs/:clubId/app-clients/:clientId/coach/assessments`，按后端 `fields[].binding.testItemId / metricId` 提交 rawResults；精英评测模板完整 62 项 smoke 通过，生成 62 条 scores、99 条 metricRecords。
- `pnpm --filter @football-club/api test` 通过：5 个测试文件，53 个测试。
- `pnpm --filter @football-club/api typecheck` 通过。
- `pnpm --filter @football-club/miniprogram-cq-talent typecheck` 通过。
- `pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client` 已新增为固定验收脚本，并已通过：14 个检查项，parent children 200 人，coach roster 25 人，评测 62 rawResults / 62 scores / 99 metricRecords。
- `pnpm --filter @football-club/miniprogram-cq-talent devtools:preview` 已新增为固定 DevTools CLI 验收脚本，并已通过：`islogin/open/preview` 成功，包体 `94.8 KB / 97054 Byte`。
- DevTools CLI `islogin/open/preview` 通过，测试 AppID `wx3df49f3b936ab2ed`，包体 `94.8 KB / 97054 Byte`。
- 本地 API 日志显示 DevTools 模拟器从 `localhost:3000` 发起过 `resolve`、`parent/children`、`parent/students/:studentId/schedule` 请求，已验证模拟器能连到本地后端。
- 手工点击验收步骤已补充到 `docs/miniprogram-manual-acceptance-cq-talent.md`。
- 已创建后端 P0 Trellis 任务：`.trellis/tasks/06-28-cq-talent-miniprogram-p0-bff`。
- P0 BFF 缺口摘要已发送到总控线程 `019efcb5-8fe3-7951-a534-502d0abff8ce`，交由 F/后端补齐。

注意：写入 smoke 会改变当前 sqlite 中的比赛/点名/课时流水。为避免污染长期 dev.sqlite，本轮验证使用 `/tmp/fcm-cq-talent-smoke.sqlite` 全新临时库。若对同一个持久 sqlite 反复 seed，可能触发唯一约束冲突，应重建临时库或补齐持久化 seed 幂等策略。

### 当前未完成项

- 真机手工点击验收还需用户在 DevTools/预览码中完成；当前 Computer Use 无法获取 Wechat Devtools 窗口，`screencapture` 输出黑屏，无法由 Codex 直接提供视觉截图证据。
- P0 后端剩余：生产 `wechat-login`、家庭聚合日程、训练内容树、训练内容保存。
- 比赛录入已有最小摘要表单；球员事件/点评/战术板仍需继续完善。
- 评测录入已有手动完整提交；单格自动保存、缺测、任务分配仍需 assessment-task BFF。

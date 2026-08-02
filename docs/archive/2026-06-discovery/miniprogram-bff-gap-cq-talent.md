# 重庆天才小程序 BFF/API 缺口清单

## 1. 口径

小程序只调用：

- `GET /app-clients/resolve?...`
- `GET /clubs/:clubId/capabilities?clientId=...`
- `/clubs/:clubId/app-clients/:clientId/...` 下的家长/教练 BFF

小程序不得拼 admin API，不直接连接 WPS，不在前端写死重庆天才表格字段、评测字段或课时规则。所有写入请求预留 `Idempotency-Key`。

## 2. 当前已具备或基本可用

| 能力 | 当前接口 | 状态 | 小程序使用方式 |
| --- | --- | --- | --- |
| 客户端解析 | `GET /app-clients/resolve?appId=...` 或 `?clientKey=...` | 已有 | 启动页调用，保存 `clubId/clientId/capabilities`。 |
| 客户端 capabilities | `GET /clubs/:clubId/capabilities?clientId=...` | 已有 | 渲染导航、字段可见性、功能开关。 |
| 家长孩子列表 | `GET /clubs/:clubId/app-clients/:clientId/parent/children` | 已有 | 孩子切换和只读权限边界。 |
| 家长孩子首页 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/home` | 已有 | 我的孩子、课时保险、近期活动、同步状态。 |
| 家长单孩子日程 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/schedule` | 已有 | 孩子详情页使用。 |
| 家庭聚合日程 | `GET /clubs/:clubId/app-clients/:clientId/parent/calendar?from=&to=` | 已补齐 | 按 guardian 绑定聚合多孩子活动，并裁剪参与人。 |
| 家长活动摘要 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/activity-summaries` | 已有 | 训练/比赛摘要列表。 |
| 家长成长摘要 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/growth-summary` | 已有 | 雷达图和指标趋势基础数据。 |
| 角色裁剪活动详情 | `GET /clubs/:clubId/app-clients/:clientId/events/:eventId` | 已有 | 家长/教练活动详情。 |
| 教练今日工作台 | `GET /clubs/:clubId/app-clients/:clientId/coach/home?date=...` | 已有 | 教练日程首页基础。 |
| 教练活动工作台 | `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench` | 已有 | 点名、训练、比赛、评测页面读取上下文。 |
| 训练内容树 | `GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree` | 已补齐 | 来源天才评测大纲推荐训练项目和训练 catalog。 |
| 训练内容保存 | `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects` | 已补齐 | 校验教练活动权限，写入活动专属 session plan，支持 `Idempotency-Key`。 |
| 点名写入 | `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/attendance` | 已有，前端已接入 | 教练点名保存，携带 `Idempotency-Key`。 |
| 销课读取/确认/纠正 | `GET/POST/PATCH /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation` | 已有，前端已接入 | 教练销课确认、返还 1 课时、补扣 1 课时，携带 `Idempotency-Key`。 |
| 比赛录入 app-client 口径 | `POST /clubs/:clubId/app-clients/:clientId/coach/matches` | 已有，前端已接入摘要和球员事件 | 小程序不得调用非 app-client match API；进球/助攻会生成对应球员指标记录，点评和战术板后续完善。 |
| 评测提交 app-client 口径 | `POST /clubs/:clubId/app-clients/:clientId/coach/assessments` | 已有，手动完整提交前端已接入 | 小程序不得调用非 app-client assessment API；单格自动保存仍需 assessment-task BFF。 |
| 评测表单配置 | `GET /clubs/:clubId/app-clients/:clientId/coach/assessments/templates/:templateId/form` | 已有 | 教练评测录入读取模板字段。 |

## 3. 登录与账号缺口

| 缺口 | 建议接口 | 用途 | 优先级 |
| --- | --- | --- | --- |
| 微信真实 connector | `POST /clubs/:clubId/app-clients/:clientId/wechat-login` 内部接微信 `code2Session` / 手机号接口 | 当前 BFF 已禁止 `roleHint` 作为权威身份，并按平台 membership 返回 session、role、profile、children、capabilities；生产还需接入微信 AppSecret 和手机号换取 connector。 | P0 |
| session 刷新 | `POST /clubs/:clubId/app-clients/:clientId/session/refresh` | 小程序后台恢复和 token 续期。 | P1 |
| 当前账号状态 | `GET /clubs/:clubId/app-clients/:clientId/me` | 我的/账号绑定页展示 role、绑定状态、最近登录。 | P1 |
| 绑定状态回写 WPS | 后台任务/API | 小程序不直接写 WPS；后端绑定成功后回写同步状态。 | P1 |

## 4. 家长端缺口

| 缺口 | 建议接口 | 说明 | 优先级 |
| --- | --- | --- | --- |
| 家庭聚合日程 | `GET /clubs/:clubId/app-clients/:clientId/parent/calendar?from=&to=` | 已补齐；后续可加提醒、日历筛选和分页。 | 已完成 |
| Banner/内容 | `GET /clubs/:clubId/app-clients/:clientId/content/banners` | 俱乐部运营位，不写死前端。 | P1 |
| 提醒中心 | `GET /clubs/:clubId/app-clients/:clientId/parent/notifications`；`POST .../:notificationId/read` | 小程序内提醒列表和未读数。 | P1 |
| 指标详情 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/ability-metrics/:metricId` | 雷达图点击后展示来源记录、趋势、相关训练。 | P1 |
| 成长足迹 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/milestones` | 成长页情绪价值时间轴。 | P1 |
| 训练历程 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/training-history` | 训练次数、内容分布、能力覆盖。 | P1 |
| 俱乐部信息/球场/帮助/教练团队 | `GET /clubs/:clubId/app-clients/:clientId/content/...` | 我的孩子页内容中心。 | P1 |
| 私教意向提交 | `POST /clubs/:clubId/app-clients/:clientId/parent/private-lesson-interests` | 只发意向通知，不做订单/支付/派单。 | P2 |
| 状态局部刷新 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/status-summary` | 课时/保险页局部刷新。 | P2 |

## 5. 教练端缺口

| 缺口 | 建议接口 | 说明 | 优先级 |
| --- | --- | --- | --- |
| 训练内容树 | `GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree` | 已补齐；核心能力 -> 二级 -> 推荐训练项目。 | 已完成 |
| 训练内容保存 | `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects` | 已补齐；保存本活动训练内容到活动专属 session plan。 | 已完成 |
| 能力覆盖预览 | `POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects/preview` | 后端返回覆盖结果，前端不计算模型。 | P1 |
| 应用到未来课程 | `POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects/apply-forward` | 批量应用训练内容。 | P1 |
| 教练我的 | `GET /clubs/:clubId/app-clients/:clientId/coach/me` | 教练身份、负责球队、权限范围。 | P1 |
| 权限上下文 | `GET /clubs/:clubId/app-clients/:clientId/coach/permission-context` | 精细控制活动、球队、写入能力。 | P1 |
| 测试任务 | `GET/POST /clubs/:clubId/app-clients/:clientId/coach/assessment-tasks` | 测试计划和任务列表；当前小程序只支持按模板手动完整提交。 | P1 |
| 测试成绩自动保存 | `PUT /clubs/:clubId/app-clients/:clientId/coach/assessment-tasks/:taskId/items/:itemId/scores` | 单格保存、缺测、重试；当前小程序提交前要求必填输入完整。 | P1 |
| 学员/全队雷达 | `GET /clubs/:clubId/app-clients/:clientId/coach/students/:studentId/ability-radars`；`GET .../coach/teams/:teamId/ability-overview` | 教练训练管理页。 | P1 |
| 私教意向提醒 | `GET /clubs/:clubId/app-clients/:clientId/coach/private-lesson-interests`；`POST .../:interestId/read` | 教练我的页提醒。 | P2 |
| 战术板 PoC 接口 | `GET/PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/tactical-board` | PoC/占位，不阻塞 MVP 主流程。 | P2 |

## 6. 前端当前处理

- 对已存在 BFF：实现统一 request 封装和页面调用结构。
- 对缺口 BFF：页面展示结构化待接入/待同步状态，不伪造业务成功结果，不接 admin API。
- 对写操作：前端统一生成 `Idempotency-Key`。点名保存、销课确认/纠正、训练内容保存、最小比赛摘要、评测手动完整提交已接入 app-client BFF；评测单格自动保存/任务模型仍需补齐。
- 对登录：实现 `resolve + wx.login + 手机号授权` 页面结构；`wechat-login` BFF 已禁止 `roleHint` 作为权威身份，生产 UI 不出现角色选择；真实微信 connector 仍需 AppSecret 和手机号接口联调。

## 6.1 导入数据模拟测试

开发完成后，使用会话 `019efcb5-8fe3-7951-a534-502d0abff8ce` 已完成导入的真实测试数据作为主验收数据源：

- 家长端：孩子绑定、家庭日程、训练/比赛详情、课时/保险、成长雷达、训练历程、指标下钻。
- 教练端：今日/周课表、活动 workbench、点名名单、销课名单、比赛录入入口、评测表单、学员雷达。
- 验收重点：导入表格关键字段必须通过 BFF/capabilities 投射到页面，不允许前端硬编码 WPS 字段或演示学员/教练数据。

## 7. 验收前阻塞项

上线前剩余阻塞项：

1. 微信真实 connector：`code2Session`、手机号换取、openId/unionId 绑定和 session 刷新。
2. 评测任务/自动保存模型；比赛点评和战术板扩展表单。
3. 生产 capabilities 中的 `client.theme`、`roleEntrypoints`、`calendar.participantStatuses`、`match.eventTypes`、`assessment.views`。

## 8. 已完成的 P0 后端任务

小程序端已经为以下能力预留页面、状态和请求封装；后端已按 app-client BFF 口径补齐：

| 任务 | 路径 | 小程序入口 | 备注 |
| --- | --- | --- | --- |
| 微信登录 BFF 生产边界 | `POST /clubs/:clubId/app-clients/:clientId/wechat-login` | 启动页/登录绑定 | 不再信任 `roleHint`，按平台认证 membership 返回 session、role、profile、children、capabilities；真实微信 connector 待接。 |
| 家庭聚合日程 | `GET /clubs/:clubId/app-clients/:clientId/parent/calendar?from=&to=` | 家长日程 | 按 guardian 绑定聚合多孩子活动，并裁剪参与人。 |
| 训练内容树 | `GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree` | 训练管理 | 核心能力 -> 二级 -> 推荐训练项目。 |
| 训练内容保存 | `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects` | 训练管理 | 保存本活动训练内容，后续接能力覆盖预览。 |

当前本地 dev sqlite 已通过重庆天才验收 seed 写入 200 名导入测试学员，并通过 parent/coach app-client BFF 完成 smoke。后续生产 P0 主要剩余微信真实 connector；家庭聚合日程、训练内容树、训练内容保存、点名、销课、比赛事件、评测完整提交均已接入前端并通过本地 API 写入 smoke。

## 9. 实现审计后的状态修正

`docs/miniprogram-implementation-audit-cq-talent.md` 对照页面蓝图和当前小程序实现后，确认以下 BFF 状态需要在后续开发中重点处理：

| 项 | 状态修正 | 后续动作 |
| --- | --- | --- |
| 家庭聚合日程 | BFF 已补齐，前端已改用 `parent/calendar`。 | 后续只做提醒、分页和日历高级筛选。 |
| 训练内容树/保存 | BFF 已补齐，训练管理页已接入。 | 后续补能力覆盖预览和应用到未来课程。 |
| 比赛进球/助攻事件 | app-client schema 已包含球员事件，前端已接入。 | 后续补点评、战术板和赛后报告。 |
| 点名状态编辑 | 点名写入 BFF 已有，前端已支持单人状态、批量到课和备注。 | 后续补弱网本地持久化草稿。 |
| 销课例外选择 | 销课确认/纠正 BFF 已有，前端已支持不销课例外和原因。 | 后续补更完整余额预览和规则说明。 |
| 指标详情/内容中心/账号详情 | 仍是 P1 BFF 缺口。 | 按页面蓝图补 BFF 后再实现完整详情页。 |

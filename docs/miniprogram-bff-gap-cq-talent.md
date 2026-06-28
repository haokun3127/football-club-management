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
| 家长日程 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/schedule` | 已有 | 当前为单孩子日程；家庭聚合仍建议补齐。 |
| 家长活动摘要 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/activity-summaries` | 已有 | 训练/比赛摘要列表。 |
| 家长成长摘要 | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/growth-summary` | 已有 | 雷达图和指标趋势基础数据。 |
| 角色裁剪活动详情 | `GET /clubs/:clubId/app-clients/:clientId/events/:eventId` | 已有 | 家长/教练活动详情。 |
| 教练今日工作台 | `GET /clubs/:clubId/app-clients/:clientId/coach/home?date=...` | 已有 | 教练日程首页基础。 |
| 教练活动工作台 | `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench` | 已有 | 点名、训练、比赛、评测页面读取上下文。 |
| 评测表单配置 | `GET /clubs/:clubId/app-clients/:clientId/coach/assessments/templates/:templateId/form` | 已有 | 教练评测录入读取模板字段。 |

## 3. 登录与账号缺口

| 缺口 | 建议接口 | 用途 | 优先级 |
| --- | --- | --- | --- |
| 微信登录 + 手机号首次匹配 | `POST /clubs/:clubId/app-clients/:clientId/wechat-login` | 用 `wx.login code` 和手机号授权 code 匹配 parent/coach profile，返回 session、role、children、capabilities。 | P0 |
| session 刷新 | `POST /clubs/:clubId/app-clients/:clientId/session/refresh` | 小程序后台恢复和 token 续期。 | P1 |
| 当前账号状态 | `GET /clubs/:clubId/app-clients/:clientId/me` | 我的/账号绑定页展示 role、绑定状态、最近登录。 | P1 |
| 绑定状态回写 WPS | 后台任务/API | 小程序不直接写 WPS；后端绑定成功后回写同步状态。 | P1 |

## 4. 家长端缺口

| 缺口 | 建议接口 | 说明 | 优先级 |
| --- | --- | --- | --- |
| 家庭聚合日程 | `GET /clubs/:clubId/app-clients/:clientId/parent/calendar?from=&to=` | 当前已有单孩子 schedule；日程首页默认展示所有孩子，需要聚合。 | P0 |
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
| 点名写入 | `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/attendance` | 小程序不能拼 admin participants API；状态来自 capabilities。 | P0 |
| 销课读取/确认/纠正 | `GET/POST/PATCH /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation` | 默认全员销课，15 天内纠正。 | P0 |
| 比赛创建/编辑 app-client 口径 | `POST/PATCH /clubs/:clubId/app-clients/:clientId/coach/matches` | 当前 `POST /clubs/:clubId/matches` 不在 app-client 命名空间，需确认小程序可用路径。 | P0 |
| 训练内容树 | `GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree` | 核心能力 -> 二级 -> 三级 -> 推荐训练项目。 | P0 |
| 训练内容保存 | `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects` | 保存本活动训练内容。 | P0 |
| 能力覆盖预览 | `POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects/preview` | 后端返回覆盖结果，前端不计算模型。 | P1 |
| 应用到未来课程 | `POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects/apply-forward` | 批量应用训练内容。 | P1 |
| 教练我的 | `GET /clubs/:clubId/app-clients/:clientId/coach/me` | 教练身份、负责球队、权限范围。 | P1 |
| 权限上下文 | `GET /clubs/:clubId/app-clients/:clientId/coach/permission-context` | 精细控制活动、球队、写入能力。 | P1 |
| 测试任务 | `GET/POST /clubs/:clubId/app-clients/:clientId/coach/assessment-tasks` | 测试计划和任务列表。 | P1 |
| 测试成绩自动保存 | `PUT /clubs/:clubId/app-clients/:clientId/coach/assessment-tasks/:taskId/items/:itemId/scores` | 单格保存、缺测、重试。 | P1 |
| 评测提交 app-client 口径 | `POST /clubs/:clubId/app-clients/:clientId/coach/assessments` | 当前 `POST /clubs/:clubId/assessments` 需确认是否允许小程序调用。 | P1 |
| 学员/全队雷达 | `GET /clubs/:clubId/app-clients/:clientId/coach/students/:studentId/ability-radars`；`GET .../coach/teams/:teamId/ability-overview` | 教练训练管理页。 | P1 |
| 私教意向提醒 | `GET /clubs/:clubId/app-clients/:clientId/coach/private-lesson-interests`；`POST .../:interestId/read` | 教练我的页提醒。 | P2 |
| 战术板 PoC 接口 | `GET/PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/tactical-board` | PoC/占位，不阻塞 MVP 主流程。 | P2 |

## 6. 前端当前处理

- 对已存在 BFF：实现统一 request 封装和页面调用结构。
- 对缺口 BFF：页面先用 mock/dev 数据和清晰占位文案，不接 admin API。
- 对写操作：前端统一生成 `Idempotency-Key`，真实提交函数保留但未联调接口会返回“接口待接入”。
- 对登录：实现 `resolve + wx.login + 手机号授权` 页面结构；真实 `wechat-login` 缺口在 P0 补齐前使用 dev mock session。

## 7. 验收前阻塞项

上线前必须补齐：

1. `wechat-login`。
2. 点名写入 app-client BFF。
3. 销课确认 app-client BFF。
4. 比赛录入 app-client BFF 或明确允许小程序调用现有 match API。
5. 训练内容树与训练内容保存 BFF。
6. 生产 capabilities 中的 `client.theme`、`roleEntrypoints`、`calendar.participantStatuses`、`match.eventTypes`、`assessment.views`。

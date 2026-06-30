# 重庆天才小程序逐页产品规格

## 1. 规格口径

本文件细化重庆天才足球俱乐部微信小程序 MVP 页面。基线来自：

- `docs/miniprogram-product-design-cq-talent.md`
- `docs/miniprogram-development-workflow.md`
- `docs/miniprogram-next-work-plan.md`
- `docs/miniprogram-technical-deployment-evaluation.md`
- `docs/multi-app-client-capability.md`

逐页结构图、卡片级交互、详情页推导和开发缺口判定见：

- `docs/miniprogram-page-blueprints-cq-talent.md`

小程序运行时必须先通过 `appId/clientKey -> /app-clients/resolve -> clubId/clientId/capabilities`。页面不得写死 WPS 字段、评测字段、课时规则、训练项目或比赛事件类型。家长端只读；教练端只写训练交付相关数据，不进入后台运营管理。

UI 口径：微信原生标准风格，主色 `#E60012`，按压态 `#C4000F`，浅红背景 `#FFF1F0`。不做营销页，不做复杂视觉稿。

## 1.1 MVP 实现状态

`apps/miniprogram-cq-talent` 已按本规格重做为微信原生小程序 + TypeScript MVP：

- 启动页先 resolve app-client，再按后端/开发身份进入角色首页；生产 UI 不提供家长/教练自选入口。
- 家长端已落 `日程 / 成长 / 我的孩子` 自定义角色 TabBar，活动详情和指标下钻为独立页面。
- 教练端已落 `日程 / 训练管理 / 我的` 自定义角色 TabBar，活动工作台、点名、销课、比赛录入和评测录入为独立页面。
- 已有 BFF 优先读取真实数据；缺失 BFF 以“接口待接入/数据待同步”状态呈现，不拼 admin API。
- 开发完成后的主验收数据源使用会话 `019efcb5-8fe3-7951-a534-502d0abff8ce` 已导入的真实测试数据。

## 2. 全局启动与身份页

### 2.1 启动页

| 项 | 规格 |
| --- | --- |
| 页面目标 | 解析小程序客户端、拉取 capabilities、恢复本地 session，并决定进入家长端或教练端。 |
| 模块结构 | 品牌区、启动状态、错误提示、重试按钮。 |
| 核心字段 | `clubId`、`clientId`、`client.name`、`capabilities.client.roleEntrypoints`、session token、role。 |
| 用户操作 | 重试解析；异常时联系客服。 |
| 空状态 | 无。启动页只展示加载或错误。 |
| 错误状态 | 客户端未配置、网络失败、俱乐部停用、无可用入口。 |
| BFF/API | `GET /app-clients/resolve?appId=...` 或 `?clientKey=...`；必要时 `GET /clubs/:clubId/capabilities?clientId=...`。 |
| 权限边界 | 不允许用户自行选择家长/教练身份。角色必须来自后端登录结果。 |

### 2.2 登录绑定页

| 项 | 规格 |
| --- | --- |
| 页面目标 | 完成微信登录与手机号授权，建立微信身份和俱乐部档案绑定。 |
| 模块结构 | 登录说明、手机号授权按钮、异常说明、联系客服入口。 |
| 核心字段 | `wx.login code`、手机号授权 code、`role`、parent/coach profile、children、session。 |
| 用户操作 | 授权手机号；重新授权；查看异常说明。 |
| 空状态 | 无绑定身份时展示“该手机号尚未登记”。 |
| 错误状态 | 未授权手机号、手机号未登记、匹配多个身份、家长无绑定孩子、档案停用。 |
| BFF/API | 建议 `POST /clubs/:clubId/app-clients/:clientId/wechat-login`。 |
| 权限边界 | 首次匹配失败不得进入业务页面；不得让用户手动选“我是家长/我是教练”。 |

## 3. 家长端页面

### 3.1 家长日程首页

| 项 | 规格 |
| --- | --- |
| 页面目标 | 家长默认首页，查看所有孩子的训练、比赛和其他活动。 |
| 模块结构 | 俱乐部 Banner、家庭日历、选中日期活动列表、活动详情预览、提醒入口。 |
| 核心字段 | 孩子姓名、活动类型、开始/结束时间、场地、队伍/课程来源、参与状态、课后结果状态、提醒未读数。 |
| 用户操作 | 切换日期；点活动；进入提醒中心；下拉刷新。 |
| 空状态 | 当日无活动时展示“今天暂无安排”。无孩子绑定时跳登录异常页。 |
| 错误状态 | 403 无权限；网络失败保留上次日程并提示重试；同步延迟显示最新同步时间。 |
| BFF/API | `GET /clubs/:clubId/app-clients/:clientId/parent/children`；`GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/schedule`；建议新增家庭聚合日程。 |
| 权限边界 | 只显示当前家长绑定孩子活动；不显示请假、申诉、修改考勤入口。 |

### 3.2 日期活动列表

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示某天所有孩子活动，支持多孩子、多活动选择。 |
| 模块结构 | 日期标题、状态筛选、活动卡片列表。 |
| 核心字段 | `eventId`、孩子、类型、时间、地点、队伍、状态、是否有结果。 |
| 用户操作 | 筛选活动状态；进入活动详情。 |
| 空状态 | “该日期暂无活动”。 |
| 错误状态 | 数据过期时提示刷新；活动已取消显示取消状态。 |
| BFF/API | 同家长日程首页。 |
| 权限边界 | 列表不暴露其他学员个人数据。 |

### 3.3 训练详情

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示训练课前安排和课后结果。 |
| 模块结构 | 基本信息、训练内容、关联能力、考勤/扣课结果、课后摘要。 |
| 核心字段 | 时间、场地、队伍/课程、教练、训练项目、能力标签、考勤状态、扣课数量、剩余课时、摘要。 |
| 用户操作 | 查看关联能力；返回日程；如有疑问按提示线下联系。 |
| 空状态 | 未完成训练显示计划信息和“课后结果待更新”。 |
| 错误状态 | 403 非绑定孩子；404 活动不存在；同步延迟显示最新数据时间。 |
| BFF/API | `GET /clubs/:clubId/app-clients/:clientId/events/:eventId`；活动摘要可用 `activity-summaries`。 |
| 权限边界 | 不展示内部教案、其他学员评价、后台备注；家长不能修改考勤和课时。 |

### 3.4 比赛详情

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示赛前信息、赛后比分和孩子相关表现。 |
| 模块结构 | 比赛信息、集合信息、比分、事件列表、孩子表现、关联能力入口。 |
| 核心字段 | 比赛类型、对手、队伍来源、场地、集合时间/地点、比分、进球/助攻/关键事件、出场信息。 |
| 用户操作 | 查看比赛事件；进入相关能力指标。 |
| 空状态 | 未开赛显示赛前信息；赛后未录入显示“比赛结果待更新”。 |
| 错误状态 | 比赛取消、无权限、网络失败。 |
| BFF/API | `GET /clubs/:clubId/app-clients/:clientId/events/:eventId`。 |
| 权限边界 | 比赛整体信息可见；成长模型只展示自己孩子能力画像。 |

### 3.5 其他活动详情

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示讲座、观赛、团建、测评日等非训练比赛活动。 |
| 模块结构 | 活动信息、说明、参与状态、通知。 |
| 核心字段 | 类型、标题、时间、地点、说明、孩子参与状态。 |
| 用户操作 | 查看详情；返回日程。 |
| 空状态 | 说明为空时只展示基础信息。 |
| 错误状态 | 活动取消、无权限、404。 |
| BFF/API | `GET /clubs/:clubId/app-clients/:clientId/events/:eventId`。 |
| 权限边界 | 只显示当前孩子相关活动。 |

### 3.6 提醒中心

| 项 | 规格 |
| --- | --- |
| 页面目标 | 汇总训练/比赛前提醒、变更、取消、课后结果、成长更新、保险课时提醒。 |
| 模块结构 | 未读统计、提醒列表、分类筛选。 |
| 核心字段 | `notificationId`、类型、标题、内容、关联对象、时间、已读状态。 |
| 用户操作 | 点击跳转关联活动/成长/我的孩子；标记已读。 |
| 空状态 | “暂无提醒”。 |
| 错误状态 | 消息能力未开通、网络失败。 |
| BFF/API | 建议 `GET /clubs/:clubId/app-clients/:clientId/parent/notifications`；`POST .../:notificationId/read`。 |
| 权限边界 | 提醒只能触达绑定孩子和当前家长。 |

### 3.7 成长首页

| 项 | 规格 |
| --- | --- |
| 页面目标 | 串联成长足迹、训练历程和能力画像。 |
| 模块结构 | 孩子切换、孩子概要、成长足迹、训练历程、能力雷达图入口。 |
| 核心字段 | 年龄组、在训时长、队伍列表、主教练、里程碑、训练次数、比赛场次、出勤率。 |
| 用户操作 | 切换孩子；点里程碑；点训练项目；进入雷达和指标。 |
| 空状态 | 无成长数据时提示“完成训练或评测后生成”。 |
| 错误状态 | 403、网络失败、样本不足。 |
| BFF/API | `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/growth-summary`；建议补充成长足迹/训练历程聚合字段。 |
| 权限边界 | 不展示排名，不展示其他孩子个人数据。 |

### 3.8 能力雷达图

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示孩子当前能力值与同龄平均。 |
| 模块结构 | 雷达图选择、`RadarCanvas`、指标列表、更新时间说明。 |
| 核心字段 | `metricId`、label、value、peerAverage、maxValue、updatedAt、drilldown。 |
| 用户操作 | 切换雷达图；点击指标下钻。 |
| 空状态 | 指标不足或无有效值时显示空状态，不画误导性 0 分。 |
| 错误状态 | 雷达配置缺失、样本不足、网络失败。 |
| BFF/API | `growth-summary` 返回 `assessment.views/viewNodes/metrics/latest/trends`。 |
| 权限边界 | 只展示 parent-visible 指标；前端不计算公式。 |

### 3.9 指标详情/下钻

| 项 | 规格 |
| --- | --- |
| 页面目标 | 解释一个能力指标的当前值、趋势、来源记录和相关训练。 |
| 模块结构 | 指标概览、趋势、来源记录、相关训练项目、最近课程。 |
| 核心字段 | 当前值、同龄平均、趋势点、source、eventId、assessmentId、相关训练项目。 |
| 用户操作 | 查看来源活动；返回雷达。 |
| 空状态 | 无来源记录显示“暂无可追溯记录”。 |
| 错误状态 | 指标不可见、口径不一致、网络失败。 |
| BFF/API | 建议 `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/ability-metrics/:metricId`。 |
| 权限边界 | 不展示内部公式、权重、其他孩子数据。 |

### 3.10 我的孩子首页/孩子档案

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示孩子基本资料和家庭服务入口。 |
| 模块结构 | 孩子切换、孩子档案、课时保险卡、俱乐部服务入口、账号绑定。 |
| 核心字段 | 姓名、性别、出生日期/年龄、队伍/课程、主教练、入训时间、训练状态、学校/区域。 |
| 用户操作 | 切换孩子；查看课时保险；查看俱乐部信息/教练团队/帮助。 |
| 空状态 | 无绑定孩子则提示联系俱乐部。 |
| 错误状态 | 资料同步失败；字段不可见时隐藏。 |
| BFF/API | `parent/children`；`parent/students/:studentId/home`。 |
| 权限边界 | 不展示身份证、住址、渠道、收费备注、运营备注。 |

### 3.11 课时与保险

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示线下确认后的课时余额和保险状态。 |
| 模块结构 | 课时状态、最近变动、保险状态、同步说明。 |
| 核心字段 | 剩余课时、最近扣课活动、状态、保险到期日、审核状态、保单脱敏、updatedAt、source。 |
| 用户操作 | 查看说明；线下联系俱乐部。 |
| 空状态 | 未同步显示“请以俱乐部确认为准”。 |
| 错误状态 | 同步延迟、未知状态。 |
| BFF/API | `parent/students/:studentId/home` 的 status；建议局部 `status-summary`。 |
| 权限边界 | 不做在线充值、投保、申诉、退款、发票。 |

### 3.12 俱乐部信息、球场分布、青训帮助、教练团队

| 项 | 规格 |
| --- | --- |
| 页面目标 | 家长理解俱乐部服务、场地、帮助内容和教练团队。 |
| 模块结构 | 俱乐部简介、联系方式、球场列表、帮助分类、教练列表。 |
| 核心字段 | Logo、电话、地址、服务时间、venueId、球场地址、导航链接、文章标题、教练姓名/职务。 |
| 用户操作 | 拨打电话；查看地图/导航；阅读帮助；查看教练团队。 |
| 空状态 | 内容未维护时隐藏对应模块。 |
| 错误状态 | 内容下架、网络失败。 |
| BFF/API | 建议内容 BFF：`GET /clubs/:clubId/app-clients/:clientId/content/...`。 |
| 权限边界 | 只读内容；不展示内部人员联系方式，除非 capabilities 允许。 |

### 3.13 私教意向

| 项 | 规格 |
| --- | --- |
| 页面目标 | 家长表达私教兴趣，通知俱乐部或教练跟进。 |
| 模块结构 | 意向说明、孩子选择、期望内容、联系方式确认、提交状态。 |
| 核心字段 | studentId、preferredTopic、remark、contactSnapshot。 |
| 用户操作 | 提交意向；查看已提交状态。 |
| 空状态 | 无孩子不可提交。 |
| 错误状态 | 功能未开通、提交失败、重复提交。 |
| BFF/API | 建议 `POST /clubs/:clubId/app-clients/:clientId/parent/private-lesson-interests`。 |
| 权限边界 | 不是预约、订单、支付或自动派单。 |

### 3.14 账号绑定

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示微信绑定、手机号匹配、最近登录和账号状态。 |
| 模块结构 | 绑定状态、手机号脱敏、最近登录、异常说明。 |
| 核心字段 | bound、maskedPhone、wechatBoundAt、lastLoginAt、role。 |
| 用户操作 | 重新登录；联系客服。 |
| 空状态 | 未绑定引导登录。 |
| 错误状态 | 绑定失效、档案停用。 |
| BFF/API | 建议登录接口返回 profile/account block。 |
| 权限边界 | 不允许切换身份或解绑到其他档案。 |

## 4. 教练端页面

### 4.1 教练日程首页

| 项 | 规格 |
| --- | --- |
| 页面目标 | 教练默认首页，查看今日/本周负责活动和待办。 |
| 模块结构 | 日期切换、今日/周视图、活动卡片、记录完善度、快捷入口。 |
| 核心字段 | eventId、类型、时间、地点、队伍、人数、点名状态、销课状态、比赛录入状态、待完善项。 |
| 用户操作 | 切换日期/周；进入活动；新建活动入口占位。 |
| 空状态 | “今天没有负责活动”。 |
| 错误状态 | 403 无教练权限、网络失败。 |
| BFF/API | `GET /clubs/:clubId/app-clients/:clientId/coach/home?date=...`。 |
| 权限边界 | 只看负责或授权活动；不进入运营后台。 |

### 4.2 活动详情教练版

| 项 | 规格 |
| --- | --- |
| 页面目标 | 聚合单活动的名单、训练/比赛/评测上下文和下一步动作。 |
| 模块结构 | 活动信息、参与名单、workflow flags、训练/比赛状态、操作区。 |
| 核心字段 | event、participants、students、teams、workflow、training、match、assessment config。 |
| 用户操作 | 点名、销课、比赛录入、训练内容、测试录入、战术板占位。 |
| 空状态 | 名单为空提示后台补充参与学员。 |
| 错误状态 | 活动取消、非负责教练、404。 |
| BFF/API | `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench`。 |
| 权限边界 | 操作按钮由 workflow/capabilities 控制。 |

### 4.3 新建/编辑/取消/恢复活动

| 项 | 规格 |
| --- | --- |
| 页面目标 | 给有权限教练发起活动变更。MVP 前端保留入口和状态，不强行落写。 |
| 模块结构 | 表单入口、权限说明、提交占位。 |
| 核心字段 | 活动类型、时间、地点、队伍/学员、教练、取消原因。 |
| 用户操作 | 查看权限；后端未补齐前显示“暂需后台处理”。 |
| 空状态 | 无可编辑权限时隐藏入口。 |
| 错误状态 | 无权限、时间冲突、活动已完成。 |
| BFF/API | 建议 app-client coach event write APIs。 |
| 权限边界 | 不能绕到 admin API。 |

### 4.4 点名

| 项 | 规格 |
| --- | --- |
| 页面目标 | 快速记录活动参与状态。 |
| 模块结构 | 活动固定栏、点名进度、批量参加、学员列表、保存。 |
| 核心字段 | studentId、姓名、队伍、status、remark、updatedAt。 |
| 用户操作 | 批量参加；单人改到课/迟到/缺席/请假/免扣；保存。 |
| 空状态 | 无名单不可保存。 |
| 错误状态 | 活动取消、保存失败、幂等冲突、403。 |
| BFF/API | 当前可读 workbench；写入需 app-client coach attendance API，不能直接拼 admin API。 |
| 权限边界 | 仅负责活动可写；所有写操作带 `Idempotency-Key`。 |

### 4.5 销课确认/纠正

| 项 | 规格 |
| --- | --- |
| 页面目标 | 活动结束后确认课时扣减，15 天内允许纠正。 |
| 模块结构 | 默认全员销课、例外列表、剩余课时预览、确认/纠正记录。 |
| 核心字段 | studentId、shouldConsume、creditDelta、reason、deadline、confirmedBy。 |
| 用户操作 | 点掉不销课学员；填写原因；确认；15 天内纠正。 |
| 空状态 | 无需销课时显示“本活动不扣课时”。 |
| 错误状态 | 超过纠正期、余额状态未知、保存失败。 |
| BFF/API | 建议 `GET/POST/PATCH /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation`。 |
| 权限边界 | 只处理负责活动；不做收费和财务审核。 |

### 4.6 比赛录入

| 项 | 规格 |
| --- | --- |
| 页面目标 | 记录比赛比分、名单、进球/助攻/事件和点评。 |
| 模块结构 | 比赛信息、比分、名单、事件列表、球员点评、提交。 |
| 核心字段 | opponent、score、roster、eventType、studentId、minute、note、visibility。 |
| 用户操作 | 添加事件；编辑比分；提交。 |
| 空状态 | 无名单提示先补充名单。 |
| 错误状态 | 比赛已提交且无编辑接口、事件类型缺失、保存失败。 |
| BFF/API | 读 workbench/event detail；比赛摘要和球员事件写入走 `POST /clubs/:clubId/app-clients/:clientId/coach/matches`。点评和战术板仍为后续表单完善范围。 |
| 权限边界 | 不可给无权限比赛写入；事件类型来自 capabilities。 |

### 4.7 战术板入口

| 项 | 规格 |
| --- | --- |
| 页面目标 | 比赛日工具占位，不阻塞 MVP 主流程。 |
| 模块结构 | 战术板说明、PoC 状态、进入按钮禁用/占位。 |
| 核心字段 | formationId、players、snapshotUpdatedAt。 |
| 用户操作 | MVP 仅查看入口或占位提示。 |
| 空状态 | 未配置阵型模板。 |
| 错误状态 | 无权限、PoC 未完成。 |
| BFF/API | 后续 `GET/PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/tactical-board`。 |
| 权限边界 | 家长不可见。 |

### 4.8 训练管理首页/我的球队

| 项 | 规格 |
| --- | --- |
| 页面目标 | 管理训练内容、测试任务和能力概览。 |
| 模块结构 | 负责球队、待完善项、测试任务、训练内容入口、学员雷达图入口。 |
| 核心字段 | teamId、队伍名称、人数、待完善数量、测试任务数。 |
| 用户操作 | 进入球队详情；进入训练内容选择；进入测试任务。 |
| 空状态 | 无负责球队显示权限说明。 |
| 错误状态 | 403、网络失败。 |
| BFF/API | 建议 coach training management aggregate。MVP 从 coach/home/workbench 展示已有上下文；缺失训练项目树不在前端伪造。 |
| 权限边界 | 只展示负责球队。 |

### 4.9 球队详情

| 项 | 规格 |
| --- | --- |
| 页面目标 | 查看球队学员、近期训练、能力概览和待办。 |
| 模块结构 | 队伍信息、学员列表、近期活动、能力概览、待完善。 |
| 核心字段 | teamId、students、recentEvents、abilityOverview、todoItems。 |
| 用户操作 | 选择学员查看雷达；进入训练内容选择。 |
| 空状态 | 球队无学员。 |
| 错误状态 | 无权限、数据过期。 |
| BFF/API | 建议 `GET /clubs/:clubId/app-clients/:clientId/coach/teams/:teamId`。 |
| 权限边界 | 只读或按 permission context 开启操作。 |

### 4.10 训练内容选择与能力覆盖预览

| 项 | 规格 |
| --- | --- |
| 页面目标 | 教练从训练项目库选择内容，并看到能力覆盖。 |
| 模块结构 | 能力树、训练项目列表、已选项目、覆盖预览、应用到未来课程。 |
| 核心字段 | ability hierarchy、trainingProjectId、duration、linkedMetrics、coveragePreview。 |
| 用户操作 | 选择/移除训练项目；查看覆盖；保存到活动；应用到未来课程。 |
| 空状态 | 训练项目库未配置。 |
| 错误状态 | 保存失败、能力映射缺失。 |
| BFF/API | 建议 `training-project-tree`、`preview`、`PUT training-projects`、`apply-forward` app-client 版本。 |
| 权限边界 | 不做 AI 推荐；不在前端计算能力模型。 |

### 4.11 测试任务与按项目录入测试成绩

| 项 | 规格 |
| --- | --- |
| 页面目标 | 按测试项目顺序录入成绩，支持缺测和自动保存。 |
| 模块结构 | 任务列表、项目维度录入表、进度、缺测标记、保存状态。 |
| 核心字段 | taskId、itemId、studentId、rawValue、unit、missingReason、saveStatus。 |
| 用户操作 | 切换单元格；标记缺测；重试保存。 |
| 空状态 | 无测试任务。 |
| 错误状态 | 弱网保存失败保留本地输入；异常值提示；幂等冲突。 |
| BFF/API | 建议 assessment task APIs；已存在 `coach/assessments/templates/:templateId/form` 和 `coach/assessments`。当前页面支持按模板手动完整提交，单格自动保存/缺测任务模型待完善。 |
| 权限边界 | 只录负责队伍/授权学员。 |

### 4.12 学员雷达图与全队能力概览

| 项 | 规格 |
| --- | --- |
| 页面目标 | 教练查看单个学员或全队能力分布。 |
| 模块结构 | 学员选择、`RadarCanvas`、指标下钻、全队概览列表。 |
| 核心字段 | metricId、student value、team summary、peerAverage、updatedAt。 |
| 用户操作 | 切换学员；点击指标；查看待完善项。 |
| 空状态 | 无评测数据。 |
| 错误状态 | 雷达配置缺失、样本不足。 |
| BFF/API | 建议 `coach/students/:studentId/ability-radars`、`coach/teams/:teamId/ability-overview`。 |
| 权限边界 | 教练可见范围按 permission context，不向家长暴露全队概览。 |

### 4.13 评测录入

| 项 | 规格 |
| --- | --- |
| 页面目标 | 按模板录入周期评测。 |
| 模块结构 | 模板选择、学员选择、输入表、自动计算项只读、提交。 |
| 核心字段 | templateId、templateVersionId、metricId、rawValue、normalizedScore、comment。 |
| 用户操作 | 选择模板；录入原子项；保存草稿；提交。 |
| 空状态 | 无模板或无学员。 |
| 错误状态 | 校验失败、模板版本缺失、提交失败。 |
| BFF/API | `GET /clubs/:clubId/app-clients/:clientId/coach/assessments/templates/:templateId/form`；提交走 `POST /clubs/:clubId/app-clients/:clientId/coach/assessments`。页面已支持学员选择、原子项输入和手动提交；缺测和自动保存模型待 assessment-task BFF。 |
| 权限边界 | computed/composite 指标只读；公式由后端计算。 |

### 4.14 教练我的

| 项 | 规格 |
| --- | --- |
| 页面目标 | 展示教练身份、负责球队、权限范围、私教意向和账号绑定。 |
| 模块结构 | 教练信息、负责球队、权限范围、私教意向提醒、操作帮助、账号绑定、俱乐部联系方式。 |
| 核心字段 | coachProfile、teams、permissions、privateLessonInterests、bindingStatus。 |
| 用户操作 | 查看权限；查看私教意向；查看帮助；重新登录。 |
| 空状态 | 无负责球队、无私教意向。 |
| 错误状态 | 档案停用、权限缺失。 |
| BFF/API | 建议 `GET /clubs/:clubId/app-clients/:clientId/coach/me`、`permission-context`、`private-lesson-interests`。 |
| 权限边界 | 不展示后台运营菜单；私教意向只读通知，不派单。 |

## 5. 通用状态与写入规则

- 加载：列表页用骨架/轻量 loading，避免整页空白。
- 空状态：必须说明“为什么为空”和“下一步找谁处理”。
- 错误状态：403 不静默重试；404 显示数据不存在；网络失败保留当前数据。
- 写操作：点名、销课、比赛录入、训练内容、测试成绩、评测提交都必须携带 `Idempotency-Key`。
- 本地草稿：点名、测试录入、评测录入、比赛录入允许设备本地草稿；提交前必须重新校验活动状态。
- 敏感数据：身份证号、完整手机号、微信号、缴费证明、财务审核链路、WPS raw payload 不进小程序展示。

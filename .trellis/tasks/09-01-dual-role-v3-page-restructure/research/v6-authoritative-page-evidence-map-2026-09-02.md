# Parent / Coach V6 权威页面与证据总表（2026-09-02）

## 使用规则

- 在线 Figma 唯一文件：`zZ6wKyOHKcO4UYXDd9jGwv`。
- 当前视觉基准优先使用 Parent V6 页面 `1609:2` 和 Coach V6 页面 `1609:3` 下的节点；旧 `93:*`、`146x:*`、`15xx:*` 节点只能作为历史来源，不能在新任务中直接写成“当前稿”。
- 运行态视觉证据必须是 WeChatIDE MCP 的真实截图；首屏统一 `375×812`，高于首屏的页面必须另外记录滚动段。
- 真实日期、球队、学员、比分、指标数量、FAQ 数量和按钮可用状态以 API/当前交互为准，不用 Figma 示例数据覆盖。

## Parent V6

| 页面 | 当前 Figma 节点 | 运行路由 | 运行证据 | 状态 |
| --- | --- | --- | --- | --- |
| P1 周日程 | `1610:2` | `/pages/parent/schedule/index` | `wechatide-simulator-screenshot-1788300532300-fka44t.png` | 结构、顶栏、周切换、课程态和 TabBar 已通过 |
| P1 月历展开 | `1610:175` | `/pages/parent/schedule/index` | `wechatide-simulator-screenshot-1788300423382-a7sgt1.png` | 月历展开、月份切换、日期标记和收起提示已通过 |
| P4 成长 | `1610:466` | `/pages/parent/growth/index` | `wechatide-simulator-screenshot-1788300439526-gxmwtz.png` | 结构和真实成长数据已通过 |
| P5 能力雷达 | `1610:626` | `/pages/parent/radar/index` | `wechatide-simulator-screenshot-1788300452686-zgluet.png` | 结构、雷达、历史对比和 TabBar 已通过 |
| P8 发现 | `1610:772` | `/pages/parent/content/index` | `wechatide-simulator-screenshot-1788300465861-hwerat.png` | 结构、Banner、入口和 TabBar 已通过 |
| P7 我的孩子 | `1610:890` | `/pages/parent/child/index` | `wechatide-simulator-screenshot-1788300479038-p15zlg.png` | 结构、双角色入口和 TabBar 已通过 |

## Coach V6

| 页面 | 当前 Figma 节点 | 运行路由 | 运行证据 | 状态 |
| --- | --- | --- | --- | --- |
| C1 全部球队日程 | `1610:1323` | `/pages/coach/schedule/index` | `wechatide-mcp-1788289340223-18528535327476.png` | 结构、全队范围、周/月切换和 TabBar 已通过 |
| C2 训练工作台 | `1610:1462` | `/pages/coach/event/index?id=<trainingActivityId>` | `wechatide-mcp-1788289412136-596941137715.png` | 工作台、点名入口和真实学员数据已通过 |
| C3 变更活动 | `1612:2` | `/pages/coach/event-change/index?id=<activityId>` | `wechatide-simulator-screenshot-1788300685728-ugh4a1.png` | 全屏表单和保存结构已通过 |
| C4 点名 | `1610:1577` | `/pages/coach/attendance/index?id=<activityId>` | `wechatide-viewport-screenshot-1788309532844-7w3k2k.jpg` | 二态点名、姓名展示、保存链路和 TabBar 已通过 |
| C6 比赛记录 | `1610:1692` | `/pages/coach/match/index?id=<matchActivityId>` | `wechatide-mcp-1788289556859-5040518217500.png` | 比分、事件时间线、草稿提示和入口已通过 |
| C6.1 添加比赛事件 | `1894:2` | `/pages/coach/match-event-add/index?eventId=<matchActivityId>` | `wechatide-simulator-screenshot-1788301474505-f0ovb2.png` | Figma V6 已同步 8 类中文事件，结构和真实能力集合已通过 |
| C6.2 比赛草稿提示 | `1924:12` | C6 比赛页内状态 | `wechatide-simulator-screenshot-1788301809274-qa4y6z.png` | 按全屏页内提示卡验收；不把历史遮罩弹窗当作当前产品规则 |
| C7 战术板 | `1610:1778` | `/pages/coach/tactical-board/index?eventId=<matchActivityId>` | `wechatide-mcp-1788289617368-19044968056418.png` | 满屏球场、球员区、阵型和保存区已通过 |
| C8 训练管理 | `1610:1843` | `/pages/coach/training/index` | `wechatide-mcp-1788289672782-31512254753752.png` | 训练球队上下文和“切换”入口已通过 |
| C8.1 选择训练球队 | `1610:1950` | `/pages/coach/team-selector/index` | `wechatide-mcp-1788289777226-25240257441417.png` | 全屏选队、后台分配范围和选中态已通过 |
| C9 队伍详情 | `1900:2` | `/pages/coach/team/index` | 首屏 `wechatide-viewport-screenshot-1788309838648-gm8ggx.jpg` + 滚动段 `wechatide-viewport-screenshot-1788309847807-9rkr32.jpg` | 长页结构和真实队伍数据已通过；Figma 原生高度约 871px |
| C10 三层训练内容选择 | `1615:2` | `/pages/coach/content-select/index?eventId=<trainingActivityId>` | `wechatide-simulator-screenshot-1788271694548-ln435e.png` | 三层内容、直接选择和固定保存栏已通过 |
| C10.1 覆盖预览 | `1903:2` | `/pages/coach/coverage/index?eventId=<trainingActivityId>` | `wechatide-simulator-screenshot-1788300725223-f7mxjb.png` | 覆盖卡、维度进度和确认栏已通过 |
| C11 测评任务 | `1617:2` | `/pages/coach/test-tasks/index` | `goal-c11-20260902.png` | 任务筛选、进度卡和新增入口已通过 |
| C12 测评录入 | `1905:2` | `/pages/coach/test-entry/index?eventId=<activityId>` | `wechatide-simulator-screenshot-1788310600067-2rkifr.png` | 批量项目评分结构、真实学员卡片、指标输入/缺测状态、保存区和 TabBar 已通过；长页首屏之外的内容需按滚动段补证据 |
| C12.1 草稿恢复 | `1907:2` | C12 本机草稿状态 | `wechatide-simulator-screenshot-1788310475651-krco7j.png` | 本机草稿恢复遮罩、继续/退出按钮和 TabBar 已通过；未写入生产数据 |
| C13 学员雷达 | `1909:2` | `/pages/coach/student-radar/index?source=goal` | 首屏 `wechatide-viewport-screenshot-1788309861983-35g9r0.jpg` + 滚动段 `wechatide-viewport-screenshot-1788309871148-8bezqd.jpg` | 结构和真实 8 维数据已通过；Figma 原生高度约 908px |
| C14 能力评估 | `1619:2` | `/pages/coach/team-ability/index` | `wechatide-simulator-screenshot-1788292822261-gy0lsq.png` | 训练球队上下文、全员选择和雷达已通过 |
| C15 指标录入 | `1623:2` | `/pages/coach/assessment-entry/index?templateId=<templateId>` | `wechatide-simulator-screenshot-1788292830287-utsxqr.png` | 固定高度指标面板、当前学员和全员切换已通过 |
| C15.1 评估提交 | `1913:2` | `/pages/coach/assessment-submit/index?...` | `wechatide-simulator-screenshot-1788292837998-suycgg.png` | 成功态、提交摘要和后续按钮已通过 |
| C16 我的 | `1915:2` | `/pages/coach/me/index` | `wechatide-viewport-screenshot-1788309549997-t129qi.jpg` | 教练资料、双角色入口和退出结构已通过 |
| C16.1 权限范围 | `1917:7` | `/pages/coach/permissions/index?source=goal` | `wechatide-simulator-screenshot-1788293000800-q0zpnq.png` | 开关、说明、保存和 TabBar 已通过 |
| C16.2 私教兴趣 | `1919:7` | `/pages/coach/private-interest/index?source=goal` | `wechatide-simulator-screenshot-1788293008604-k3suvm.png` | 时段网格、预约开关和费用说明已通过 |
| C16.3 账号设置 | `1921:7` | `/pages/coach/account/index?source=goal` | `wechatide-simulator-screenshot-1788293016035-75kp0y.png` | 账号设置结构已通过；证据文件名沿用当前记录 |
| C16.4 帮助中心 | `1923:7` | `/pages/coach/help/index?source=goal` | 首屏 `wechatide-viewport-screenshot-1788309885329-6ulfui.jpg` + 滚动段 `wechatide-viewport-screenshot-1788309894474-exe23q.jpg` | 首屏与滚动段均已通过；Figma 原生高度约 924px |

## 当前剩余项

1. 长页面 C9、C13、C16.4 本轮已经补齐首屏/滚动段证据；后续若临时文件被清理，必须按同一路由重新补拍，不能用一张 `375×812` 图替代整页。
2. 旧研究记录中的“当前基准”措辞已统一到 V6；本表作为后续读取入口。
3. 当前工作区存在其他任务和用户在途改动，不能用全量 `git add -A`、回滚或清理来制造干净状态；提交必须按路径限定。

## 验收分层

- “结构/数据通过”：在线 Figma 已读、真实路由可达、MCP 截图为 `375×812`，且没有确定性结构缺陷。
- “业务/API 通过”：接口、真实数据和持久化行为有独立证据。
- “视觉完全通过”：必须同时满足前两项，并完成当前 V6 节点与运行截图的逐模块对照；Figma 示例数据差异不算缺陷，但未决的设计源口径差异不能省略。

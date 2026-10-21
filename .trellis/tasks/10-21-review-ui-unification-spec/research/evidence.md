# 事实、来源与覆盖映射

核对日期：2026-10-21。工作目录为主开发真实路径；HEAD `a2367429`，分支 `feature/ui-batch-1-p01`。此次只写文档，没有SSH或修改运行环境；此前develop恢复证据按独立任务解释。

## 用户审查来源

[六条原始记录](../../archive/2026-10/10-21-review-account-test-data/review-notes.md)保存用户本轮意见及当时调查结果，作为来源快照；本任务PRD是本轮整理后的规格入口，不在旧记录继续新增第二份规格。

| 原条目 | 新要求 | 处理 |
| --- | --- | --- |
| 1 登录品牌/原创照片/协议/后台身份 | UI-01 | 全量保留，补自动角色策略及隐私验收；策略标P |
| 2 日历小、散、色块及展开问题 | UI-02 | 全量保留，保留此前已确认事件名/分类，多机型参数标P |
| 3 腾讯官方控件优先 | UI-03 | 覆盖通用控件，说明官方日期组件与完整业务日程的差距 |
| 4 双端按钮、字体、滑动不统一 | UI-04 | 全页迁移清单与交互状态验收，不局限代表首页 |
| 5 游戏式可选指标与多线半透明雷达 | UI-05 | 保留指标与对比两维；来源、密度和图例方案标P |
| 6 球队管理分散的评估 | UI-06 | 以实证问题为背景，导航及页面重组均标P |

审查账号权限和测试数据恢复已独立完成，未并为新的UI需求；见[恢复验收](../../archive/2026-10/10-21-review-account-test-data/verification.md)。合成数据不足以证明全部业务或多队切换；不得用当前teamOptions数量推断有三支持久化球队。

## 源码事实与限制

以下路径相对仓库根目录；行号对应上述HEAD，实施前以工作区复核为准。

| 事实 | 证据锚点 | 限制 |
| --- | --- | --- |
| 当前已有品牌/字号/间距token，但有两组页面语义 | apps/miniprogram-cq-talent/styles/tokens.wxss:1；app.wxss:1 | token存在不证明所有页一致；旧Figma注释不是当前设计权威 |
| 登录仍有身份选择分支 | apps/miniprogram-cq-talent/pages/login/index.wxml:14；index.ts:131附近 | 必须联动API，不能只删UI |
| 多角色新能力登录activeRole=null | apps/api/src/routes/app-client.routes.ts:988–1005 | 解释当前客户端选择，不认定后台已存在默认角色字段 |
| 日程两端各写月格、周条与交互 | apps/miniprogram-cq-talent/pages/parent/schedule/index.wxml:69；coach/schedule/index.wxml:22 | 现有展开/收起代码存在，用户反馈针对实际可发现性及视觉，不表述成完全没实现 |
| 训练管理的“页签”实际跳页、未带teamId | apps/miniprogram-cq-talent/pages/coach/training/index.ts:96–104；index.wxml:24–27 | 当前截图未复现串队；是上下文连续性风险 |
| 训练与日程选择偏好不同 | pages/coach/training/index.ts:8、64；pages/coach/schedule/index.ts:116–128（均在小程序根目录） | 多队日程和单队工作区本就有不同用途，不能盲目共用同一个值 |
| 自写Canvas固定value/peerAverage | apps/miniprogram-cq-talent/components/radar-canvas/index.ts:164、214 | p5模式及所有调用方须一起盘点 |
| 家长雷达固定首视图并移除peerAverage | apps/miniprogram-cq-talent/pages/parent/radar/index.ts:126、135 | 既有标准/权限边界不得为多线效果而绕开 |

[训练管理截图](../../archive/2026-10/10-21-review-account-test-data/research/coach-management-review/training.png)、[队伍详情截图](../../archive/2026-10/10-21-review-account-test-data/research/coach-management-review/team.png)、[测评任务截图](../../archive/2026-10/10-21-review-account-test-data/research/coach-management-review/tasks.png)：当前原生模拟器ready数据；队伍页由训练页openTeam处理进入。属于本轮管理结构证据，不是新方案效果图或全流程验收。

## 既有产品与平台约束

- [统一产品需求](../../../../docs/current/product-requirements/README.md)：C/P/O/E标记、权限、出勤与课次、成长展示；明确不做具体学员间比较排名。
- [教练既有评审](../../09-22-coach-product-design-review/prd.md)：C01-01/02规定日程多队、未完成任务与日期分离、事件分类与名称；R06/R08及C11保持统一档案、同口径能力比较；R09保持友谊赛归课程。
- [当前Figma权威](../../../../docs/current/figma-source-of-truth.md)：本轮未调取或修改Figma，新规格不宣称旧画板已同步。
- [小程序前端规范](../../../spec/miniprogram/frontend/index.md)、[隐私与能力](../../../spec/miniprogram/frontend/privacy-and-capabilities.md)、[隐私本地说明](../../../../docs/reference/wechat-miniprogram/notes/04-隐私与个人信息合规.md)：产品勾选、官方同意链路、手机号授权与后台声明分开核验。
- [公开展示与结果合同](../../../spec/api/backend/public-presentation-results.md)：家长授权、已确认结果、映射与版本保留。

## 官方组件与图表资料

2026-10-21在线复核官方入口；前一轮同日已读取TDesign接入、主题、样式及68项组件目录，并细读相关组件。当前下载副本 `/private/tmp/fcm-tdesign-reading-20261021` 是临时调查材料，不作为可随仓库交付的依赖；实施应从下列官方来源选择发布版本。

- [腾讯TDesign原生小程序仓库](https://github.com/Tencent/tdesign-miniprogram)：官方推荐npm接入、按组件注册；不复制其整个开发仓库或UniApp实现。
- [Calendar说明和API](https://github.com/Tencent/tdesign-miniprogram/blob/develop/packages/components/calendar/README.md)：单/多/范围选择、format、受控value、use-popup与switch-mode；默认最早日期和渲染框架须按实际版本核验。
- [TDesign官网](https://tdesign.tencent.com/miniprogram/overview)：主题及组件入口。组件优先是用户要求；本spec的布局数值属于项目候选设计，不冒充腾讯强制规范。
- [Apache ECharts小程序手册](https://echarts.apache.org/handbook/zh/how-to/cross-platform/wechat-app/)推荐[echarts-for-weixin](https://github.com/ecomfe/echarts-for-weixin)，说明Canvas2D及自定义构建；ECharts与适配仓库的兼容性仍须实际验证。
- [Radar配置](https://github.com/apache/echarts-doc/blob/master/zh/option/series/radar.md)、[图例概念](https://echarts.apache.org/handbook/zh/concepts/legend/)：支持系列、线/区域样式和图例控制，不能因此推定业务指标和历史数据接口已齐备。

## 已知验证空白

无新方案效果图、无新依赖安装/构建、无新代码测试、无真机/包体/后台隐私验收；没有把静态核对、当前页面截图或本次文档检查当成以上验收。所有具体版本、图表数据缺口和图片模型能力在对应实施批次验证。

## v1.1审计追加事实

- `utils/api.ts:1585`的getCoachAssessmentTasks仅有forceRefresh，没有teamId；服务端GET coach/assessment-tasks在`app-client.routes.ts:2632`。因此单队筛选需同时改函数、查询schema和服务端，不能只补跳转参数。
- `utils/api.ts:1516`的getCoachTeam与`:369`的getCoachTrainingProjectTree已有可选teamId；无需为它们新造一套球队接口。训练页当前按teamName过滤课程（training/index.ts:65），需改稳定ID。
- `pages/coach/team-ability/index.ts`仍读旧全局训练队伍键，selectStudent跳转丢teamId；这是UI-06必须贯通的实际调用点。旧键无账号归属，因此v1.1选择丢弃该界面偏好，不作推断迁移。
- `utils/types.ts:156`的RadarMetricPoint缺少完整版本/结果集元数据，`:230`的GrowthSummary无历史快照；`utils/api.ts:643`附近normalizeGrowth从latest构建雷达并剔除未测指标。v1.1拟增加独立同语义只读合同，不声称现有DTO已经够用。
- 新偏好字段、能力声明与radar-comparison路径均为**本spec拟新增合同**，当前源码未实现；不能拿本文件当接口已上线证据。具体接口/状态要求以design为唯一规格，本文件只记核查依据。

# 架构骨架

## 设计目标

当前阶段先搭建通用型强的业务骨架，而不是绑定某一个前台形态。微信小程序、管理后台、公众号运营、视频内容、AI 分析和支付 CRM 后续都应该接入同一套核心领域模型。

核心判断：

- `Club` 是租户边界，俱乐部内业务事实数据必须带 `clubId`。
- `CalendarEvent` 是业务主轴，训练、比赛、其他活动都先进入统一活动日历。
- `EventParticipant` 是学员实际参与的事实记录，不能只依赖球队成员关系。
- `CatalogScope` 区分系统级目录和俱乐部级目录，训练体系、指标和评测模板可以共享也可以覆盖。
- `PlayerMetricRecord` 是球员数据资产的最小单元，训练观察、比赛事件、周期评测、体测和算法派生都写入同一种记录。
- `DomainEvent` 带 `clubId`，后续 CRM、通知、内容分发、AI 报告可以订阅这些事件，而不侵入核心训练业务。
- 青训运营字段要区分标准字段和俱乐部扩展字段。渠道、区域、学校、学员状态、联系人、保险、收费和课时流水属于高复用运营能力，不能只作为某个客户的表格字段处理。

## 工作区结构

| 路径 | 责任 |
| --- | --- |
| `packages/domain` | 核心领域模型、基础规则、指标派生算法和扩展端口。 |
| `apps/api` | 后端 API 应用壳，目前使用内存数据演示领域模型。 |
| `docs` | 产品范围和架构文档。 |

## 领域分层

### 身份与组织

- `Club`
- `ClubUserMembership`
- `UserAccount`
- `ParentProfile`
- `StudentContact`
- `StudentProfile`
- `StudentOperationalProfile`
- `CoachProfile`
- `Team`
- `TeamMember`

学员可以属于多个球队，球队成员关系记录周期、状态和主队标记。私教和小班课不强行建队，通过活动参与关系组织。

`UserAccount` 是全局登录账号；家长、教练、学员资料是俱乐部内资料。这样同一个手机号或用户未来可以加入多个俱乐部，但各俱乐部的训练、评测和运营数据保持隔离。

学员主档要能覆盖青训俱乐部的基础运营需要，包括证件匹配、入训日期、学员状态、区域、学校、渠道、主联系人、微信、健康备注和负责教练等信息。低频个性字段进入 `CustomFieldDefinition` 和类型化字段值表；高频字段一旦影响筛选、统计、权限或对账，应升级为标准字段。

### 活动日历

- `CalendarEvent`
- `EventParticipant`
- `TrainingLocation`

所有活动先进入统一日历，类型包括：

- 训练
- 比赛
- 其他

训练、比赛和其他活动再通过扩展实体保存专属信息，例如 `TrainingSession`、`Match`、`OtherActivity`。

### 训练交付

- `DevelopmentDimension`
- `TrainingObjective`
- `TrainingDrill`
- `SessionPlan`
- `TrainingSession`
- `SessionDelivery`
- `SessionObservation`

训练练习和课程计划都可以关联能力指标。课后观察也可以直接沉淀为球员指标数据。

### 比赛记录

- `Match`
- `MatchRoster`
- `MatchEvent`
- `MatchPlayerNote`

MVP 只做单场比赛记录，包括出场、比分、进球、助攻和教练点评。完整赛事运营后置。

### 能力指标

- `AbilityMetric`
- `PlayerMetricRecord`
- `DerivedMetricDefinition`
- `MetricLineage`
- `AssessmentTemplate`
- `PlayerAssessment`
- `AssessmentScore`

原始数据和派生数据都使用 `PlayerMetricRecord`。区别在于来源：

- 训练观察：`training_observation`
- 比赛事件：`match_event`
- 周期评测：`assessment`
- 体测：`fitness_test`
- 人工修正：`manual_adjustment`
- 算法派生：`algorithm`

派生指标通过 `MetricLineage` 保留输入记录和算法版本，方便未来追踪和重算。

### 俱乐部差异配置

- `ClubFeatureFlag`
- `ClubPolicy`
- `CustomFieldDefinition`
- `CustomFieldValue`

不同俱乐部的业务差异优先通过功能开关、策略配置、自定义字段和俱乐部级目录承载。详见 [多俱乐部解耦分析](multi-club-decoupling.md)。

数据字段扩展的完整原则见 [数据能力与字段扩展规划](data-capability-plan.md)。

### 基础运营事实

收费、课时、保险和沟通记录可以分阶段开放功能，但数据模型需要前置承接：

- `PaymentEvent`
- `LessonCreditLedger`
- `InsurancePolicy`
- `CommunicationLog`
- `Attachment`

这些对象关联 `clubId`、`studentId`、`eventId` 或 `teamId`，不反向改变训练、比赛和评测事实。

MVP 阶段这些对象主要承接外部同步和线下确认状态。平台不在 MVP 内做线上收费、在线投保、自动财务审核或完整课包消课闭环。

## 运营扩展方式

未来运营能力不要污染训练和比赛核心事实，而是优先通过这些方式扩展：

1. 订阅领域事件，例如活动创建、比赛事件记录、球员指标更新。
2. 增加独立运营模块，例如 CRM、支付、通知、内容分发。
3. 用外键关联核心实体，例如 `studentId`、`eventId`、`teamId`、`metricRecordId`。
4. 将跨俱乐部高复用的运营字段沉淀为标准字段，将个性字段放入类型化自定义字段值表。
5. 保持核心训练数据不被营销数据污染。

后续模块示例：

| 后续模块 | 推荐接入点 |
| --- | --- |
| 微信小程序 | 调用 API，展示家长日程、比赛摘要、成长数据。 |
| 管理后台 | 调用 API，管理球队、课程、比赛和评测模板。 |
| CRM | 订阅报名、试听、活动参与等事件。 |
| 支付课包 | 关联活动参与和课程交付，但不反向控制训练记录。 |
| AI 报告 | 读取训练、比赛、指标记录，生成教练确认后的报告。 |
| AI 视频剪辑 | 关联 `CalendarEvent`、`MatchEvent` 和球员档案。 |
| 媒体分发 | 从训练、比赛和球员亮点中挑选可发布素材。 |
| 场地管理 | 关联活动地点和训练体验反馈。 |

## 当前 API 壳

当前 `apps/api` 只提供内存数据接口，用来验证领域骨架：

- `GET /health`
- `GET /clubs`
- `GET /clubs/:clubId/config`
- `GET /clubs/:clubId/calendar/events`
- `GET /clubs/:clubId/students/:studentId/timeline`
- `GET /clubs/:clubId/catalog/ability-metrics`
- `GET /clubs/:clubId/students/:studentId/metrics`
- `POST /clubs/:clubId/students/:studentId/derived-metrics/attacking-contribution`

正式开发数据库前，先用这些接口验证领域模型和前端信息结构。

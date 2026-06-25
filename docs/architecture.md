# 架构骨架

## 设计目标

当前阶段先搭建通用型强的业务骨架，而不是绑定某一个前台形态。微信小程序、管理后台、公众号运营、视频内容、AI 分析和支付 CRM 后续都应该接入同一套核心领域模型。

核心判断：

- `CalendarEvent` 是业务主轴，训练、比赛、其他活动都先进入统一活动日历。
- `EventParticipant` 是学员实际参与的事实记录，不能只依赖球队成员关系。
- `PlayerMetricRecord` 是球员数据资产的最小单元，训练观察、比赛事件、周期评测、体测和算法派生都写入同一种记录。
- `DomainEvent` 是未来运营扩展的接口，后续 CRM、通知、内容分发、AI 报告可以订阅这些事件，而不侵入核心训练业务。

## 工作区结构

| 路径 | 责任 |
| --- | --- |
| `packages/domain` | 核心领域模型、基础规则、指标派生算法和扩展端口。 |
| `apps/api` | 后端 API 应用壳，目前使用内存数据演示领域模型。 |
| `docs` | 产品范围和架构文档。 |

## 领域分层

### 身份与组织

- `UserAccount`
- `ParentProfile`
- `StudentProfile`
- `CoachProfile`
- `Team`
- `TeamMember`

学员可以属于多个球队，球队成员关系记录周期、状态和主队标记。私教和小班课不强行建队，通过活动参与关系组织。

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

## 运营扩展方式

未来运营能力不要直接改核心表，而是优先通过这些方式扩展：

1. 订阅领域事件，例如活动创建、比赛事件记录、球员指标更新。
2. 增加独立运营模块，例如 CRM、支付、通知、内容分发。
3. 用外键关联核心实体，例如 `studentId`、`eventId`、`teamId`、`metricRecordId`。
4. 保持核心训练数据不被营销数据污染。

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
- `GET /calendar/events`
- `GET /students/:studentId/timeline`
- `GET /catalog/ability-metrics`
- `GET /students/:studentId/metrics`
- `POST /students/:studentId/derived-metrics/attacking-contribution`

正式开发数据库前，先用这些接口验证领域模型和前端信息结构。

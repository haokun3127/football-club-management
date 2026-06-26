# 功能设计与技术开发计划

## 总控原则

当前线程作为总控，不直接承担全部功能实现。后续开发窗口控制在 3 个，避免上下文断裂和大量冲突。

开发模型：`gpt-5.4-mini`，推理强度：`medium`。

暂不开发微信小程序前台。第一阶段只做后端、领域服务、数据模型、API 契约和测试。

## 第一阶段目标

把当前“领域骨架 + 内存 API”推进到可持续开发的后端 MVP 基座：

1. 建立真实持久化和迁移机制。
2. 建立多俱乐部权限边界。
3. 建立核心业务服务层。
4. 建立稳定 API 契约。
5. 为后续管理后台和小程序保留清晰接口。

## 功能分层

### 1. 平台基础层

职责：

- 数据库 schema
- migration
- repository
- club scope 查询保护
- auth context
- request validation
- OpenAPI 输出

优先对象：

- `Club`
- `ClubUserMembership`
- `UserAccount`
- `ParentProfile`
- `StudentProfile`
- `CoachProfile`
- `Team`
- `TeamMember`

### 2. 活动与训练层

职责：

- 统一活动日历
- 学员参与记录
- 教练日程冲突检查
- 学员日程冲突检查
- 球队训练、小班课、私教课
- 课程计划与训练练习
- 课后完成记录
- 学员训练观察

优先对象：

- `CalendarEvent`
- `EventParticipant`
- `TrainingSession`
- `SessionPlan`
- `TrainingDrill`
- `SessionDelivery`
- `SessionObservation`

### 3. 比赛与评测数据层

职责：

- 单场比赛记录
- 比赛名单
- 比分
- 进球、助攻等比赛事件
- 球员原子指标记录
- 评测模板
- 周期评测
- 派生指标
- 指标血缘

优先对象：

- `Match`
- `MatchRoster`
- `MatchEvent`
- `PlayerMetricRecord`
- `AssessmentTemplate`
- `PlayerAssessment`
- `AssessmentScore`
- `DerivedMetricDefinition`
- `MetricLineage`

## 开发窗口安排

### 窗口 A：平台基础与持久化

目标：把内存 API 升级为可持续后端基础。

任务：

- 选择并配置数据库方案。
- 建立 schema 和 migrations。
- 实现基础 repository。
- 实现 club-scoped 查询保护。
- 设计 auth context 和 membership resolver。
- 为 API 加请求/响应 schema。
- 输出基础 OpenAPI。
- 保留当前重庆天才种子配置能力。

验收：

- `pnpm check` 和 `pnpm build` 通过。
- 数据库迁移可重复执行。
- 至少覆盖 Club、User、Membership、Student、Coach、Team。
- 任意业务查询必须带 `clubId` 或从 auth context 推导。

### 窗口 B：活动、球队与训练服务

目标：实现日程、参与、训练课程和课后记录的应用服务。

任务：

- 实现创建球队、加入球队、查询球队成员。
- 实现创建训练/比赛/其他活动。
- 实现参与名单管理。
- 实现教练和学员时间冲突检查。
- 实现课程计划、训练练习和训练目标查询。
- 实现训练完成记录和学员观察记录。
- 设计管理后台可用的 API，不做前端。

验收：

- 可以创建球队训练、小班课、私教课。
- 一个学员可在多个球队参与不同活动。
- 训练活动能关联课程计划和能力指标。
- 课后观察能落到球员指标数据来源。

### 窗口 C：比赛、评测与指标服务

目标：实现比赛数据和球员能力评测闭环。

任务：

- 实现比赛活动扩展信息。
- 实现比赛名单、比分、出场记录。
- 实现进球、助攻等比赛事件记录。
- 比赛事件自动生成或关联 `PlayerMetricRecord`。
- 实现评测模板、评测录入和评测历史。
- 实现派生指标计算服务和 lineage 持久化接口。
- 补充数据隔离和算法输入测试。

验收：

- 教练可记录单场比赛主要数据。
- 球员档案能查询训练、比赛、评测来源的指标记录。
- 派生指标只使用同一俱乐部数据。
- 算法结果保留输入记录和版本。

## 总控工作流

1. 每个窗口在独立 worktree 中开发，避免互相覆盖。
2. 每个窗口只提交本窗口范围内的代码和文档。
3. 当前总控线程负责审查结果、合并顺序和后续拆分。
4. 如果窗口之间出现模型冲突，以窗口 A 的持久化和 API 契约为优先。
5. 不启动微信小程序，直到后端 API 契约稳定。

## 合并顺序

1. 窗口 A
2. 窗口 B
3. 窗口 C

原因：

- B 和 C 都依赖 A 的数据库、仓储和 schema 约定。
- C 依赖 B 中活动和参与关系的稳定接口。
- 小程序前台应在 A/B/C 主要 API 稳定后再进入。

## 暂不做

- 微信小程序页面。
- 管理后台页面。
- 支付课包。
- CRM 招生。
- AI 视频剪辑。
- 公众号/抖音/视频号/小红书内容发布。
- 完整赛事运营。
- 场地管理。

# 多俱乐部解耦分析

## 目标

平台要能服务不同青训俱乐部。不同俱乐部可能在课程体系、评测标准、比赛记录颗粒度、私教规则、家长可见内容和未来运营流程上存在差异，但底层训练、比赛、活动、球员数据和指标计算逻辑应该保持统一。

当前骨架采用的原则是：

- 业务事实数据必须带俱乐部边界。
- 通用目录数据可以系统级共享。
- 俱乐部差异通过配置、策略、自定义字段、目录覆盖和后续扩展模块实现。
- 现在不单独拆模块的地方，也要避免把某个俱乐部的习惯写死进核心模型。

## 已经前置解耦的地方

### 1. 俱乐部边界

新增核心对象：

- `Club`
- `ClubUserMembership`
- `ClubScoped`

除全局登录账号 `UserAccount` 外，俱乐部内的业务资料和业务事实都带 `clubId`，例如：

- 家长、学员、教练资料
- 球队与球队成员关系
- 活动日历与参与记录
- 训练、比赛、其他活动
- 球员指标记录与指标血缘

这样未来可以在数据库层、权限层、API 层和后台查询层统一按 `clubId` 隔离。

### 2. 系统目录与俱乐部目录

新增目录作用域：

- `CatalogScope`
- `CatalogScoped`

训练维度、训练目标、能力指标、训练练习、课程计划、评测模板、派生指标定义都可以是：

- 系统级：所有俱乐部可见
- 俱乐部级：仅某个俱乐部可见
- 俱乐部覆盖：基于系统默认项做局部调整

这样不同俱乐部可以共用基础足球训练体系，也可以逐步形成自己的指标、课程和评测模板。

### 3. 差异化配置

新增可配置对象：

- `ClubFeatureFlag`
- `ClubPolicy`
- `CustomFieldDefinition`

可以先不做复杂规则引擎，但先保留这些变化点：

| 变化点 | 推荐承载方式 |
| --- | --- |
| 是否启用比赛记录 | `ClubFeatureFlag` |
| 是否启用私教课 | `ClubFeatureFlag` |
| 比赛事件类型 | `ClubPolicy` |
| 考勤状态 | `ClubPolicy` |
| 家长可见范围 | `ClubPolicy` |
| 学员额外资料字段 | `CustomFieldDefinition` |
| 俱乐部自己的评测模板 | `CatalogScope: club` |
| 俱乐部自己的派生算法 | `CatalogScope: club` |

### 4. API 入口

业务 API 已经改成俱乐部作用域路径：

- `/clubs/:clubId/config`
- `/clubs/:clubId/calendar/events`
- `/clubs/:clubId/students/:studentId/timeline`
- `/clubs/:clubId/catalog/ability-metrics`
- `/clubs/:clubId/students/:studentId/metrics`
- `/clubs/:clubId/students/:studentId/derived-metrics/attacking-contribution`

后续管理后台、小程序、公众号运营都应该从俱乐部上下文进入，不要直接访问无俱乐部边界的业务数据。

### 5. 指标计算隔离

派生指标计算现在要求传入 `clubId`，并且只使用同一俱乐部下的 `PlayerMetricRecord`。

这避免了未来多个俱乐部之间出现球员数据串读、算法输入污染和报告归属错误。

## 现在不拆，但已经预留的地方

### 1. 权限系统

当前只有类型层面的 `ClubUserMembership`，没有完整 RBAC/ABAC。

未来可以基于：

- `clubId`
- `userId`
- `roles`
- 资源类型
- 资源归属

做权限判断。现在代码要避免把“管理员/教练/家长能看什么”写死在领域模型里。

### 2. 数据库存储

当前 API 使用内存数据。未来上数据库时建议：

- 所有俱乐部业务表都有 `club_id`
- 高频查询索引包含 `club_id`
- 目录表使用 `scope` 和 `club_id`
- 派生指标记录保留 `club_id` 和 lineage

第一阶段可以单库多租户；如果后续出现大客户或合规要求，再考虑按俱乐部分库。

### 3. 规则引擎

当前 `ClubPolicy` 只是配置容器，不直接执行规则。

未来可以增加 `PolicyResolver` 或规则执行模块，把这些差异移出核心业务：

- 私教课是否允许跨队
- 请假是否需要审批
- 比赛哪些事件可记录
- 评测是否必须按周期完成
- 家长是否能看教练原始评语

### 4. 运营模块

CRM、支付、内容分发、通知、媒体素材、场地管理都不应该改核心训练模型。

推荐方式：

1. 订阅带 `clubId` 的 `DomainEvent`
2. 在自己的模块里保存运营状态
3. 用 `clubId`、`studentId`、`eventId`、`metricRecordId` 关联核心数据

### 5. 算法和 AI

当前只实现了简单派生指标函数。未来更复杂的算法应作为新的派生指标定义接入：

- 不覆盖原始数据
- 不混用其他俱乐部数据
- 保留算法名称、版本、输入记录和计算周期
- 输出仍然写入标准 `PlayerMetricRecord`

## 需要避免的耦合

- 不要在核心模型里写死某个俱乐部的课程命名、年龄段、评测表或比赛规则。
- 不要让 API 出现无 `clubId` 的业务数据查询入口。
- 不要让支付、招生、营销状态反向控制训练和比赛事实记录。
- 不要为了某个俱乐部需求复制一套训练/比赛模型。
- 不要让派生算法直接读取全局指标记录，必须通过俱乐部上下文过滤。

## 后续可拆模块

| 模块 | 拆分时机 | 保留接口 |
| --- | --- | --- |
| 权限与账号 | 多俱乐部角色复杂后 | `ClubUserMembership` |
| 课程目录管理 | 多俱乐部课程差异明显后 | `CatalogScope` |
| 规则引擎 | 策略配置开始影响流程后 | `ClubPolicy` |
| 自定义字段值 | 不同俱乐部字段变多后 | `CustomFieldDefinition` |
| 支付课包 | 开始收费和消课后 | `CalendarEvent`、`EventParticipant` |
| CRM 招生 | 开始线索转化后 | `DomainEvent`、`clubId` |
| AI 报告 | 指标和训练记录稳定后 | `PlayerMetricRecord`、`MetricLineage` |
| 媒体分发 | 开始运营内容矩阵后 | `CalendarEvent`、`MatchEvent` |

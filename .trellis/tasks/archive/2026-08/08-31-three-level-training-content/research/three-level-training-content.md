# 三层指标训练内容规划研究记录

## 研究范围

本记录只覆盖教练端训练内容目录和训练活动选内容流程，不扩展到完整 Excel 导入器、评测录入页或家长端雷达图。

## 已确认事实

1. `docs/archive/2026-06-discovery/assessment-system-analysis.md` 明确把评分表视为指标图谱：一级核心能力、二级子项、三级子项是展示层；原子指标、派生指标、依赖边和视图节点才是可复用底层模型。
2. `packages/domain/src/metrics.ts` 已有 `AbilityMetric`、`MetricGraphVersion`、`MetricDependency`、`MetricView`、`MetricViewNode` 和派生计算模型。`packages/domain/src/training.ts` 已有 `DevelopmentDimension`、`TrainingObjective`、`TrainingDrill`。
3. `apps/api/src/seed/cq-talent-assessment-model.ts` 已生成完整评分视图 `metric-view-cq-talent-elite-full-graph`：核心能力节点没有父节点，二级节点挂在核心节点下，三级原子指标节点挂在二级节点下；训练动作通过 `TrainingDrill.metricIds` 关联三级指标。
4. `GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree` 当前只返回 `dimensions → objectives → projects`，并保留一个扁平 `projects` 数组。小程序 `normalizeTrainingProjectTree` 只消费这两层结构，因此运行时看不到 `MetricViewNode` 的三级目录。
5. `apps/miniprogram-cq-talent/pages/coach/content-select` 当前是搜索框、横向分类胶囊、纵向训练项目卡片和底部保存栏。它已有稳定项目 ID 去重、筛选、选择、保存后 API 读回和 WXML 方法禁用检查，可继续复用。
6. 参考图的可见结构是：顶部搜索框、右侧组合标题和新增按钮；左侧一级/二级导航；右侧按当前指标分组的两列动作卡片；卡片有动作图/图标、难度、剂量、名称和动作要点入口；底部固定“临时超级组 / 完成”。
7. 当前 `TrainingDrill` 没有训练剂量或图片字段；`durationMinutes` 是总时长，不应直接渲染为“次数”。项目资源中已有稳定 SVG 图标，可作为没有真实动作图片时的可验证占位。
8. 训练动作当前没有独立数据库表，数据库已持久化的是训练活动关联的 `session_plans` 和 `training_sessions`。因此本批的目录结构字段应先扩展领域/API契约和种子目录，不伪造一张不存在的训练动作后台编辑表；若后续要求后台编辑训练库，再单独增加迁移和仓储任务。
9. 现有教练球队选择页只按队名保存 `coach-selected-team`，而训练首页、球队详情和训练目录读取没有统一的 `teamId` 参数。多球队支持需要新增稳定球队选项和兼容旧队名缓存的解析，不应以队名作为跨请求主键。

## 设计决策

- 三层展示树由完整 `MetricViewNode` 视图投影生成，不在小程序端根据名称或数组位置猜父子关系。
- 训练动作的三级关联使用已有 `TrainingDrill.metricIds`；同一动作可以出现在多个三级指标下，但保存时只保留一个稳定项目 ID。
- 新增可选 `TrainingDrill.quantityLabel`。`durationMinutes` 和 `quantityLabel` 分别表示预计时长和训练剂量。
- API 在现有训练目录响应中追加 `contentTree`、`team`、`teamOptions` 等字段，并继续返回 `dimensions`、`projects`，以保持旧页面和保存接口兼容。
- 目录为俱乐部级系统/俱乐部资源；`teamId` 用于验证教练可访问的球队并限定训练首页、训练活动和训练管理上下文。没有球队专属训练库时，不复制同一套目录制造假差异。
- 图片不是本任务的事实数据源。API 返回可选 `imageSrc` 只有在存在真实本地资源时才使用；否则 TypeScript view model 按稳定项目顺序预计算现有 SVG 图标，并在文案上保持“动作图标”语义。

## 风险与验证重点

- 视图节点可能缺父节点、重复节点或指向不存在指标；投影函数必须过滤无效节点、稳定排序，并用测试覆盖空树和重复动作。
- 扩展 API 响应时不能让旧的 `normalizeTrainingProjectTree` 丢失 `contentTree`；必须增加客户端 normalizer 测试。
- 训练内容选择页的固定底栏与角色 TabBar 叠加，必须按现有安全区计算底部留白，并在 375×812 运行截图中验证。
- 生产 API 使用构建后的 `dist`；任何 API 契约改动都必须 build、重启本地 API，并用真实路由读回，不得仅运行内存单测。

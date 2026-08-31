# 三层指标训练内容规划设计

## 目标与边界

训练内容选择页要让教练以评分体系的三层能力结构找到训练动作：一级核心能力、二级子项、三级子项。选择过程仍服务于真实训练活动，保存仍写入现有训练项目/训练计划边界。

本设计不把评分表做成固定的数据库三层树，也不在本批实现 Excel 导入、复杂公式 DSL 或评测录入。三层是 `MetricView` 的展示视图；指标之间的复用和派生关系仍由 `MetricDependency`/派生定义负责。

## 方案对比

### 方案 A：在现有 `dimensions → objectives → projects` 上硬加一层

改动少，但三级指标只能依赖当前维度和名称推导；同一指标跨视图复用、视图排序和缺失节点处理都会变得脆弱。不采用。

### 方案 B：新增完全独立的训练目录树模型

前端可以快速对齐截图，但会复制 `AbilityMetric` 和 `MetricViewNode` 的层级关系，评分体系变更时训练目录和评测目录容易分叉。不采用。

### 方案 C：以 `MetricViewNode` 为展示源，投影出训练目录，同时保留旧契约（推荐）

API 从完整评分视图构造三层节点，三级节点按 `TrainingDrill.metricIds` 关联动作；响应追加新字段而不删除旧字段。这样既能复原参考图，又保留已有保存接口和旧消费者，后续可替换不同指标视图而不重写页面。

## 数据模型与 API 契约

### 训练动作

在 `TrainingDrill` 增加：

```ts
quantityLabel?: string;
```

它只承载可直接展示的中文剂量，例如“每组 15 次”“每组 30 秒”。`durationMinutes` 继续表示预计总时长。当前训练动作没有独立持久化表，因此该字段首先进入领域类型、种子目录和 API 摘要；训练库后台编辑另立任务。

### 三层目录响应

`GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree` 继续返回旧字段，并追加：

```ts
type TrainingContentDrill = {
  id: string;
  name: string;
  metricIds: string[];
  metricNames: string[];
  durationMinutes: number;
  quantityLabel?: string;
  difficulty: "introductory" | "standard" | "advanced";
  coachingPoints: string[];
  imageSrc?: string;
};

type TrainingContentMetricNode = {
  id: string;                 // MetricViewNode.id，稳定的展示节点 ID
  metricId: string;           // AbilityMetric.id
  label: string;
  level: 1 | 2 | 3;
  children: TrainingContentMetricNode[];
  drills: TrainingContentDrill[];
};

type TrainingContentTree = {
  viewId: string;
  viewName: string;
  graphVersionId?: string;
  nodes: TrainingContentMetricNode[];
};
```

路由响应还可以追加当前球队上下文：

```ts
team: { id: string; name: string; season?: string } | null;
teamOptions: Array<{ id: string; name: string; season?: string }>;
contentTree: TrainingContentTree;
```

`teamId` 作为可选 query 参数。未传时沿用教练可访问范围的首个球队；传入不可访问或不属于该俱乐部的球队时返回结构化 `403/404`，不降级到另一支球队的数据。没有球队专属目录时，`contentTree` 可以相同，但 `team` 和后续活动数据必须不同。

### 目录投影边界

新增纯函数模块 `apps/api/src/application/training-content-catalog.ts`，输入已按俱乐部过滤的维度、目标、动作、指标、视图和视图节点，输出 `TrainingContentTree`。函数职责：

1. 选择 active 的完整训练/评分视图（当前种子为 `metric-view-cq-talent-elite-full-graph`，未来可由调用方传入视图 ID）。
2. 根据 `parentViewNodeId` 建立节点关系，按 `sortOrder` 后按 ID 稳定排序。
3. 仅把三级节点的 `metricId` 用于动作关联；动作的 `metricIds` 中命中多个三级节点时，在对应节点显示，但响应中的动作 ID保持稳定。
4. 为无动作的三级节点返回空 `drills`，不把其他节点的动作复制进来。
5. 丢弃缺失指标、缺失父节点、超过三级的无效视图节点，并让测试明确记录这种保护行为。

`summarizeTrainingDrill` 统一输出动作摘要，避免旧目录和新目录分别解析剂量、难度和动作要点。

## 小程序页面设计

### 页面状态

`TrainingProjectTree` 扩展为同时保留 `groups/projects` 和 `contentTree/team/teamOptions`。normalizer 对缺少 `contentTree` 的旧 API 响应构造一个安全的空树，而不是凭旧二维列表假装三级指标。

`content-select` 的 TypeScript view model 预计算：

- 顶部当前组合标题、搜索文本和新增按钮状态。
- 一级核心能力导航项。
- 当前一级下的二级子项导航项。
- 当前二级下按三级子项分组的动作卡片。
- 每张卡片的稳定图标路径、难度文案、剂量文案、时长文案、动作要点预览、选择样式。
- 搜索后的可见分组、选择数量和总预计时长。

WXML 只读取这些字段；不在模板中调用数组方法或根据英文枚举做展示转换。

### 交互

1. 页面加载读取当前训练活动工作台和带 `teamId` 的训练目录。
2. 点击一级能力时切换二级导航并默认选中该一级的第一个二级项。
3. 点击二级子项时展示该二级下的所有三级分组及动作卡片。
4. 搜索时在当前一级范围内匹配动作名、动作要点、三级名称和关联指标名称；清空搜索恢复当前层级。
5. 点击动作卡片切换选择；动作要点入口先用全屏只读动作详情/内联展开的可复用页面边界，不在本批引入弹窗。
6. 点击底部完成，调用现有 `PUT .../training-projects`，保存成功后再读工作台核对稳定 ID 集合，失败则保留当前选择并显示安全错误。
7. 若旧 API 没有三层目录，页面显示明确的目录不可用状态，不回退为视觉上错误的两层假树。

### 视觉约束

- 复用在线 Figma 当前文件的训练内容选择画板；页面结构按照用户提供截图实现，但最终尺寸、颜色、间距以在线节点为准。
- 顶部返回/关闭、搜索、加号、动作图标全部使用现有 SVG 或真实本地资源；不使用 Unicode 箭头/勾号替代图标。
- 页面宽度按 375×812 验收：左侧导航与右侧两列卡片不能挤压选择控件；底部操作栏预留角色 TabBar 和安全区。

## 球队上下文

新增一个共享的教练球队选择解析边界，优先读取稳定 `teamId`，兼容旧的队名缓存一次性匹配并迁移。训练首页、球队页、训练目录页调用相同的 query/storage 规则。后端提供 `teamOptions` 的 ID/名称对，训练首页和训练目录都把 `teamId` 传给 API；API 先验证访问范围，再计算事件和统计。

本批不把俱乐部级训练动作复制成多份球队数据。球队差异体现在活动、成员、统计和可访问上下文；未来若后台支持球队私有训练库，再扩展 `TrainingDrill` 的 catalog scope。

## 错误处理与兼容

- 认证/球队访问失败沿用现有 `requireClubRole`、`collectCoachScope` 和结构化 `sendError`。
- 目录投影遇到脏视图节点时忽略该节点并保留其他可用节点；若所有节点无效，返回空树和 pending 提示。
- 保存接口继续接受 `projectIds`，不把三级节点 ID误当成训练动作 ID。
- API schema/OpenAPI 保持 flexible response 的现有形式，但 route 测试必须断言新字段的实际结构。

## 验证与回滚

每个批次都要运行对应定向 Vitest、TypeScript、WXML/WXSS 编译和 `git diff --check`。API 批次还要 build、重启本地 API，并用真实 coach session 读回训练目录；小程序批次在微信开发者工具中重新编译后，取得真实 375×812 截图。回滚点按批次提交，不跨批次回滚或触碰其他脏文件。

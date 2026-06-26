# 学员能力评估体系分析

## 样本结论

`天才精英队评分表.xlsx` 不是单纯的成绩表，而是一套评测体系大纲。它在表格中呈现为三层结构，但产品模型不能被设计成固定三层树。真实需求应该是指标图谱：任意指标可以引用多个指标，通过公式、权重、标准化规则生成另一个指标；生成的结果又可以继续被其他评估体系引用。

它同时包含：

- 一种展示层级：一级核心能力、二级子项、三级子项。
- 评分数据：三级子项使用 0-100 分，二级和一级通过公式汇总。
- 测试项目：部分指标需要通过具体测试获取，例如 30 米冲刺、平板支撑、颠球次数、射门成功率。
- 推荐训练项目：每个三级子项都能反向指向训练内容。
- 模板版本：表名中带日期，说明后续可能会迭代版本。

样本展示结构：

| 层级 | 数量 | 示例 |
| --- | --- | --- |
| 一级核心能力 | 8 | 运控球、1v1、传接球、射门、小组配合、整体战术、体能、精神 |
| 二级子项 | 28 | 带球、1v1 防守、传球、动态射门、速度、心理素质 |
| 三级子项 | 62 | 直线带球、变向带球、短传、30 米冲刺、平板支撑时间 |

当前公式显示：

- 三级子项 `F` 列大多是 0-100 标准分。
- 二级子项 `D` 列按三级子项加权后折算为该二级子项满分。
- 一级能力 `B` 列按二级子项求和。
- 最终得分为所有一级能力求和。

需要注意：按当前公式，各一级能力满分相加为 90 分，不是 100 分。若业务目标是百分制，需要增加总分归一化规则或调整输出指标权重。

## 现有骨架适配度

现有骨架方向是正确的：

- `AbilityMetric` 可以承载单个能力指标。
- `PlayerMetricRecord` 可以承载球员指标记录。
- `AssessmentTemplate` 可以表示一个评测模板。
- `PlayerAssessment` 和 `AssessmentScore` 可以保存一次评测。
- `DerivedMetricDefinition` 和 `MetricLineage` 可以表达简单派生指标和血缘。
- `TrainingDrill` 可以承接推荐训练项目。

但目前还不能完整承接这份评分表。

| 能力需求 | 当前是否满足 | 缺口 |
| --- | --- | --- |
| 无限层指标图谱 | 部分满足 | `AbilityMetric` 只有 `dimensionId`，缺少指标依赖、跨体系引用、图版本和视图排序 |
| 三级子项 0-100 打分 | 不完全满足 | `AssessmentScore` 固定为 1-5 分，无法保存 0-100 标准分 |
| 测试原始值 | 不满足 | 缺少测试项目、采集协议、原始成绩和标准化规则 |
| 任意指标加权计算 | 部分满足 | `DerivedMetricDefinition` 支持简单加权，但不支持一个结果继续作为其他公式输入，也缺少满分、归一化和图谱血缘 |
| 推荐训练项目 | 部分满足 | 训练练习存在，但缺少指标到训练建议的映射强度和适用条件 |
| 模板版本 | 部分满足 | 定义有 `version` 的派生指标，但评测模板和指标本身缺少明确版本策略 |
| 评分表导入 | 不满足 | 缺少从 Excel 解析为指标图谱、公式边、测试项目和训练建议的导入器 |

## 核心优化方向

### 1. 指标要从平面列表升级为指标图谱

当前 `AbilityMetric` 更像“叶子指标”。这张表看起来是父子结构，但更稳妥的抽象是有向无环图：

- 原子指标：可以直接测试、观察或录入，例如 30 米冲刺、定点射门成功率、正面突破评分。
- 计算指标：由其他指标通过公式生成，例如速度、带球、运控球、最终综合分。
- 视图分组：为了某个模板或报告展示，把指标组织成一级、二级、三级或任意层级。

同一个指标可以同时出现在多个体系中。例如“直线速度”既可以进入体能评估，也可以进入边锋潜力模型；“1v1 正面突破”既可以进入个人技术评分，也可以进入比赛贡献模型。

建议新增或扩展：

- `AbilityDimension`：技术、战术、体能、心理等大类，只作为分类标签，不作为唯一层级。
- `AbilityMetric`：所有可记录或可计算的指标节点。
- `MetricDependency`：指标之间的有向依赖边，表达 A、B、C 通过公式生成 D。
- `MetricGraphVersion`：指标图谱版本，保证历史评测可追溯。
- `MetricView` / `MetricViewNode`：某个评测模板、报告或家长端视图中的展示结构。
- `metricKind`：atomic、computed、composite、view_only。
- `sortOrder`：稳定展示顺序。
- `code`：稳定编码，例如 `ball_control.dribbling.change_direction`。
- `isAtomic`：是否允许直接采集。
- `maxScore`：节点满分。
- `scoreScaleId`：评分量表。
- `version`、`status`：版本和启停。

树可以作为 `MetricView` 的展示结果存在，但不能作为底层数据结构。底层必须允许指标被多处引用、组合、复用和重算。

### 2. 区分原始测试值和标准化分数

表里的 `30 米冲刺计时`、`平板支撑时间`、`10 次短传成功率` 都不是同一种数据。

需要把采集拆成两层：

- 原始测试结果：秒、次数、成功率、教练评分。
- 标准化指标分：转换为 0-100 或其他统一量表。

建议新增：

- `AssessmentTestItem`
- `AssessmentTestProtocol`
- `AssessmentRawResult`
- `ScoreScale`
- `ScoreNormalizationRule`

示例：

| 测试项目 | 原始值 | 单位 | 标准化规则 | 输出指标 |
| --- | --- | --- | --- | --- |
| 30 米冲刺计时 | 5.6 | 秒 | 年龄段分档，越低越好 | 直线速度 0-100 |
| 平板支撑时间 | 75 | 秒 | 分段换算 | 核心力量 0-100 |
| 10 次定点射门 | 7 | 次 | 命中率 x 100 | 定点射门 0-100 |
| 1v1 防守姿态评分 | 82 | 分 | 教练评分直接入标准分 | 防守身体姿态 0-100 |

### 3. 评测模板要引用图谱，而不是拥有一棵树

`AssessmentTemplate.metricIds` 只能表达“这个模板有哪些指标”，但不能表达：

- 模板选用了图谱中的哪些指标。
- 每个指标在模板里的权重。
- 哪些指标是输入，哪些指标是计算输出。
- 一个计算输出是否继续被别的模板引用。
- 展示顺序。
- 公式版本。

建议新增：

- `AssessmentTemplateVersion`
- `AssessmentMetricBinding`
- `MetricView`
- `MetricViewNode`
- `AssessmentFormulaDefinition`

`AssessmentMetricBinding` 应保存：

- `templateVersionId`
- `metricId`
- `role`: input、output、reference、display_only
- `maxScore`
- `weight`
- `formulaId`
- `testItemId`
- `recommendedDrillIds`
- `sortOrder`

`MetricViewNode` 可以保存 `parentViewNodeId`，用于把图谱里的指标展示成任意层级的表格、雷达图或报告目录。它只是视图，不是指标本身的唯一关系。

### 4. 派生计算需要比当前枚举更强

当前 `DerivedMetricMethod` 只有：

- `weighted_average`
- `recent_average`
- `sum`
- `trend`

这对样本表不够，对指标图谱也不够。样本中的公式同时有：

- 加权求和。
- 除以 100。
- 乘以节点满分。
- 上层展示节点求和。
- 最终总分求和。
- 计算结果继续作为其他计算输入。

建议把派生定义升级为受控公式表达，而不是只靠枚举。

可选实现：

1. MVP 用结构化公式：
   - `method: weighted_sum`
   - `inputs: [{ metricId, weight }]`
   - `scale: 100`
   - `maxScore`
   - `aggregation: sum`
2. 后续再支持安全 DSL：
   - 只允许引用输入指标、常量、加减乘除、min/max/round。
   - 禁止任意 JS eval。

样本公式 `=(F5*0.3+F6*0.7)/100*5` 可表达为：

```json
{
  "method": "weighted_sum_normalized",
  "inputScale": 100,
  "maxScore": 5,
  "inputs": [
    { "metricCode": "straight_dribble", "weight": 0.3 },
    { "metricCode": "change_direction_dribble", "weight": 0.7 }
  ]
}
```

### 5. 评测记录要保存输入、输出、图谱版本和快照

一次球员评测不应只保存最终分数。需要保存：

- 使用的模板版本。
- 使用的指标图谱版本。
- 每个原子指标的原始结果。
- 每个原子指标的标准化分。
- 每个计算指标和最终输出结果。
- 当时的公式快照。
- 记录人、测试时间、关联活动、备注。

建议 `PlayerAssessment` 绑定 `templateVersionId`，并拆出：

- `AssessmentRawResult`
- `AssessmentMetricResult`
- `AssessmentComputedResult`

`PlayerMetricRecord` 仍作为球员长期数据资产的统一出口。也就是说，一次评测写入评测结果表，同时把关键原子指标和计算指标同步为 `PlayerMetricRecord`。

### 6. 推荐训练项目需要结构化映射

样本中的推荐训练项目不是备注，而是评测到训练的闭环入口。

建议新增：

- `MetricTrainingRecommendation`

字段包括：

- `metricId`
- `drillId`
- `priority`
- `reason`
- `scoreRangeMin`
- `scoreRangeMax`
- `ageGroup`
- `teamLevel`

这样系统可以在球员某个指标低于阈值时推荐训练内容。

## 对现有模型的具体调整

### `AbilityMetric`

建议扩展：

- `metricKind: "atomic" | "computed" | "composite" | "view_only"`
- `sortOrder: number`
- `maxScore?: number`
- `scoreScaleId?: EntityId`
- `sourceKinds: MetricSourceKind[]`
- `isAtomic: boolean`
- `version: string`
- `status: "active" | "inactive"`

指标之间不要用 `parentMetricId` 作为唯一关系。父子展示关系放在 `MetricViewNode`；计算依赖关系放在 `MetricDependency` 或 `DerivedMetricDefinition.inputs`。

### `MetricDependency`

建议新增：

- `graphVersionId`
- `outputMetricId`
- `inputMetricId`
- `weight?: number`
- `role?: "primary" | "supporting" | "normalizer" | "context"`
- `formulaId`
- `sortOrder`

这张表表达指标图谱的边，让一个指标可以被多个输出指标引用。

### `MetricValueKind`

建议扩展：

- `score_0_100`
- `percentage`
- `duration_seconds`
- `distance_meters`
- `repetitions`

当前 `measurement` 可以临时承接，但长期不够利于校验和展示。

### `AssessmentScore`

当前固定 `score: 1 | 2 | 3 | 4 | 5` 不适合这张表。

建议改为：

- `value: MetricValue`
- `normalizedScore?: number`
- `rawResultId?: EntityId`
- `comment?: string`

### `AssessmentTemplate`

建议不要只保存 `metricIds`，应引入模板绑定和视图：

- `AssessmentTemplate`
- `AssessmentTemplateVersion`
- `AssessmentMetricBinding`
- `MetricView`
- `MetricViewNode`

### `DerivedMetricDefinition`

建议支持：

- `method: "weighted_sum" | "weighted_average" | "normalized_weighted_sum" | "sum" | "trend"`
- `inputScale?: number`
- `maxScore?: number`
- `rounding?: "none" | "integer" | "two_decimals"`
- `formulaJson`
- `inputMetricIds`
- `outputMetricId`

公式定义应该输出一个明确指标，输出结果仍然写入 `PlayerMetricRecord`，并可以继续作为其他公式的输入。

### `PlayerMetricRecord`

建议增加：

- `assessmentId?: EntityId`
- `templateVersionId?: EntityId`
- `rawResultId?: EntityId`
- `sourceRecordId?: EntityId`
- `visibility?: "internal" | "coach" | "parent"`

## MVP 实施建议

不要一次做成复杂评测引擎，但要把骨架改对。

第一步：

- 支持指标图谱和模板视图分离。
- 支持 0-100 标准分。
- 支持原始测试值和标准分分离。
- 支持结构化加权公式。
- 支持模板版本。
- 支持计算结果继续被其他评估体系引用。
- 支持评测结果写入 `PlayerMetricRecord`。

第二步：

- 做 Excel 评分表导入器，将这张表导入为图谱草稿和模板视图草稿。
- 人工确认指标编码、权重和推荐训练项目。
- 固化为俱乐部级模板版本。

第三步：

- 在教练端只做评测录入和结果查看。
- 低分指标给出推荐训练项目。
- 家长端只展示简化后的维度得分和进步趋势。

## 最终判断

现有骨架的方向正确，特别是“原子指标 + 派生指标 + 血缘追踪”这个方向能承接未来 AI 和算法评价。

但当前实现还不足以完整表达第一个俱乐部的评分表，更不足以支撑未来多个评估体系交叉引用。主要缺口不是字段数量，而是评测体系的图谱能力：

- 指标图谱。
- 指标依赖边。
- 图谱版本。
- 视图模板。
- 模板版本。
- 测试项目和原始结果。
- 标准化规则。
- 任意指标加权公式。
- 训练建议映射。

应在进入小程序前，先把后端评测模型升级到指标图谱层级，否则前端会被迫按 Excel 表格形状写死，后续换俱乐部、换评分体系，或让一个评估结果被另一个体系引用时都会很难维护。

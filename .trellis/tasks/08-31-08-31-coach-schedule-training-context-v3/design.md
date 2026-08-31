# 技术设计：教练全队日程与训练管理球队上下文 V3

## 信息架构

`/pages/coach/schedule/index` 只处理“我负责的全部球队在本日期范围内的活动”。它直接消费 `getCoachHome(range)`，可对活动类型和日期筛选，但不允许对 `teamName` 做筛选；每张活动卡的既有 `teamName` 继续显示为来源标签。

`/pages/coach/training/index` 处理“当前选中队伍的训练工作台”。页面同时取得月范围 `getCoachHome()` 与 `getCoachTrainingProjectTree()`；后者返回后端权限过滤的 `{ id, name, season }[]`。本地存储只持久化 `team.id`：`coach-training-team-id`。加载时，若存储值已不在 `teamOptions` 中，回退到 API 第一项。训练列表按 `event.teamName === selectedTeam.name` 过滤，统计也只从已过滤事件推导，避免把全队统计标注为单队数据。

`/pages/coach/team-selector/index` 仍是同一个全屏路由，但语义变为 C8.1 训练管理选择球队。它读取 training-project-tree，不读取日程 home 的临时 team 名称；选择后写 id 并 `navigateBack()`。

## 数据与兼容性

保留旧 `coach-selected-team` 不读不写，不做清理动作，以避免破坏用户其他客户端的本地状态。新 key 采用更清晰的 `coach-training-team-id`。在多人/多队场景，显示名不是标识，故持久化 id。

`getCoachTrainingProjectTree(teamId?)` 已有真实鉴权与 teamOptions 返回，不引入新接口。训练页的“本月训练 / 本月比赛 / 待点名 / 已排课程”由当前队 events 预计算；缺失字段显示 `--`，不使用 `getCoachTeam()` 的首支队伍聚合数据冒充当前队伍数据。

## Figma V3

四张 V3 画板追加在现有 2026-08-31 V3 section 中。

- C1 顶部写“日程”，下方明确“全部球队课程”，不放队伍选择卡；卡片有简洁队伍标签。
- C8 顶部“训练管理”下放“我的球队”卡，显示当前队伍、赛季、已分配队伍提示与进入箭头；统计和工作台在该语境下展示。
- C8.1 是全屏返回式列表，标题“选择训练球队”，说明“仅显示后台已分配队伍”，没有任何管理操作。
- P1 V3 仅整理月历日程为新版家长端基准，本任务不把队伍上下文引入家长端。

## 回滚

每个逻辑批次独立提交。若上线后发现训练选择影响错误，回滚 C8/C8.1 的单独提交即可；C1 不依赖新的本地状态，回滚不会影响日程 API 数据。

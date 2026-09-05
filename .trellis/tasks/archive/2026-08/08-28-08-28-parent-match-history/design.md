# 家长端比赛历史设计

## 页面结构

页面路由：`pages/parent/match-history/index`

1. `page-nav`：返回箭头、左对齐标题“比赛记录”、右侧安全区避让。
2. `match-history-page__body`：状态组件或比赛列表。
3. `match-history-card`：左侧正红色时间线条；中间比赛标题、日期时间和场地；右侧比分/状态；整卡可点击。

## 数据流

`getParentChildren()` 找到 `requireRole("parent")` 返回的 `currentStudentId`，再用已有的 180 天分块日程读取逻辑获取日程。TS 过滤 `type === "match"` 且属于当前学员的活动，并投影为 `MatchHistoryRow`。比分只从日程事件的 `match` 投影字段读取；缺失时使用“比分待同步”。

## 交互

- 页面加载时显示 loading。
- 没有当前学员时显示空态。
- 没有比赛时显示“暂无比赛记录”。
- 点击记录调用现有 `openPage`，进入 P2.1 详情。
- 失败时显示“比赛记录读取失败，请点击重试”。

## 约束

- 不修改 API 和后端持久化。
- 不在 WXML 使用 JS 数组方法。
- 不把 Figma 示例日期、球队、比分或球员姓名写入代码。
- 视觉验收仅以 WeChatIDE 375×812 截图为准；静态检查不替代视觉验收。

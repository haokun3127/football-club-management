# 技术设计：家长端学期成长报告与首页通知 Banner

## 方案

在线稿已完成本批设计基线：`701:177` 为 P4.3 学期成长报告，`714:185` 为包含通知 Banner 的 P1 变体，`717:2` 为 Banner 分组节点。三者均来自 `zZ6wKyOHKcO4UYXDd9jGwv` 的家长页 `4:6`，以 Figma MCP 返回的 375×812 画面为设计证据。

采用一个报告页和一个内容切片扩展。报告页只组合已有真实 BFF：`parent/students/:studentId/growth-summary` 提供雷达维度和训练统计，家长日程提供近期训练/比赛摘要，当前学员由持久会话 `currentStudentId` 决定。这样不新增“报告”伪实体，也不会在 API 重启后丢失客户端写入。

Banner 复用 `content/articles`。后端内容条目的 `category` 增加 `notice`，响应仍为 `{ articles: [...] }`；客户端筛选 `notice` 并把 `body` 预计算为摘要。原有 `guide/help/coach/venue` 行为保持不变。若当前俱乐部没有通知，Banner 区域返回空列表，页面继续显示月历和活动，不显示 Figma 示例通知。

## 页面结构

### P4.3 学期成长报告

顶部为标准家长顶栏：返回、标题“成长报告”。主体依次为学员切换器、阶段选择摘要卡、能力总览深色卡、维度列表、训练/比赛/出勤统计卡、教练评语状态卡。底部使用现有家长 TabBar，`growth` 为当前项。所有分数、日期、次数和状态由 TS view model 生成。

### P1 通知 Banner

Banner 位于日程顶栏后的 Hero 与月历之间，采用白色圆角卡片和品牌正红色左侧强调条；显示第一条有效通知，超过一条时显示“还有 N 条通知”并可进入内容详情。Banner 不使用弹窗，不遮挡月份切换和底部 TabBar。当前没有通知时不渲染卡片，Hero 与月历之间由固定布局间距保持稳定。

## 数据流与错误处理

`requireRole("parent")` → `getParentChildren()` → resolve active child → 并行读取成长/日程 → view model → 页面。

内容流程为 `getParentArticles()` → `category === "notice"` → `presentNoticeBanner()`。请求失败沿用现有页面错误状态和重试；报告中单个辅助请求失败时不把部分数据当成完整报告，显示可重试的报告错误态。内容接口为空时是合法空态。

## 兼容性与安全边界

- 所有 BFF 请求继续携带当前 app client 和会话，不接受客户端传入的任意俱乐部 ID。
- 当前学员必须属于 `parent/children` 返回的绑定列表；非法 `studentId` 回退到第一位绑定学员。
- 报告不读取教练无权限的数据，不写入生产库。
- WXML 只消费已预计算的数组、字符串和布尔值。

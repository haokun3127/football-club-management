# 重庆天才评测录入与雷达下钻

## Goal

将 62 项单学员长表单重构为按测试项目连续录入整队的现场工作流，并让家长雷达图支持指标切换、页内摘要和完整来源下钻。

## Requirements

- 评测页面按项目分组、项目导航、整队学员录入、进度和最终提交组织。
- 草稿键由 eventId/templateVersionId/studentId/testItemId 组成，输入、缺测和原因均本地持久化。
- 最终提交按学员调用现有 BFF；成功草稿清理，失败草稿保留并可重试。
- 输入类型和提示根据 valueKind/unit/min/max/precision 渲染。
- Growth 使用 MetricView/MetricViewNode 组织可选雷达视图。
- 点击雷达轴点或指标列表切换 selectedMetricId 和页内详情；完整详情调用现有 metric detail BFF。
- 指标详情展示趋势、记录和来源活动，不展示公式或其他孩子数据。

## Acceptance Criteria

- [x] 25 人、62 项模板能按项目录入并显示完成进度。
- [x] 页面重开后草稿恢复；缺测状态和原因不丢失。
- [x] 部分提交失败只清除成功学员草稿。
- [x] 雷达轴点与列表选择保持同一 metricId。
- [x] 页内切换显示当前指标摘要，详情页显示趋势和来源活动。
- [x] 无权限与无数据使用明确状态，不绘制假 0 值。
- [x] 全部类型检查、测试和 200 人 smoke 通过。

## Out of Scope

- 正式 assessment-task 数据模型和服务端单格自动保存。
- 全队排名、AI 推荐和评测公式展示。
- 生产微信登录。

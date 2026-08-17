# C13 技术设计

## 边界和数据流

`getCoachTeam()` → `toStudentChips()` → `loadRadar(activeStudent)` → `getCoachStudentRadar(studentId)` → `projectDimensions()` / `overall` / `assessmentPeriod` → WXML + `radar-canvas`。

该链路保持不变。视觉工作只允许修改 C13 的本地布局、已存在 view model 的显示方式和对应回归断言。

## 视觉策略

先以实时截图确认 `.radar-nav` 是否因 `176rpx + navInset` 形成额外 44px 高度；若确认，改为与在线稿总高对应的最小安全区布局，并锁定测试。其余模块按 Figma 的 16px 页面 gutter、16px 垂直节奏、`343×260px` 雷达卡和 70px TabBar 对齐。

`radar-canvas` 的像素输出只能经屏幕采集判断；无法把 automator 的 canvas 缺失当作页面问题。真实数据的维度数、标签、日期和数值不强行收缩为画板样例。

## 回滚

所有改动限制在 `pages/coach/student-radar/` 和文档。若截图验证表明某项偏差来自真实数据或系统胶囊，撤回该项纯视觉猜测，不改数据/接口。

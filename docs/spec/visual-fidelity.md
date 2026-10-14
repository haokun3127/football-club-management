# Figma 设计实施与视觉保真门禁

> Status: **Active** | Owner: Design / Mini-program | Reviewed 2026-10-14.

在线设计权威：[重庆天才小程序 Figma](https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/)。**现行节点定位入口**：[Figma frame registry](figma-current-registry.md)。[历史画板和旧版升级日志](../design/reference/figma/figma-history-ledger.md) 仅为证据，不是当前画板指令。

## 一页一证据

对每个实际 route + role + state：

1. 现场确认当前 Figma `fileKey/nodeId/variant`，获取设计 screenshot、Token、布局和静态资产；记录获取日期。
2. 在有权限的真实 API 支持的状态下运行页面；使用 [截图操作手册](visual-capture-runbook.md) 取得可信 375×812 运行截图和 sidecar，核对路由与编译版本。
3. 比对整体构图、Header/TabBar/安全区、信息层级、字号、留白、圆角、色值、图标与反馈；仅对真实动态数据和原生胶囊作有记录的有限豁免。
4. 差异记录 `Figma node / runtime route / measured difference / owner / resolution / exception approval`。没有设计批准不得以通用卡片结构替代原图主构图。
5. 每页单独标记 `Functional Pass`、`Visual Pass | Visual Fail | Data Blocked | Capture Blocked | Not Checked`，并关联 commit、截图和时间。静态测试不能替代视觉验收。

不以未经校准的单一“像素相似度 95%”代表设计通过。严禁伪造队伍、成绩、人物、活动、金额、角色、session 或未实现操作来贴近设计图。小程序必须保留真实业务 API、权限和隐私边界。

# P8.1 当前在线 Figma / 真实运行态复核

日期：2026-08-31

## 证据

- 在线文件：`zZ6wKyOHKcO4UYXDd9jGwv`
- 在线节点：`93:416`（Venues - Premium）
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-1-figma-online.png`
- 运行路由：`/pages/parent/venues/index`
- 修复后运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-1-runtime-final-2026-08-31.png`
- 修复后并排对照图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-1-compare-final-title-2026-08-31.png`
- 运行截图 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-1-runtime-final-2026-08-31.png.json`
- 截图通道：微信开发者工具 MCP `simulator_screenshot`
- 运行截图和 sidecar 均严格为 `375×812`，sidecar 已核验路由。

## 在线稿读取

已调用在线 Figma `get_design_context` 和 `get_screenshot`。当前画板为返回顶栏、搜索、场地类型筛选、场地卡片列表、场地设施标签、本月训练次数、导航按钮和家长 TabBar。

## 对照与修复

- 初始运行态第一张场地图与在线稿不一致，页面按索引使用旧本地图片；已下载在线 Figma 导出的三张场地图到 `assets/venues/venue-1.png`、`venue-2.png`、`venue-3.png`，并将视图模型切换到 PNG 资源。
- 初始运行态把后端英文类型标签 `outdoor / natural` 直接渲染到卡片，在线稿只展示中文设施标签；已移除卡片中的 `item.tags` 展示，保留原始 tags 仅用于筛选契约。
- 初始运行态场地标题比在线稿右移约 `12px`，已先增加红灯断言，再将 `.venues-nav__title` 的 `margin-left` 从 `24rpx` 改为 `0`。
- 修复后真实 MCP 复拍确认场地图、中文设施标签、卡片高度、顶栏标题位置和家长 TabBar 与在线稿结构一致。

## 数据与平台差异

- 运行态场地名称、地址、设施、当前训练次数和定位状态来自真实接口；例如当前第一场地显示“本月训练 0次”，不复制在线稿的 `4次` 示例。
- 微信状态栏、原生胶囊、Home Indicator 和真实场地图片裁切属于平台/业务运行态差异，按验收规则豁免。

## 验证结论

已分别完成：在线 Figma 读取、真实运行截图捕获、修复前后并排视觉检查、聚焦回归测试和小程序 TypeScript 检查。P8.1 归类为“修复并复拍通过”。

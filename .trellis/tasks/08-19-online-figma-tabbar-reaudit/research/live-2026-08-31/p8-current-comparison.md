# P8 当前在线 Figma / 真实运行态复核

日期：2026-08-31

## 证据

- 在线文件：`zZ6wKyOHKcO4UYXDd9jGwv`
- 在线节点：`93:388`（P8 Content Center）
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-figma-online.png`
- 运行路由：`/pages/parent/content/index`
- 修复后运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-runtime-after-book-open-2026-08-31.png`
- 修复后并排对照图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-compare-final-2026-08-31.png`
- 运行截图 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-runtime-after-book-open-2026-08-31.png.json`
- 截图通道：微信开发者工具 MCP `simulator_screenshot`
- 运行截图和 sidecar 均严格为 `375×812`，sidecar 已核验路由。

## 在线稿读取

已调用在线 Figma `get_design_context` 和 `get_screenshot`。当前在线稿为内容中心顶栏、搜索按钮、球场预订推荐卡、快速入口四宫格、最近文章列表和家长 TabBar；当前在线稿没有旧规格里曾出现的分类导航胶囊，因此没有按旧规格新增该区域。

## 对照与修复

- 初始运行态的推荐大图比在线稿整体下移约 `24px`，原因是 `.featured-card` 额外保留了 `margin-top:48rpx`，与页面已有 body 间距重复。
- 先在 `pages/parent/content/index.test.mjs` 增加间距回归断言，测试按预期红灯；最小修复为将 `.featured-card` 的 `margin-top` 改为 `0`。
- 初始运行态“训练攻略”使用单页书图标；在线稿使用带中缝的 `book-open` 图标。先增加 SVG 内容回归断言并确认红灯，再以 Figma MCP 导出的原始 SVG 替换 `assets/icons/content-book.svg`。
- 修复后真实 MCP 截图确认推荐卡、快速入口、文章列表和 TabBar 的几何层级恢复；训练攻略图标与在线稿形态一致。

## 数据与平台差异

- 运行态文章标题、年份和副标题来自真实内容接口，例如当前显示 `2026秋季训练计划`，不复制在线稿的 `2023秋季训练计划` 示例。
- 微信状态栏、原生胶囊、Home Indicator 和真实文章数量属于平台/业务运行态差异，按项目验收规则豁免。

## 验证结论

已分别完成：在线 Figma 读取、真实运行截图捕获、修复前后并排视觉检查、聚焦回归测试和小程序 TypeScript 检查。P8 归类为“修复并复拍通过”。

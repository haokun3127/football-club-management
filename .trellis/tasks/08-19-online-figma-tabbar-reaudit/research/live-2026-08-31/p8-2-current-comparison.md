# P8.2 帮助中心在线 Figma 对照记录（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:444`（P8.2 Help Center）
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-2-figma-online.png`
- 修复前运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-2-runtime-2026-08-31.png`
- 修复后运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-2-runtime-final-2026-08-31.png`
- 修复后并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-2-compare-after-help-fix-2026-08-31.png`
- 修复后运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p8-2-runtime-final-2026-08-31.png.json`

## 分层结论

1. **在线 Figma 已读取**：通过 Figma MCP 读取节点 `93:444`，确认分类图标、热门问题图标、顶栏和间距。
2. **运行截图已取得**：通过 WeChatIDE MCP 真实模拟器采集，路由 `/pages/parent/help/index`，PNG 严格 `375×812`，采集方式为 `wechatide-mcp simulator_screenshot`。
3. **视觉对照已完成**：修复后确认结构、分类资源、顶栏标题起点、热门问题行图标与箭头符合在线稿；微信状态栏、原生胶囊和 Home Indicator 属平台外壳差异。

## 已修复差异

- 训练规则、出勤说明、成长报告、账号设置、联系客服改用在线 Figma MCP 导出的原始 SVG。
- 更多问题改用画板对应的紫色三点 SVG，不再复用旧的彩色点图标。
- 热门问题改用画板对应的 `help-circle` SVG，移除旧的粉色圆底。
- 热门问题列表行改为在线稿的 12px 上下内边距，避免行高过大。
- 顶栏标题取消旧的 `24rpx` 额外左移，保持返回箭头后约 4px 间距。
- 热门问题右侧 `›` 改为在线稿对应的 chevron-right SVG。

## 数据与平台豁免

- 热门问题文案、数量和分类来自 `getContentFaqs()` 的真实 API 返回，不复制 Figma 示例数据。
- 微信状态栏、右上角原生胶囊按钮、底部 Home Indicator 不属于业务页面，按验收规则豁免。

## 验证

- `npx --yes pnpm@10.33.0 exec vitest run apps/miniprogram-cq-talent/pages/parent/help/index.test.mjs`：6 tests passed。
- `npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck`：通过。

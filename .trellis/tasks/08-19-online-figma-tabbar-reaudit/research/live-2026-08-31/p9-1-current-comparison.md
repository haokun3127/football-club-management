# P9.1 私教预约成功在线 Figma 对照记录（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:531`（P9.1 Private Success）
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-1-figma-online-2026-08-31.png`
- 修复前运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-1-runtime-2026-08-31.png`
- 修复后复拍：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-1-runtime-final-2026-08-31.png`
- 修复后并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-1-compare-final-2026-08-31.png`
- 运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-1-runtime-final-2026-08-31.png.json`

## 分层结论

1. **在线 Figma 已读取**：通过 Figma MCP 读取 `93:531` 并取得当前 PNG。
2. **运行截图已取得**：通过 WeChatIDE MCP 真实模拟器采集，路由 `/pages/parent/private-success/index`，使用真实请求 `private-lesson-cq-talent-secure-test-1-1` 与真实学员 ID，PNG 严格 `375×812`。
3. **视觉对照已完成**：修复后确认成功图标、顶栏、结果摘要、双按钮和家长 TabBar 结构符合在线稿。

## 已修复差异

- 成功状态由文字 `✓` 改为在线 Figma 导出的 48px check SVG，并固定显示尺寸。
- 顶栏标题改为返回箭头后的左对齐 18px 视觉规格。
- 成功摘要隐藏设计稿未包含的备注行，保留 API 数据模型和提交时的备注能力。
- 收紧内容区顶部留白和摘要行内边距，使按钮组回到在线稿几何位置。

## 数据与平台豁免

- 教练、日期、时段、训练内容来自真实私教申请接口；与画板示例不同属于真实数据差异。
- 运行态状态栏、原生胶囊按钮和 Home Indicator 属平台外壳差异，按验收规则豁免。

## 验证

- `npx --yes pnpm@10.33.0 exec vitest run apps/miniprogram-cq-talent/pages/parent/private-success/index.test.mjs`：6 tests passed。
- `npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck`：通过。

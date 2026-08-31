# P9 私教预约在线 Figma 对照记录（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:500`（P9 Private Lesson Form）
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-figma-online-2026-08-31.png`
- 修复前运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-runtime-2026-08-31.png`
- 修复后运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-runtime-after-fix-2026-08-31.png`
- 修复后并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-compare-after-fix-2026-08-31.png`
- 修复后运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p9-runtime-after-fix-2026-08-31.png.json`

## 分层结论

1. **在线 Figma 已读取**：通过 Figma MCP 读取 `93:500` 并取得当前 PNG。
2. **运行截图已取得**：通过 WeChatIDE MCP 真实模拟器采集，路由 `/pages/parent/private/index`，PNG 严格 `375×812`。
3. **视觉对照已完成**：修复后确认顶栏、预约表单、时段/目标选择、备注区、提交区和家长 TabBar 结构符合在线稿。

## 已修复差异

- 移除画板不存在的“预约学员”展示字段，仍保留真实 `studentId` 契约和请求参数。
- 顶栏标题改为返回箭头后的左对齐 18px 视觉规格，不再居中放大。
- 选择教练字段改用在线稿对应的 chevron-right SVG。
- 日期字段改用在线稿对应的 calendar SVG。
- 时段选择改为三列方角标签，目标选择保留四项横向标签，均采用画板的 12px 字号与 6px 圆角。
- 表单字段输入高度、底部固定提交区与在线稿几何关系对齐。

## 数据与平台豁免

- 当前教练姓名、孩子姓名、可选日期和真实提交可用性来自 `getParentChildren()` 与当前会话；未复制在线稿示例。
- 运行态未选中的时间/目标标签及提交按钮禁用色是当前真实表单状态差异，不是视觉结构缺陷。
- 微信状态栏、原生胶囊按钮和 Home Indicator 属平台外壳差异，按验收规则豁免。

## 验证

- `npx --yes pnpm@10.33.0 exec vitest run apps/miniprogram-cq-talent/pages/parent/private/index.test.mjs`：7 tests passed。
- `npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck`：通过。

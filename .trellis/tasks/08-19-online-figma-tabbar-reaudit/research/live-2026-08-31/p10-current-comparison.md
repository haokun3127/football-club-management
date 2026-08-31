# P10 账号绑定在线 Figma 对照记录（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:550`（P10 Account Binding）
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p10-figma-online-2026-08-31.png`
- 修复前运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p10-runtime-2026-08-31.png`
- 修复后运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p10-runtime-after-fix-2026-08-31.png`
- 修复后并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p10-compare-after-fix-2026-08-31.png`
- 运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\p10-runtime-after-fix-2026-08-31.png.json`

## 分层结论

1. **在线 Figma 已读取**：通过 Figma MCP 读取 `93:550` 并取得当前 PNG。
2. **运行截图已取得**：通过 WeChatIDE MCP 真实模拟器采集，路由 `/pages/parent/binding/index`，PNG 严格 `375×812`。
3. **视觉对照已完成**：修复后确认账号绑定、微信登录绑定、家庭成员、添加按钮、顶栏和家长 TabBar 结构符合在线稿。

## 已修复差异

- 顶栏标题改为返回箭头后的左对齐 18px 规格。
- 微信登录绑定的 smartphone/check-circle 换为在线稿导出的原始 SVG。
- 家庭成员头像换为直接显示的 user 线性图标，移除旧的灰色圆底。
- 添加家庭成员按钮补齐左侧 plus 图标并对齐文案间距。

## 数据与平台豁免

- 当前孩子、球队、微信脱敏手机号和家庭成员列表均来自真实 API；当前账号显示两位家庭成员而画板示例为一位，属于数据范围差异。
- 微信状态栏、原生胶囊按钮和 Home Indicator 属平台外壳差异，按验收规则豁免。

## 验证

- `npx --yes pnpm@10.33.0 exec vitest run apps/miniprogram-cq-talent/pages/parent/binding/index.test.mjs`：6 tests passed。
- `npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck`：通过。

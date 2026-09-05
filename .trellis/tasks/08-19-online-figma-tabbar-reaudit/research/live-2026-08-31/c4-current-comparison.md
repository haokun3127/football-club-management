# C4 Attendance 在线 Figma / 运行态复验（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:665`（C4 Attendance）。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-figma-93-665-2026-08-31.png`，原始尺寸 `375×922`。
- 运行路由：`/pages/coach/attendance/index?id=event-cq-talent-secure-test-1-trn-0818`。
- 运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-runtime-2026-08-31.png`，严格 `375×812`。
- 并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-compare-2026-08-31.png`。
- 运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-runtime-2026-08-31.png.json`。

## 对照结论

1. 顶栏、返回箭头、提交动作、深色活动信息卡、统计点、全员到场/清空按钮、学员行卡片、圆形头像、到场勾选和教练 TabBar 均已在真实教练运行态出现，结构与在线稿一致。
2. Figma 示例展示 20 名学员，当前真实活动返回 6 名学员；姓名、位置、出勤统计和活动标题/时间来自真实 API，属于数据范围差异，不以示例数据覆盖。
3. 当前运行态未发现确定性的布局缺失、文字遮挡、按钮错位、勾选状态不可见或 TabBar 遮挡问题。
4. 微信状态栏、原生胶囊按钮、Home Indicator 及在线画板高度差异按平台/画板外壳差异豁免。

## 验证

- 真实 WeChatIDE MCP 截图：严格 `375×812`。
- C3/C4 共用的截图脚本修复已通过 `node --test scripts/devtools/wechatide-mcp-capture.test.cjs` `10/10`；全仓门禁此前通过 domain `21/21`、小程序 `464/464`、API `125/125`。

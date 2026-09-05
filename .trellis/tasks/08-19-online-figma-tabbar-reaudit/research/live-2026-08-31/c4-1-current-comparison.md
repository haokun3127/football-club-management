# C4.1 Attendance Success 在线 Figma / 运行态复验（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:696`（C4.1 Attendance Success）。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-1-figma-93-696-2026-08-31.png`，`375×812`。
- 运行路由：`/pages/coach/attendance-success/index?eventId=event-cq-talent-secure-test-1-trn-0818`。
- 运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-1-runtime-2026-08-31.png`，严格 `375×812`。
- 并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-1-compare-2026-08-31.png`。
- 运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-1-runtime-2026-08-31.png.json`。

## 对照结论

1. 返回顶栏、绿色提交成功图形、标题/摘要、四行出勤信息卡、红色“查看训练详情”按钮和教练 TabBar 均在真实运行态出现，结构与在线稿一致。
2. 课程名称、日期、出勤人数、时间来自真实活动接口；Figma 示例为另一组活动数据，属于数据差异，不替换真实数据。
3. 未发现确定性的结构缺失、按钮错位、文字遮挡、成功图形比例异常或 TabBar 遮挡问题。
4. 微信状态栏、原生胶囊按钮、Home Indicator 及平台外壳按规则豁免。

## 验证

- WeChatIDE MCP 真实截图严格 `375×812`。
- 截图脚本已使用刷新编译 + 精确导航顺序；脚本定向测试 `10/10`，全仓门禁 domain `21/21`、小程序 `464/464`、API `125/125`。

# C4.2 Attendance Correction 在线 Figma / 运行态复验（2026-08-31）

## 页面与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 93:715`（C4.2 Attendance Correction）。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-2-figma-93-715-2026-08-31.png`，`375×812`。
- 运行路由：`/pages/coach/attendance/index?correction=1&id=event-cq-talent-secure-test-1-trn-0818`。
- 运行首屏：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-2-runtime-2026-08-31-03.png`，严格 `375×812`。
- 运行底部：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-2-runtime-bottom-2026-08-31.png`，严格 `375×812`。
- 并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-2-compare-2026-08-31.png`。
- 运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-2-runtime-2026-08-31-03.png.json`。

## 对照结论

1. 返回顶栏、橙色警示卡、异常提示、学员列表、状态标签、修改说明输入区、红色重新提交按钮和教练 TabBar 均在真实运行态出现，结构与在线稿一致。
2. Figma 示例展示 2 名异常学员，真实活动返回 8 名学员及多种状态；名单、姓名、状态和数量来自真实 API，属于数据范围差异，不覆盖为示例数据。
3. 首屏及底部滚动截图确认修改说明区域、重新提交按钮和 TabBar 可见，未发现确定性的结构缺失、遮挡或错位问题。
4. 第一次错误截图由 PowerShell 未正确引用 `&` 导致查询缺少活动 ID；已用引号修正并以正确路由重拍，错误截图不作为证据。

## 验证

- WeChatIDE MCP 真实截图严格 `375×812`。
- 截图脚本定向测试 `10/10`，全仓门禁 domain `21/21`、小程序 `464/464`、API `125/125`。

# C5 销课处理在线 Figma / 运行态复验（2026-08-31）

## 页面与证据

- 历史映射节点：`zZ6wKyOHKcO4UYXDd9jGwv / 93:734`（旧版 C5 Lesson Confirm，标题为“课时确认”）。该节点已重新读取，但不是当前页面的有效设计稿。
- 当前在线节点：`zZ6wKyOHKcO4UYXDd9jGwv / 537:2`（C5 Session Settlement — Pending，标题为“销课处理”）。已通过 Figma MCP `get_design_context` 和 `get_screenshot` 重新读取，截图尺寸 `375×812`。
- 当前在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c5-figma-537-2-2026-08-31.png`。
- 运行路由：`/pages/coach/lesson/index?id=event-cq-talent-secure-test-1-trn-0818`。
- 运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c5-runtime-2026-08-31.png`，严格 `375×812`。
- 并排对照：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c5-compare-2026-08-31.png`。
- 运行 sidecar：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c5-runtime-2026-08-31.png.json`。

## 对照结论

1. 当前实现与在线节点 `537:2` 的页面语义和结构一致：返回顶栏“销课处理”、待处理销课活动摘要、待确认学员列表、人数待处理、确认全部、发起更正和教练 TabBar 均已出现。
2. 运行态活动标题、日期、时间、场地、学员数量、姓名和状态来自真实教练 API；与 Figma 示例的内容差异属于真实数据差异，不覆盖为示例数据。
3. 运行截图包含 iPhone X/微信系统状态栏和原生胶囊，Figma 画板不包含该系统层；该区域按平台差异豁免。应用内容区域未发现确定性的结构缺失、遮挡或 TabBar 错位。
4. 直接将运行态与旧节点 `93:734` 对比会产生“销课处理/课时确认”文案差异；该差异来自在线稿版本演进，不能作为当前代码缺陷。

## 验证

- 在线 Figma `get_design_context`：已完成，节点 `537:2`。
- 在线 Figma `get_screenshot`：已完成，原始尺寸 `375×812`。
- WeChatIDE MCP 真实截图：已完成，路由已精确校验，输出 `375×812`。
- 本页本轮无需业务代码修改；不新增测试数据、不伪造会话或 API 响应。

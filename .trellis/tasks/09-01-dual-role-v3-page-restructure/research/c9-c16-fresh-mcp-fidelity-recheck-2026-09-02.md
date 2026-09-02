# C9 / C16 新鲜 MCP 视觉复核（2026-09-02）

## 基准与证据

- 在线 Figma 文件：`zZ6wKyOHKcO4UYXDd9jGwv`。
- C9 当前节点：`1900:2`，真实路由：`/pages/coach/team/index`。
- C16 当前节点：`1915:2`，真实路由：`/pages/coach/me/index`。
- C9 在线稿截图：通过 Figma MCP 重新读取，原生尺寸 `375×871`。
- C16 在线稿截图：通过 Figma MCP 重新读取，原生尺寸 `375×812`。
- C9 运行首屏：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-c9首屏-rerun-20260902.png`。
- C9 运行滚动段：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-c9滚动段-rerun-20260902.png`。
- C16 运行首屏：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-c16-my-rerun-20260902.png`。
- 三张运行图均由 WeChatIDE MCP `simulator_screenshot` 取得，原始尺寸严格 `375×812`。

## 对照结论

- C9 的返回顶栏、球队摘要、四列学员网格、教练组和固定教练 TabBar 与在线稿的结构关系一致；滚动段中顶栏和 TabBar 边界稳定，没有内容截断或覆盖。
- C16 的“我的”顶栏、设置入口、身份卡、角色切换、权限/私教/账号/帮助菜单、退出按钮和固定 TabBar 与在线稿一致。
- 运行态姓名、球队标题、赛季、训练/学员/出勤统计、学员名单和教练组成员由真实 API 返回，与 Figma 示例不同，不以硬编码覆盖。
- 微信模拟器状态栏、原生右上角胶囊和底部 Home Indicator 属运行环境外壳，不作为业务视觉差异。

## 验收分层

- 视觉证据：C9 首屏与滚动段、C16 首屏均已具备可信 `375×812` 运行截图，并完成 Figma 对照。
- 结构结论：C9/C16 当前没有确定性顶栏、布局、滚动边界或 TabBar 缺陷。
- 业务/API：本记录只确认页面可由真实教练会话读取数据，不替代接口持久化验收。

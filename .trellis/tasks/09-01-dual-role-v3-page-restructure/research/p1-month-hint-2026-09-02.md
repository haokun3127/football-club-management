# P1 月历展开态提示补齐（2026-09-02）

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:175`，原生尺寸 `375×812`。
- 对照发现：在线稿月历卡底部包含“点击日期更新日程 · 点击收起回到周日历”提示；当前运行态缺少该节点，导致月历卡少一行，属于确定性结构差异，不是 API 数据差异。
- 最小修复：在 `pages/parent/schedule/index.wxml` 的月历网格后补 `month-calendar__hint`，并在 `index.wxss` 使用 `22rpx/30rpx` 灰色文本和 `10rpx` 顶间距。
- 真实运行证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-p1-month-hint-20260902.png`，微信开发者工具 MCP 返回 `375×812`。提示可见，日期网格、当前日期标记和家长 TabBar 未被挤压或遮挡。
- 验证：P1 定向 Vitest `17/17`；WXML/WXSS MCP 编译成功；全量门禁 domain `21/21`、小程序 `446` 项、API `123/123`。

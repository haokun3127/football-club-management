# P8 发现页新鲜 Figma / 运行态复核（2026-09-02）

## 基准与证据

- 在线 Figma 文件：`zZ6wKyOHKcO4UYXDd9jGwv`。
- 当前 Parent V6 节点：`1610:772`。
- 真实路由：`/pages/parent/content/index`。
- Figma 截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-p8-recheck-1610-772-20260902.png`。
- WeChatIDE MCP 运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-p8-recheck-20260902.png`。
- 运行截图 sidecar 显示采集方式为 `wechatide-mcp simulator_screenshot`，原始 PNG 为严格 `375×812`。

## 对照结论

- 顶栏搜索、场馆 Banner、快捷入口、最近文章、内容卡片和家长 TabBar 的结构与在线稿一致。
- “发现”激活态位置正确；未发现顶部留白、内容溢出、卡片截断或底部 TabBar 覆盖问题。
- 文章标题、年份、描述和数量由内容 API 返回；Figma 示例文案不作为前端固定数据。

## 验收分层

- 静态/截图证据：已具备在线稿截图与真实 `375×812` 运行截图。
- API/数据：本记录只确认页面正常读取真实内容，不替代内容服务的完整数据验收。
- 视觉结论：当前结构通过；内容差异属于真实 API 状态。

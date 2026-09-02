# P1 家长日程 MCP 新鲜证据复核（2026-09-02）

## 证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:2`（Parent V6，P1 周态）。
- Figma 截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-p1-recheck-1610-2-20260902.png`，原生尺寸 `375×812`。
- 真实运行截图：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-p1-recheck-20260902.png`，由 `scripts/devtools/wechatide-mcp-capture.cjs` 取得，尺寸 `375×812`。
- 运行路由：`/pages/parent/schedule/index`；截图输出仅写入系统临时证据目录。

## 对照结论

- 顶栏标题、通知铃铛区域、Hero 卡、通知卡、周切换、状态胶囊、空态/课程列表区域和固定家长 TabBar 的首屏几何关系一致。
- 运行态日期为真实当前日期 **2026年9月2日**，当天没有活动，故显示真实空态；Figma 画板使用课程列表示例。此差异是 API/日期状态差异，不是视觉结构缺陷，也不应通过硬编码示例课程消除。
- 微信原生右上角菜单胶囊属于运行环境，不纳入业务画板差异。

## 验证

- `node --test scripts/devtools/visual-evidence-path.test.cjs scripts/devtools/wechatide-mcp-capture.test.cjs`：`15/15` 通过。
- 当前 MCP 状态：已登录，`tokenRequired=false`；项目窗口复用成功。
- 本次没有修改业务代码、API、数据库或 Figma。

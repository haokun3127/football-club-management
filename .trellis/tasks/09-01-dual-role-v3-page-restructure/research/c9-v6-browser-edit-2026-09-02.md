# C9 Coach V6 非破坏性迁入 — 2026-09-02

- 在线文件：`zZ6wKyOHKcO4UYXDd9jGwv`。
- 来源画板：`C9 · Team Detail · Current V3 · Runtime Reviewed`（`1570:7`）；来源未修改。
- Coach V6 目标页：`17 Product Redesign · Coach V6`（`1609:3`）。
- 新画板：`C9 · Team Detail · V6`，节点 `1900:2`，位置 `x=1285,y=2310`，Figma 回读原生高度 `871px`、宽度 `375px`。
- 旧 V3/V4/V5 与历史画板均保留；本批没有修改小程序、API、数据库或测试数据。
- Figma 回读截图已保存到：
  `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c9-v6-1900-2-20260902.png`
- 该页已有真实运行态复核记录：`research/coach-c3-c6-1-c9-c10-1-reaudit-2026-09-02.md`。本次只完成当前 Coach V6 交付目录的非破坏性补页，运行态数据继续以 API 为准。

## 2026-09-02 WeChatIDE MCP 规范截图补证

- 首屏通过 `scripts/devtools/wechatide-mcp-capture.cjs` 重新取得：
  `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\goal-c9首屏-rerun-20260902.png`，脚本验证路由为 `/pages/coach/team/index`，PNG 严格 `375×812`。
- 滚动段通过 WeChatIDE MCP `pageScrollTo` + `simulator_screenshot` 取得：
  `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\goal-c9滚动段-rerun-20260902.png`，PNG 严格 `375×812`。
- 在线 Figma `1900:2` 已重新回读并保存为：
  `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\figma-c9-online-1900-2-20260902.png`，原生 `375×871`。
- 对照结论：首屏的顶栏、球队摘要、四列学员网格、教练组横向卡片和固定 TabBar 的相对结构一致；滚动段完整显示学员名单和教练组，未发现确定性截断或错位。球队全称、姓名、人数、训练次数和出勤率按真实 API 保留，未复制 Figma 示例数据。

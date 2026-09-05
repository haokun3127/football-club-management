# C6.1 Coach V6 浏览器编辑与事件范围同步 — 2026-09-02

## 权限核验

- 在线文件：`zZ6wKyOHKcO4UYXDd9jGwv`。
- 浏览器 Figma 共享面板显示 `haokun3127（you）` 为“可编辑”，设计模式工具栏和图层编辑均可用。
- Figma MCP `whoami` 仍显示团队席位为 `View`；这是 MCP 通道权限，不推翻浏览器文件级可编辑事实。本批通过浏览器完成写入，未把 MCP 误报为可写。

## 非破坏性迁入

- 来源：Coach V4 的 `C6.1 · Match Event Add · V4`（`1580:7`）。
- 目标：Coach V6 页面 `17 Product Redesign · Coach V6`（`1609:3`）。
- 新画板：`C6.1 · Match Event Add · V6`，节点 `1894:2`，位置 `x=1285,y=1460`，尺寸 `375×812`。
- V4 来源和其他历史画板未删除、覆盖或重命名。

## 事件范围同步

真实 `capabilities.match.eventTypes` 当前包含 8 个中文事件。V6 副本在事件类型网格中补齐：

- `扑救`：节点 `1895:2`，文字节点 `1895:3`
- `抢断`：节点 `1896:2`，文字节点 `1896:3`

现在 V6 画板和真实运行态均表达：进球、助攻、黄牌、红牌、乌龙球、犯规、扑救、抢断。Figma 示例默认分钟、球员和备注仍是版式示例，不写入小程序代码。

## 回读证据

- Figma MCP 元数据回读确认 `1894:2` 为 `375×812`，事件网格包含上述 8 个入口。
- Figma MCP 截图已保存到系统临时目录：
  `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c6-1-v6-1894-2-after-events-20260902.png`
- 截图原生尺寸：`375×812`。
- 本批没有修改小程序、API、数据库或测试账号数据。

## 后续

- Coach V6 仍需非破坏性补齐 C6.2、C9、C10.1、C12/C12.1、C13、C15.1、C16/C16.1–C16.4 等缺页，并逐页回读 Figma 与真实 WeChatIDE MCP 运行截图。

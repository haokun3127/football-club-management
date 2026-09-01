# Coach C6.1/C6.2 比赛事件与草稿状态复核

## C6.1 比赛事件录入

- 在线基准：当前可读取的在线稿 `zZ6wKyOHKcO4UYXDd9jGwv / 1580:7`，来源示例 `93:827`，原生尺寸 `375×812`。
- 真实路由：`/pages/coach/match-event-add/index?eventId=event-cq-talent-secure-test-1-completed-match`。
- 运行证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-c6-1-20260901.png`，MCP 返回 `375×812`。
- 首屏结构一致：全屏返回顶栏、事件类型、分钟输入、球员选择、备注和红色提交条均存在。当前真实能力集合额外包含“扑救、抢断”，中文标签来自 API，不将在线稿的示例按钮复制成固定前端数据。

## C6.2 草稿恢复

- 在线基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:858`，原生 `375×812`。
- 真实操作：在 C6.1 输入分钟 `54` 和备注后离开，再重新进入 C6 比赛记录页；页面读到 `hasLocalDraftNotice=true`，标签为“本机保存于 2026-09-02 03:40”。
- 运行证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-c6-2-20260902.png`，MCP 返回 `375×812`。比赛页内提示卡、继续编辑入口、比分和真实事件时间线均可见。
- 设计边界：在线旧稿用遮罩弹窗表达自动保存；当前产品要求所有子页面全屏、避免弹窗，因此实现使用比赛页内提示卡，不回退旧弹窗。草稿仍是本机状态，不冒充服务器保存。

## 验证

- C6.1/C6.2 路由核验和截图均走 WeChatIDE MCP；截图尺寸严格 `375×812`。
- 本批没有业务代码修改，事件类型、真实球员名单、比分和草稿时间均未硬编码。

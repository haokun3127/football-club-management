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

## 2026-09-02 追加复拍

- 使用真实已完成比赛 `event-cq-talent-secure-test-1-completed-match` 重新打开 C6；运行证据为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788301809274-qa4y6z.png`，严格 `375×812`。
- 比赛摘要、真实比分 `4:2`、真实事件时间线、未提交事件草稿提示、“继续编辑”、添加事件入口和固定教练 TabBar 均可见；草稿时间是本机真实保存时间。
- 当前 C6.2 的产品规则是全屏比赛页内提示卡，不使用旧在线稿中的遮罩弹窗；这与“所有子页面不要弹窗”的现行要求一致，因此不按旧弹窗稿回退实现。
- 当前 MCP console 过滤 `error|exception|fail|route is not defined|wx:else|page not found` 无命中。

## 2026-09-02 最新 MCP 对照

- 在线基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:1692`，Figma 截图原生 `375×812`，下载证据保存在 `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c6-current-1610-1692.png`。
- 运行态重新截图：`/pages/coach/match/index?id=event-cq-talent-secure-test-1-completed-match`，证据为 `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788302136905-nm7c8x.png`，MCP 返回严格 `375×812`。
- 确定性结构对照通过：返回顶栏、比赛摘要 Hero、编辑比赛、添加事件入口、事件时间线和教练 TabBar 均存在，位置层级没有发现新的确定性错位。
- 运行态与 Figma 的可见差异均有状态依据：Figma 为“周末联赛排兵”示例、示例比分/事件；运行态为真实“周末友谊赛战报”`4:2`、8 条真实事件，并显示本机草稿恢复卡。上述差异不判为视觉缺陷，也不写入伪造数据。

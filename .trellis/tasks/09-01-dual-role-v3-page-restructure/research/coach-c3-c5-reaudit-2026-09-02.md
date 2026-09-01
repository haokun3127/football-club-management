# Coach C3–C5 线上稿与运行态复核（2026-09-02）

## C3 变更活动

- 在线基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:634`，原生画板宽 `375px`，为可滚动长页。
- 真实路由：`/pages/coach/event-change/index?id=event-cq-talent-secure-test-1-trn-0818`。
- 运行证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-c3-20260902.png`，MCP 返回 `375×812`。
- 首屏结构核对通过：粉色全屏顶栏、返回/保存、活动摘要、变更原因、时间、场地和说明区域均存在。活动标题、日期、状态及空字段按真实活动数据保留，不用 Figma 示例覆盖。

## C4.1 点名成功

- 在线基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:696`，原生 `375×812`。
- 真实路由：`/pages/coach/attendance-success/index?eventId=event-cq-talent-secure-test-1-trn-0818`。
- 运行证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\goal-c4_1-20260902.png`，MCP 返回 `375×812`。
- 绿色成功图标、提交结果标题、课程/日期/出勤/时间信息、红色主按钮和教练 TabBar 结构一致；`6名已到场、2名未到场` 等数量属于真实 API 数据差异。

## C4.2、C5、C5.1 的产品边界

- 在线 `93:715`（C4.2）仍表达旧的“出勤修改”流程；当前产品契约已经收口为“点名就是销课”，不再提供课时更正或单独修正流程。
- 真实访问 `/pages/coach/attendance/index?id=...&correction=1` 后仍渲染当前 C4 二态点名页，这是有意保持当前产品规则，不是截图失败。
- `pages/coach/lesson/index.ts` 与 `pages/coach/lesson-correction/index.ts` 均将带活动 ID 的历史入口重定向到 `/pages/coach/attendance/index?id=...`；C5 `93:734` 与 C5.1 `93:765` 继续作为历史归档，不纳入当前运行态视觉验收。
- 本组运行捕获 `goal-c4_2-20260902.png`、`goal-c5-20260902.png`、`goal-c5_1-20260902.png` 均为 `375×812`，但 C5/C5.1 的当前路由核验结果分别落到 C4，不能标记为独立页面通过。

## 验证

- C3/C4.1/C4.2/C5/C5.1 均通过 WeChatIDE MCP 路由与截图调用；C3/C4.1/C4.2 目标截图为严格 `375×812`。
- C5/C5.1 的重定向逻辑与当前“点名即扣课”要求一致；本批没有业务代码修改。

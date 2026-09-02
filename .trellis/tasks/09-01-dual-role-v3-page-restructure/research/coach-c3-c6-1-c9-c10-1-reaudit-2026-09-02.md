# Coach C3 / C6.1 / C9 / C10.1 在线稿与运行态复核（2026-09-02）

## 环境

- 通过家长端 P7 的真实双角色入口切回教练端；运行时随后确认教练路由，未注入会话或伪造数据。
- 微信开发者工具 MCP 已登录、`tokenRequired=false`，模拟器 iPhone X `375×812`。
- 四页均使用真实路由导航和 MCP 原始 PNG 截图；已知运行时错误过滤无命中。

## 对照结果

| 页面 | 在线 Figma 节点 | 运行路由 | Figma 证据 | 运行证据 | 结论 |
| --- | --- | --- | --- | --- | --- |
| C3 变更活动 | `1612:2` | `/pages/coach/event-change/index?id=event-cq-talent-secure-test-1-future-training` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C3-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300685728-ugh4a1.png` | 顶栏保存、活动摘要、变更原因胶囊、新时间、新场地、说明和全屏 TabBar 结构一致；活动标题、日期、场地和输入占位取真实活动状态。 |
| C6.1 添加比赛事件 | `1894:2` | `/pages/coach/match-event-add/index?eventId=event-cq-talent-secure-test-1-scheduled-match` | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c6-1-v6-1894-2-after-events-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788301474505-f0ovb2.png` | V6 在线稿已补齐真实能力契约的 8 个中文事件；全屏顶栏、事件类型、时间、球员、备注、提交按钮和 TabBar 与真实运行态结构一致。Figma 示例默认值与真实空草稿占位的差异保留为状态差异。 |
| C9 队伍详情 | `1570:7` | `/pages/coach/team/index` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C9-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300712072-vye1zx.png` | 队伍摘要、人数/训练/出勤统计、学员名单、教练组和 TabBar 结构一致；真实账号的球队名、赛季、学员数和教练组来自 API，页面继续滚动显示真实长名单。 |
| C10.1 覆盖预览 | `1571:7` | `/pages/coach/coverage/index?eventId=event-cq-talent-secure-test-1-trn-0818` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-C10-1-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300725223-f7mxjb.png` | 顶栏、学员覆盖卡、维度进度条、底部确认栏和 TabBar 结构一致；学员数量、覆盖比例和真实维度数量由 API 决定。 |

## C6.1 处理结论

- Domain `MatchEventType` 与客户端能力真实支持 `goal / assist / save / tackle / foul / yellow_card / red_card / own_goal`。
- 已在 Coach V6 `1894:2` 同步“扑救/抢断”，不修改真实 API 能力，也不伪造默认球员/分钟/备注；历史 `1580:7` 仍保留为 V4 来源。

## 2026-09-02 追加复拍

- 使用正确的真实活动 `event-cq-talent-secure-test-1-scheduled-match` 重新打开 C6.1；先前使用训练活动 ID 得到的“比赛信息读取失败”是活动类型不匹配的真实错误态，不作为普通页面证据。
- 追加运行证据：`C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788301474505-f0ovb2.png`，严格 `375×812`；当前页面显示 8 个真实能力事件：进球、助攻、扑救、抢断、犯规、黄牌、红牌、乌龙球，默认分钟/球员/备注为空且来自真实表单初始状态。
- 在线 Figma `1580:7` 复读截图显示 6 个示例入口：进球、助攻、黄牌、红牌、乌龙球、犯规。运行态多出的“扑救/抢断”与真实客户端能力契约一致，不能通过前端删掉，也不能把 Figma 示例默认值写进真实表单。
- 顶栏、事件类型区域、表单卡、提交按钮和教练 TabBar 的结构/边界仍一致；当前结论保持为“结构通过，设计范围待同步”，不宣称 C6.1 完全视觉收口。
- 当前 MCP console 过滤 `error|exception|fail` 无命中。

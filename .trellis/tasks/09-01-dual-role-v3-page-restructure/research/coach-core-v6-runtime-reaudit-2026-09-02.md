# Coach 核心页面 V6 运行态复拍（2026-09-02）

## 统一环境

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv`。
- 微信开发者工具 MCP：已登录，`tokenRequired=false`，技能版本 `0.3.9`。
- 模拟器：iPhone X，真实 MCP 返回逻辑视口 `375×812`。
- 所有截图均由 `wechatide-mcp-capture.cjs` 生成，并写入 `%TEMP%\\cq-talent-visual-evidence`，同时生成 sidecar。

## 页面证据

| 页面 | 在线节点 | 真实路由 | 运行证据 | 对照结论 |
| --- | --- | --- | --- | --- |
| C1 全部球队日程 | `1610:1323` | `/pages/coach/schedule/index` | `wechatide-mcp-1788310803824-29900216306735.png` | 周切换箭头、全部球队上下文、空态和 Coach TabBar 可见；当前日期 `2026-09-02` 没有日程，真实空态不替换为 Figma 示例课程 |
| C2 训练工作台 | `1610:1462` | `/pages/coach/event/index?id=event-cq-talent-secure-test-1-trn-0818` | `wechatide-mcp-1788310837113-21820278126036.png` | 训练摘要、二态点名、训练内容、评测入口、活动变更和 TabBar 结构一致；8 名真实学员与 Figma 示例数量不同 |
| C6 比赛记录 | `1610:1692` | `/pages/coach/match/index?id=event-cq-talent-secure-test-1-completed-match` | `wechatide-mcp-1788310868237-20172608235800.png` | 比赛摘要、比分、页内草稿提示、事件时间线、添加事件和 TabBar 结构一致；真实比赛事件比示例更多，不截断也不伪造 |
| C7 战术板 | `1610:1778` | `/pages/coach/tactical-board/index?eventId=event-cq-talent-secure-test-1-scheduled-match` | `wechatide-mcp-1788310897624-15176572428583.png` | 满屏球场、阵型切换、全部球员、候补状态、重置/保存操作均可见；首发数量和球员编号来自真实比赛 |
| C8 训练管理 | `1610:1843` | `/pages/coach/training/index` | `wechatide-mcp-1788310927121-12184812738353.png` | 当前球队、统计卡、训练计划/能力评估/学员管理/测评任务和 Coach TabBar 一致；当前真实课程数量少于 Figma 示例 |
| C8.1 选择训练球队 | `1610:1950` | `/pages/coach/team-selector/index` | `wechatide-mcp-1788310966888-31216239597846.png` | 全屏返回、后台分配提示、当前选中态和无建队入口一致；当前教练实际只分配一支球队，未复制 Figma 的示例球队 |

## 差异分类

- 没有发现新的确定性结构、顶栏、箭头、TabBar 或操作区错位。
- C1 空态、C2 学员数量、C6 事件数量、C7 首发/候补名单、C8 课程数量和 C8.1 球队数量均属于真实 API/权限数据差异。
- 本轮没有修改业务代码、接口、数据库或在线 Figma，也没有执行战术板保存、点名写入或比赛事件提交。

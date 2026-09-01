# V6 双端当前稿复拍与 TabBar 激活态复核（2026-09-01）

## 基准

- 在线 Figma 文件：`zZ6wKyOHKcO4UYXDd9jGwv`
- 家长 V6：P4 `1610:466`、P5 `1610:626`、P7 `1610:890`、P8 `1610:772`
- 教练 V6：C1 `1610:1323`、C2 `1610:1462`、C4 `1610:1577`、C6 `1610:1692`、C7 `1610:1778`、C8 `1610:1843`、C8.1 `1610:1950`
- 可信运行截图：统一由 WeChatIDE MCP 生成，发布 PNG 均严格为 `375×812`，输出目录为 `%TEMP%\\cq-talent-visual-evidence`。

## 家长端发现的问题与修正

V6 克隆画板 P4/P5/P7/P8 的可见 `TabIconsOverlay` 均错误复用了 P1 的“日程”激活态。已通过 Figma MCP 进行最小修正：

- P4 `1610:598`：激活“成长”。
- P5 `1610:744`：激活“成长”。
- P7 `1610:989`：激活“我的孩子”。
- P8 `1610:862`：激活“发现”。

导航顺序保持为“日程 / 成长 / 发现 / 我的孩子”，历史源画板未修改。修正后回读截图：

- `figma-p4-1610-466-after.png`
- `figma-p5-1610-626-after.png`
- `figma-p7-1610-890-after.png`
- `figma-p8-1610-772-after.png`

小程序实现对应的 active key 已分别为 `growth`、`growth`、`child`、`discover`，不需要业务代码改动。

## 教练端复拍结论

真实教练会话复拍路由与证据如下：

| 页面 | 真实路由 | MCP 证据 |
| --- | --- | --- |
| C1 | `/pages/coach/schedule/index` | `wechatide-mcp-1788289340223-18528535327476.png` |
| C2 | `/pages/coach/event/index?id=event-cq-talent-secure-test-1-trn-0818` | `wechatide-mcp-1788289412136-596941137715.png` |
| C4 | `/pages/coach/attendance/index?id=event-cq-talent-secure-test-1-trn-0818` | `wechatide-mcp-1788289498459-12568349279407.png` |
| C6 | `/pages/coach/match/index?id=event-cq-talent-secure-test-1-completed-match` | `wechatide-mcp-1788289556859-5040518217500.png` |
| C7 | `/pages/coach/tactical-board/index?eventId=event-cq-talent-secure-test-1-scheduled-match` | `wechatide-mcp-1788289617368-19044968056418.png` |
| C8 | `/pages/coach/training/index` | `wechatide-mcp-1788289672782-31512254753752.png` |
| C8.1 | `/pages/coach/team-selector/index` | `wechatide-mcp-1788289777226-25240257441417.png` |

逐页复核未发现新的确定性结构、顶栏、TabBar 或交互缺陷。Figma 示例与运行态之间的日期、球队/学员数量、比赛比分/事件、课程状态和保存按钮可用性，均属于真实 API 或当前交互状态差异，不用伪造数据抹平。

## 工具验证

- `node --test scripts/devtools/wechatide-mcp-capture.test.cjs`：`12/12`。
- `node --test scripts/devtools/visual-evidence-path.test.cjs`：`3/3`。
- 两个测试均确认截图输出隔离在系统临时目录，不写入桌面或工作区。

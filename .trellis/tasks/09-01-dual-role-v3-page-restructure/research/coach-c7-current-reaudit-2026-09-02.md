# Coach C7 战术板最新在线稿与运行态复核

## 基准与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:1778`，截图原生尺寸 `375×812`，证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c7-current-1610-1778.png`。
- 真实路由：`/pages/coach/tactical-board/index?eventId=event-cq-talent-secure-test-1-scheduled-match`。
- WeChatIDE MCP 运行截图：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788302236273-h7ephh.png`，返回尺寸严格 `375×812`。

## 对照结论

- 确定性结构通过：返回顶栏、`MATCH TACTICS` 标识、比赛阵型选择、满屏足球场、全部球员区、重置阵型、保存战术板和固定教练 TabBar 均存在，未发现新的缺失或重叠。
- 运行态显示真实 `4-3-3` 阵型和当前比赛球员号码；Figma 显示的是示例号码与示例上/下场状态。号码、球员头像、上场状态和球员在场落点属于活动真实数据差异，不用伪造数据抹平。
- 保存按钮在运行态因当前没有新的布局变更而呈弱化状态，Figma 为示例可保存状态；这是交互状态差异，不判为结构视觉缺陷。
- 控制台过滤 `error|exception|fail|route is not defined|wx:else|page not found` 无命中。

## 结论

本轮未发现需要修改业务代码的确定性问题；保留真实比赛数据和当前交互状态，进入下一页复核。

# 运行视觉证据存活审计（2026-09-01）

## 审计结果

扫描本任务 `research/**/*.md` 中的本地 PNG/JPG 引用：

- 唯一引用文件：67
- 当前仍存在：52
- 系统临时目录已清理、原路径失效：15

失效只代表旧临时文件已被系统清理，不代表页面验收失效。历史记录保留原路径，新的可信截图统一放到系统临时目录，不写入桌面根目录或项目工作区。

## 已重新取得的替代证据

本轮通过 WeChatIDE MCP 重新取得以下教练主链运行证据，均返回 `375×812` 原始 PNG：

| 页面 | 新证据 |
| --- | --- |
| C3 活动变更 | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c3-activity-change-current-20260901.png` |
| C4.1 点名成功 | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c4-1-attendance-success-current-20260901.png` |
| C6 比赛记录 | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c6-match-current-20260901.png` |
| C6.1 比赛事件录入 | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\coach-c6-1-current-20260901.png` |
| C7 战术板 | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c7-tactical-current-20260901.png` |
| C8 训练管理 | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c8-training-current-20260901.png` |
| C8.1 选择训练球队 | `C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\c8-1-team-select-current-20260901.png` |

此前失效的 C6.2、P1 月历提示、P5 等引用也已有同批或较新的存在文件替代；复核时应优先使用各页面研究记录中最新的 MCP 路径。

## Figma 证据

当前在线 Figma 回读原图统一保存到：

`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-live-v6-20260902\`

该目录包含 Parent V6、Coach V6 主链以及 C13–C16.4 的最新回读原图；C6.1 另有 `c6-1-match-event-add.png`。失效的旧 Figma 临时路径不再作为新的验收依据。

## 结论

- 截图脚本门禁仍为 `15/15`；WeChatIDE MCP 当前登录、`tokenRequired=false`。
- 运行截图过期时，必须对同一路由重新调用 MCP，不得从旧路径是否存在推断页面状态。
- C5/C5.1 仍按“点名即扣课”产品规则重定向到 C4，不作为独立当前页面验收。
- C6.1 仍保留设计源差异：运行契约有 8 类中文事件，在线稿 `1580:7` 只有 6 类；这需要在线 Figma 改稿或产品范围确认，不能通过删除代码能力解决。

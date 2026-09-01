# Coach C8.1 训练球队选择最新复核

## 基准与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:1950`，截图原生 `375×812`，证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c8-1-current-1610-1950.png`。
- 真实路由：`/pages/coach/team-selector/index`。
- 修复前运行截图：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788302678324-6d8h88.png`，严格 `375×812`。
- 修复后运行截图：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788302881874-pligu6.png`，严格 `375×812`。

## 差异与修复

- 在线稿的球队卡元信息结构为“赛季 · 学员数 · 当前选择/后台已分配”；修复前只显示“当前选择 · 后台已分配”，缺少真实赛季和人数。
- `getCoachTrainingProjectTree` 继续提供可选球队范围；对每个真实选项补读已有的 `getCoachTeam(teamId)`，使用 `stats.memberCount` 和球队赛季生成 view model 文案。
- 详情请求失败时保留赛季和选择/分配状态，不阻塞选队页，也不伪造学员数。
- 当前真实账号显示 `U10精英队 · 2026-2027赛季 · 19名学员 · 当前选择`；其它球队仍不因 Figma 示例而虚构，页面没有新建/编辑/删除入口。

## 验证

- C8.1 定向 Vitest `4/4`（包含详情人数成功与详情请求失败降级）。
- 小程序 TypeScript `tsc --noEmit` 通过。
- WeChatIDE MCP WXML/WXSS 编译通过。
- 重开页面后的真实截图确认元信息已显示且仍保持全屏返回和选中态。

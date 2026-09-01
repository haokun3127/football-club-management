# Coach C8 训练管理最新在线稿与运行态复核

## 基准与证据

- 在线 Figma：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:1843`，截图原生尺寸 `375×812`，证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-c8-current-1610-1843.png`。
- 真实路由：`/pages/coach/training/index`。
- 修复前运行证据：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788302319538-i4oi5m.png`，严格 `375×812`。
- 修复后运行证据：`C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788302564006-tfs4bn.png`，严格 `375×812`。

## 确定性差异与修复

- 在线稿的“我的球队”上下文卡右侧是红色“切换 ›”操作文案；修复前运行态只有灰色 chevron，操作意图不够明确。
- `pages/coach/training/index.wxml` 将右侧图标替换为 TS/WXML 可静态表达的“切换 ›”操作组，仍由整个上下文卡进入唯一的训练球队选择页；未新增球队创建入口。
- `index.wxss` 增加红色操作文案及箭头的对齐样式，保留卡片尺寸、球队元信息和安全区避让。
- Figma 与运行态的统计值、课程数量、课程标题和日期来自真实账号/接口，保持真实，不以样例数据覆盖。

## 验证

- TDD：新增“训练上下文显示 Figma 球队切换入口”断言；先得到 `1 failed / 7 passed`，完成最小 WXML/CSS 修复后为 `8 passed`。
- 小程序 TypeScript `tsc --noEmit` 通过。
- WeChatIDE MCP `compile_wxml` 返回成功，`compile_wxss` 返回成功。
- 修复后重新打开页面并截图；运行态确认红色“切换 ›”已显示，截图尺寸严格 `375×812`。


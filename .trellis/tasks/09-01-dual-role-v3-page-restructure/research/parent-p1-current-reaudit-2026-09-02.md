# Parent P1 最新在线稿与运行态复核

## 基准与证据

- 在线 Figma 周态：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:2`，截图原生 `375×812`，证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-p1-current-1610-2.png`。
- 在线 Figma 月历展开：`zZ6wKyOHKcO4UYXDd9jGwv / 1610:175`，截图原生 `375×812`，证据：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-visual-evidence\figma-p1-month-current-1610-175.png`。
- 真实家长路由：`/pages/parent/schedule/index`；先从教练“我的”通过现有双角色入口切换到家长，再取得运行截图 `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788303081439-28dpsr.png`（周态）与 `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788303140701-9jiu7s.png`（月历展开），均严格 `375×812`。

## 对照结论

- 周态与月历展开均保留固定顶栏、通知铃铛/红点、深色 Hero、通知 Banner、左右周/月箭头、日期选择器、统计胶囊、活动区和家长 TabBar；月历展开还保留收起按钮与“点击日期更新日程 · 点击收起回到周日历”提示语。
- 运行态当前日期为 `2026年9月2日`，Figma 使用示例日期 `2025年7月10日`；Hero 是否有课程、日期红圈位置、活动标记和列表内容均由真实日程 API 决定，不复制 Figma 示例。
- 首次直接从教练身份重开家长路由会因真实 `requireRole("parent")` 守卫显示空白；通过 C16 已有“切换”入口完成真实角色切换后，页面内容正常，无伪造会话。
- 本轮未发现确定性的结构、定位、日历交互或 TabBar 缺陷，无需修改业务代码。

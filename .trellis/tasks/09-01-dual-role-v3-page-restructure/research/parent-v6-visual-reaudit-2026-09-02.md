# Parent V6 在线 Figma 与运行态复核（2026-09-02）

## 环境与会话

- 先从真实教练端 `C16 我的` 的双角色入口切换到家长端；切换后运行时确认路由为 `pages/parent/schedule/index`，并读取到真实孩子、课程、提醒和月历数据。
- 微信开发者工具 MCP：已登录、`tokenRequired=false`；模拟器 iPhone X，逻辑视口 `375×812`。
- 所有运行截图均使用 MCP `simulator_screenshot` 原始 PNG，写入 `C:\Users\ASUS\AppData\Local\Temp`。

## 页面对照

| 页面 | 在线 Figma 节点 | 运行路由 | Figma 证据 | 运行证据 | 结论 |
| --- | --- | --- | --- | --- | --- |
| P1 周日程（有课程） | `1610:2` | `/pages/parent/schedule/index`，切到真实有课日期 `2026-09-04` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-P1-week-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300532300-fka44t.png` | 顶栏铃铛、深色 Hero、通知 Banner、左右周切换、周条、统计胶囊、课程卡和 TabBar 结构一致。真实日期、标题、场地、课程状态和数量按 API 保留。 |
| P1 月历展开 | `1610:175` | `/pages/parent/schedule/index`，点击 `.week-nav` 展开 | `C:\Users\ASUS\AppData\Local\Temp\figma-live-P1-month-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300423382-a7sgt1.png` | 月份标题、前后月箭头、收起箭头、周一开头的 42 格月历、日期标记、提示语和 TabBar 位置一致；当前年月和事件标记来自真实日期/API。 |
| P4 成长 | `1610:466` | `/pages/parent/growth/index` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-P4-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300439526-gxmwtz.png` | 成长摘要、成长足迹、比赛记录、训练历程和成长 TabBar 结构一致；孩子、训练小时、出勤率、评估状态和柱状数据为真实数据。 |
| P5 能力雷达 | `1610:626` | `/pages/parent/radar/index` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-P5-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300452686-zgluet.png` | 返回/历史对比、学员选择、深色雷达卡、综合分、维度详情和 TabBar 结构一致；当前孩子、维度、评分和评估日期为真实数据。 |
| P8 发现 | `1610:772` | `/pages/parent/content/index` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-P8-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300465861-hwerat.png` | 顶栏搜索、场馆 Banner、四个快捷入口、最近文章和发现 TabBar 结构一致；文章标题、年份和描述来自内容 API。 |
| P7 我的孩子 | `1610:890` | `/pages/parent/child/index` | `C:\Users\ASUS\AppData\Local\Temp\figma-live-P7-20260902.png` | `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1788300479038-p15zlg.png` | 孩子身份卡、当前身份/切换入口、三项统计、四个快捷入口、最近动态和我的孩子 TabBar 结构一致；孩子姓名、球队、统计和动态来自真实 API。 |

## 结论

- 本批没有发现确定性的结构、定位、顶栏、TabBar 或日历交互缺陷，因此没有修改业务代码、API、会话或在线 Figma。
- P1 额外验证了“空态”和“有课程态”都能从真实日期切换得到；不能因为当前日期没有课程就把 Hero/课程卡缺失误报为视觉问题。
- Figma 示例中的日期、孩子姓名、球队、指标、文章和统计不写入前端伪造数据。

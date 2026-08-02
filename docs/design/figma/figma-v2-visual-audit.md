# 新版 Figma 全量视觉审计（2026-07-31）

> 权威离线源：`../02-Figma最新设计导出/重庆天才小程序 UIUX Design System.fig`
>
> 解析产物：`../../tools/fig-out-v2.json`（5,653 个节点，完整解析）
>
> 本轮验收原则：画板固定结构、尺寸、层级、颜色及状态须与新版 `.fig` 一致；功能数据接口可复用，但不得以通用业务表单替代画板内容。

## 已确认的全局偏差（P0）

- [x] **自定义导航总高错误**：15 页将 `navInset` 额外附加到固定高度导航，导致实际高度超过 Figma 的 88px；已统一改成 `border-box`，安全区包含在固定总高内。
- [ ] **原生导航与自定义 Header 双重渲染**：43 页中有 26 页未设 `navigationStyle: "custom"`，但页面内部仍渲染 `app-header`。微信原生栏（约 44px）和自定义 Header 会叠加，造成截图中的顶部双标题、黑块、内容下沉和背景分界错误。必须先逐页切换为统一自定义导航或移除 Header，不能继续在双层导航上调样式。
- [ ] **公共 Header 高度模型不一致**：`components/app-header` 按运行时 `statusBarHeight + 44px` 计算，无法稳定匹配 Figma 的固定 88px Top Nav；与上一项一起重构为统一导航容器。
- [ ] **图标体系不一致**：多页面仍以 Emoji（如 ⚙ / 📅 / 📊）代替 Figma 线性图标或图片资源；需替换为已有 SVG/icon 资源或小程序可渲染的矢量资源。
- [ ] **TabBar 信息架构偏差**：家长端第三项当前为“孩子”，Figma 为“我的孩子”；教练端 Tab 文案与状态页 active 值也有偏差。需要统一 375×70 TabBar 的文案、图标尺寸、active 点位和安全区。
- [ ] **页面模板混用**：26 页仍使用旧 `app-header` / 通用表单布局，无法匹配新版画板固定的 Top Nav、Hero、卡片和底部导航节奏。
- [ ] **视觉回归缺失**：此前仅 typecheck/test，未按小程序实际 375×812 截图逐页验收。

## 家长端差异优先级

### P0：首屏或主功能架构错误

- [ ] P5 Ability Radar：当前以“指标积累”空态/通用雷达实现替代 Figma 六维雷达、综合评分、维度详情与历史比较结构。
- [ ] P6 Metric Detail：当前记录/来源卡替代 Figma 的分数 Hero、趋势、教练评语、同队对比。
- [x] P7 Parent Profile Hub：已按新版 P7 回归为球员卡、三列统计、2×2入口、最近动态、本周提醒；此前错误混入 P7.1 详情卡。
- [ ] P7.1 Lesson & Insurance：应从 P7 拆为独立详情页，并按 Figma 课时/保障架构重做。

### P1：结构存在、内容/密度偏离

- [ ] P1 Schedule Home：去掉非设计的高密度日期筛选/类型 Tab，Hero 指标改回出席率/本周训练/本周课次，日期周条按画板节奏。
- [ ] P1.1 Date Activity List：核对时间线、筛选与活动卡规格。
- [ ] P2/P2.1/P2.2：训练/比赛/其他详情分别复核 Hero、比分、确认区、训练内容与状态卡。
- [ ] P3 Reminders：旧 `app-header` 与列表布局替换为新版提醒中心 Top Nav/全部已读/卡片列表。
- [x] P4 Growth Home：已按新版补齐固定 212px Hero、成长足迹、8 月柱图、深色雷达卡；仍需截图验收。
- [ ] P8/P8.2 Content & Help：旧通用 Header/表单卡替换为搜索、分类和内容卡布局。
- [ ] P9/P9.1 Private Lesson：旧 Header/表单规范回归新版预约及成功状态画板。
- [ ] P10 Account Binding：旧 Header/列表替换为新版账号绑定结构。

## 教练端差异优先级

### P0

- [ ] C1 Schedule Home：固定 88px 顶栏、64px 日期条、3 项统计 Pill、活动列表及 70px tab 层级未严格遵循。
- [ ] C8 Training Management：当前 2×2 通用统计 Hero 与 Figma 的累计课时/平均出勤等固定数据卡不一致。
- [ ] C10 Training Content：旧 Header/选择器布局，不符训练内容选择、已选项目及底部保存状态画板。
- [ ] C12 Project Score Entry：项目评分录入的固定任务头、学员评分结构、自动保存状态未完整对齐。
- [ ] C13 Student Radar / C14 Team Ability：旧通用雷达页，未实现 Figma 的学员/团队能力信息架构。
- [ ] C16 Coach Me：当前功能权限长列表取代 Figma 我的主页（资料 Hero、快捷菜单、服务入口）。

### P1

- [ ] C2 Activity Workbench：功能区保留但重做实时 Hero、进度、出勤/训练/比赛入口层级。
- [ ] C4 Attendance / C4.1/C4.2：点名清单、成功态、异常态按画板重排。
- [ ] C5 Lesson Confirm / C5.1：课时确认与更正状态按画板回归。
- [ ] C6 Match Entry / C6.1/C6.2：比分 Hero、事件时间线、添加事件状态按画板回归。
- [ ] C7 Tactical Board：设计源原始画板节点不完整，须依统一 coach 模板复核。
- [ ] C11 Test Tasks / C15 Assessment：任务列表、测评录入/提交状态按画板复核。
- [ ] C16.1–C16.4：权限、私教意向、账号、帮助等子页仍是旧 Header 页面。

## 执行顺序

1. [x] 全局导航高度修正（15 页）并跑全量 check。
2. [ ] 家长端 P5/P6/P7.1 回归。
3. [ ] 家长端 P1/P1.1/P2 系/P3/P8/P9/P10 回归。
4. [ ] 教练端 C1/C8/C10/C12/C13/C14/C16 回归。
5. [ ] 教练端详情/状态页回归。
6. [ ] 每页用开发者工具 375×812 真截图对比 Figma 导出，形成截图证据后再提交。

# Figma 权威来源

> 最后更新：2026-09-02

## 唯一设计基准

后续查看、审计、修改和验收重庆天才小程序设计时，唯一权威来源是以下在线 Figma 文件：

https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/

文件 Key：`zZ6wKyOHKcO4UYXDd9jGwv`

## 2026-09-01 Current Product V3 页面（后续实施入口）

- 为消除旧稿、CODE 稿与局部改版区混杂造成的误用，在线 Figma 新增了两个**追加式**页面；旧 `05 Parent Generated`（`4:6`）和 `06 Coach Generated`（`4:7`）仍只作历史与来源审计，不能被删除或覆盖：
  - `1462:2 / 10 Current Product · Parent V3`，治理总览 `1464:2`。
  - `1462:3 / 11 Current Product · Coach V3`，治理总览 `1464:303`。
- 已迁入且仍是当前实现基准的 `375×812` 画板：Parent P1 周态 `1465:546`、展开月历 `1465:719`、周态空页 `1465:1010`；Coach C1 全部球队日程 `1465:7`、C8 训练管理队伍上下文 `1465:146`、C8.1 全屏选择训练球队 `1465:253`。
- Parent P4 `1467:185 / P4 · Growth · Current V3 · Runtime Reviewed` 已补齐实际运行已有的“比赛记录”卡；P5 `1467:315 / Ability Radar`、P8 `1467:435 / Discover`、P7 `1467:527 / My Child` 均已用真实 WeChatIDE MCP `375×812` 截图完成结构对照。姓名、雷达维度、统计、内容年份和状态继续取真实数据，不复制为 Figma 固定值。Parent 四页的新 V3 副本已从 P1 复用正确底栏，顺序为“日程 / 成长 / 发现 / 我的孩子”；历史源稿仍不改。
- Coach C2 `1467:726`、C3 `1561:7`、C4 `1536:7`、C6 `1467:784`、C7 `1544:7`、C10 `1563:7`、C14 `1546:7` 与 C16 `1467:868` 均已在总览标记为“运行态已对照”。C3 是从保留的 `93:634` 画板非破坏性迁入，沿用全屏变更表单；C10 从 `93:952` 迁入，唯一改动是删除“动作要点”搜索提示，保留真实三层训练内容树与直接选卡；C14 继承训练管理保存的训练球队，不在能力评估页另设选队入口；它使用当前队真实球员名单和真实雷达数据，不能以画板样例冒充数据。C16 显示默认负责球队的真实成员数/平均出勤，以及真实近 30 天日程数；“我的球队”选择仍仅限 C8。

## 2026-08-30 家长 TabBar 当前产品基线

- 家长端底部导航唯一有效顺序为：日程 / 成长 / 发现 / 我的孩子。
- 在线 Figma 已同步调整常规版和月历版的第三、第四格，涉及 358:815、269:354、269:376、1008:543、1008:570；第三格为“发现”，第四格为“我的孩子”，对应图标随整组位置交换。
- Figma MCP 回读确认四个槽位的横向起点为 0、93.75、187.5、281.25；小程序源码 components/role-tabbar/index.ts 与该顺序一致。教练端导航保持独立配置，不受此次交换影响。

## 2026-08-31 点名即扣课基线

- 教练端正式出勤画板为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:665 / C4 点名（点名即扣课）`；正式文案为“点名”“已到”“未到”“点名即扣课”。
- `537:2`（C5）、`93:765`（C5.1）、`537:79`（历史）和 `537:156`（详情）仅作历史归档，不再是小程序当前交付或视觉验收目标。
- 当前产品不提供独立销课与课时更正；旧路由只保留兼容跳转，不能据这些历史画板恢复旧功能。

## 2026-08-31 V3 日程／训练管理信息架构（当前基准）

- 本轮不覆盖旧画板，在线 Figma 新增 V3 区域作为当前产品信息架构基准；以下画板均为 `375×812`：
  - `1442:185 / P1 Parent Schedule — Week / V3`
  - `1444:185 / P1 Parent Schedule — Month Picker Expanded / V3`
  - `1442:351 / P1 Parent Schedule — Week Empty / V3`
  - `1364:8 / C1 Coach Schedule — All Teams / V3`
  - `1364:151 / C8 Training Management — Team Context / V3`
  - `1364:253 / C8.1 Team Selection — Training Management / V3`
- 教练端**日程**只展示该教练负责的全部球队课程，按时间排列；每张训练/比赛卡必须显示所属球队和场地。日程不得出现“我的球队”入口、选队状态或按球队过滤。
- 教练端**训练管理**是唯一的球队上下文：顶部“我的球队”卡进入全屏 C8.1；所选队伍只影响训练计划、出勤、测评和统计，不影响日程。
- C8.1 只列出后台已分配且当前教练有权限查看的队伍；它不提供新建、编辑或删除球队能力。
- 家长端 P1 保持家长自己的日程基准：默认显示周日历；点击下拉后展开月历；选择日期后回到周日历。空日期也保留同一日期控件与稳定内容区，不承载教练端队伍选择语义。
- 上述 V3 画板已于 2026-09-01 通过 Figma MCP 在线截图回读；P1 三态还逐一补入了与真实运行层级一致的通知横幅。真实小程序数据、队名和活动日期须继续取后端返回值，不能复制设计示例或伪造额外队伍。

任何页面实现、设计规格、视觉回归和 Figma MCP 操作，均应以此在线文件当前内容为准。旧文件 `ATlfBRO0ruOCDDY5ICagFD` 仅用于历史审计，禁止新的读取、编辑、实现或视觉验收；本地 `.fig` 二进制副本也不是当前设计事实。来自不同设计文件的节点 ID 不得互相继承。

## 2026-08-19 当前交接事实

- 本文件仍以在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 为唯一权威；家长端根页面为 `4:6`，教练端根页面为 `4:7`。
- P5 `93:278` 的新版顶栏已按在线稿收口：删除重复的学员/球队副标题，保留下方学员选择器，并将“历史对比”保持在标题右侧的固定设计预留内。本轮没有发现需要继续修改在线稿的问题。
- 2026-08-19 全端顶栏审计读取了 C1 `93:578`、C2 `93:606`、C3 `93:634`、C4 `93:665`、C11 `93:1002`、C12 `93:1030`、C14 `93:1106`、C15 `93:1132`、C16 `93:1182`；运行态截图和数据/平台豁免记录见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-19/coach-header-action-audit.md`。
- 在线 Figma 读取、运行截图取得和视觉对照是三个独立事实。已有某一页的 PNG 或单测不能推导其他页面已验收；新的 TabBar/root-nav 任务仍需按当前任务文件逐页补证据。

## 当前设计引用三元组

页面级引用：

- `zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`
- `zZ6wKyOHKcO4UYXDd9jGwv / 4:7 / 06 Coach Generated`

`4:6 / 05 Parent Generated` 页面画板（2026-08-07 经 Figma MCP `get_metadata` 实读观测，均为 375×812 顶层画板；设计内容与截图未核验，不构成视觉验收依据）：

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:2 / G1 Launch`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:56 / G3 Login Blocked`
- `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`
- `zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:139 / P2 Training Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:170 / P2.1 Match Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:198 / P2.2 Other Activity Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:222 / P3 Reminder Center`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:250 / P4 Growth Home`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:278 / P5 Ability Radar`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:308 / P6 Metric Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:336 / P7 Parent Profile Hub`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:364 / P7.1 Lessons Insurance`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:388 / P8 Content Center`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:416 / Venues - Premium`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:444 / P8.2 Help Center`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:472 / Coach Team`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:500 / P9 Private Lesson Form`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:531 / P9.1 Private Success`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:550 / P10 Account Binding`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:86 / CODE / P1 Family Schedule`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:87 / CODE / P2 Training Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:88 / CODE / P2.1 Match Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:89 / CODE / P2.2 Other Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:90 / CODE / P4 Growth & Radar`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:91 / CODE / P6 Metric Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:92 / CODE / P7 Child Hub`

实测构成：21 张原始设计 + 7 张 CODE 契约版（`222:86`–`222:92`）。此前本节的 5 条简表只是常用引用子集，不是全集；08-05 期间"P5/雷达节点不可得"的判断即源于把子集误读为全集。

## 本地 .fig 的定位

本地交接包中的以下文件仅作为历史离线备份和解析素材：

`02-Figma最新设计导出/重庆天才小程序 UIUX Design System.fig`

它不是可安全自动回写的工作副本。Figma MCP 修改的是在线文件；需要更新本地备份时，应从上述在线文件人工导出 `.fig` 后再替换本地文件，并记录新的导出时间和校验值。

## 当前 G2 设计引用

- 页面：`05 Parent Generated`
- 画板：`G2 Login Verification`
- 节点 ID：`93:29`
- 画板尺寸：`375x812`
- 当前来源三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`

已完成的在线改动：

- 将 `绑定孩子` 改为 `身份验证`。
- 删除验证码、获取验证码和重复的微信一键登录组。
- 验证卡保留两行：`微信手机号 / 授权后自动读取`、`身份匹配 / 自动匹配俱乐部档案`。
- 保留唯一 CTA：`微信手机号授权并继续`。
- 两行标签和值均使用 `Noto Sans SC Regular`、`14px`；值列起点统一为 `x=111`。

## P1 运行态证据边界

- 当前成功态画板来源三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`，尺寸 `375×812`。
- 旧文件 `ATlfBRO0ruOCDDY5ICagFD` 的 `93:83` 节点和相关历史截图仅保留为切源前审计事实，不构成新的视觉验收依据；不代表 P1 Empty、其他家长页、教练页或真机矩阵已经验收。
- 每次视觉改动仍必须先读取当前在线目标三元组和截图；不能用本地 `.fig`、旧导出或切源前历史规格反推当前设计。

## 2026-08-29 P1 周日历／展开月历改版

- 甲方已确认：P1 的默认日期控件是周日历；月历只在点击日期区的展开提示后出现，不是固定首页模块，也不是弹窗。选择日期后更新下方日期摘要与日程列表，并收起回周日历。
- 在线 Figma 新增且已截图复核的非破坏性改版区块为 `1008:185 / 2026-08-28 甲方需求改版 · P1`。它保留历史画板 `269:250`、`269:479`、`521:339` 不变。
- 当前实现基准三元组：
  - `zZ6wKyOHKcO4UYXDd9jGwv / 1008:186 / P1 Schedule Home — Week + Month Picker / Collapsed`
  - `zZ6wKyOHKcO4UYXDd9jGwv / 1008:436 / P1 Schedule Home — Week + Month Picker / Expanded`
  - `zZ6wKyOHKcO4UYXDd9jGwv / 1008:348 / P1 Schedule Home — Week + Month Picker / Empty`
- 本批 Figma 三态均已通过在线 `375×812` 截图复核。小程序运行时截图仍须由能够进入家长会话的真实账号补取；教练会话跳转到家长 P1 会被真实角色守卫阻止，这不是视觉通过证据。

## 2026-08-29 C1 我的球队／C1.1 全屏选择改版（已被 V3 取代）

- 此段保留为历史决策记录。2026-08-31 后，“我的球队／选择球队”已迁移至训练管理 C8/C8.1；C1 日程不再承担选队职责。
- 在线 Figma 在保留历史 `529:7` 画板的前提下新增非破坏性改版区块 `1026:7 / 2026-08-28 甲方需求改版 · C1`。当前实现基准三元组：
  - `zZ6wKyOHKcO4UYXDd9jGwv / 1026:9 / C1 Coach Home — Team Selector / Client Revision`
  - `zZ6wKyOHKcO4UYXDd9jGwv / 1026:150 / C1.1 Coach Team Selection — Full Screen`
- C1.1 的在线稿已截图复核。小程序真实教练会话已在 `375×812` 下复核全屏返回、单队已选态与“仅显示已分配队伍”边界；真实运行名称来自 API，未写入 Figma 示例队伍。

## 2026-08-29 C7 全屏战术板客户改版

- 旧 C7 MVP `233:2` 保留为历史基准；在线 Figma 新增非破坏性客户改版区块 `1040:7`，当前页面基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 1040:9 / C7 Tactical Board — Full Screen / Client Revision`。
- 新稿明确为无 TabBar 的全屏工作面：上部球场、下部圆形球员名单、全屏返回、阵型与保存操作；场上/名单交互设计为拖拽上下场。
- 小程序已按 `1040:9` 完成顶部安全区、上半球场、下部完整真实 roster 与无 TabBar 全屏工作面；首发拖回名单、替补拖入球场均有定向回归覆盖。真实 `375×812` 运行截图为 `tmp/c7-final-runtime-20260829.png`，与在线稿 `tmp/figma-c7-fullscreen-client-revision-20260829.png` 对照时，球员姓名/头像内容按真实 API 动态数据豁免。保存后重新加载同一真实比赛成功读回，未将该结果表述为 API 重启证据。

## 2026-08-11 双角色入口设计

- 在线 Figma 新增复用组件集：`304:14 / RoleSwitchEntry`；变体为 `304:2 / role=parent` 与 `304:8 / role=coach`。该组件仅用于后端已确认同时拥有家长、教练两种入口的账号。
- 家长日常入口：`zZ6wKyOHKcO4UYXDd9jGwv / 93:336 / P7 Parent Profile Hub` 中的 `305:340 / RoleSwitchEntry / parent / dual-role only`，位于孩子资料卡之后。
- 教练日常入口：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me` 中的 `305:430 / RoleSwitchEntry / coach / dual-role only`，位于教练资料卡之后。已于 2026-08-11 重新读取节点并生成在线 Figma 截图复核其位置；这不是小程序运行态视觉验收。

## 2026-08-05 P1 运行态 superseding 记录

- 当前成功态对照节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`。已取得可信 Windows PrintWindow 模拟器截图，路由为 `pages/parent/schedule/index`，逻辑视口为 `375×812`，原始 PNG 为 `563×1218`。
- 本次取证不通过视觉验收：运行态 Hero 左侧酒红面积/边界明显偏离当前 Figma，且周序显示为 `SUN→SAT`，当前节点为 `MON→SUN`。数据内容差异不单独判作 CSS 缺陷。
- 取证成功只证明窗口、路由和视口可被可靠捕获，不等于角色/session/API 或当前 Figma 视觉验收通过；本轮没有代码改动。

## 2026-09-01 C11 测评任务迁入 Current Coach V3

- 当前 V3 Figma 节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 1564:7 / C11 · Assessment Tasks · Current V3 · Runtime Reviewed`，由历史 `93:1002` 非破坏性克隆而来；历史画板继续保留。
- 小程序 `/pages/coach/test-tasks/index` 的顶栏已统一为共享的 `88rpx + content-box + navInset/menuInset` 结构，移除旧 `176rpx` 内联补偿，确保同一安全区口径下不发生后续顶栏漂移。
- WeChatIDE MCP 真实截图 `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788248438586-u0siuk.jpg` 为严格 `375×812`。顶栏、筛选条、任务进度卡、悬浮新增动作和教练 TabBar 均在运行；日期、人数和状态均为真实 API 数据差异。

## 2026-09-01 C12 项目评分录入迁入 Current Coach V3

- 当前 V3 Figma 节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 1565:7 / C12 · Assessment Entry · Current V3 · Pending Runtime Data`，由历史 `93:1030` 非破坏性克隆而来；历史画板继续保留。
- 在线稿为 `375×894` 的可滚动评分录入页，结构包含全屏评分顶栏、深色测评摘要、紧凑学员指标卡、底部保存评分栏和教练 TabBar。它表达的是“测评任务进入评分录入”，不把样例成绩写入小程序。
- 真实教练会话打开 `/pages/coach/assessment-entry/index?eventId=event-cq-talent-secure-test-1-trn-0818` 后返回“缺少评测模板参数，请从评测任务列表进入。”；该活动没有可用测评模板，因此当前仅登记设计基准，不能宣称运行态视觉通过，也没有伪造模板或评分数据。

## 2026-09-01 C12/C12.1 评估录入与草稿恢复迁入 Current Coach V3

- 当前 V3 Figma 节点：C12 `1565:7 / C12 · Assessment Entry · Current V3 · Pending Runtime Data`，C12.1 `1566:7 / C12.1 · Assessment Draft Resume · Current V3 · Runtime Pending`；二者均由历史 `93:1030`、`93:1061` 非破坏性克隆，旧画板保留。
- C12 在线稿为 `375×894` 可滚动评分录入页，C12.1 为 `375×812` 本机草稿恢复遮罩。两页都属于训练管理下的评测任务链路，不在训练/比赛活动卡上直接增加评测入口。
- 真实教练会话打开 C12 时，当前活动返回“缺少评测模板参数，请从评测任务列表进入。”；因此尚无真实评分表或本机草稿可用于 C12/C12.1 的运行态视觉通过。不得用 Figma 样例学员、分数或草稿替代真实数据。

## 2026-09-01 C13 学员雷达迁入 Current Coach V3

- 当前 V3 Figma 节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 1567:7 / C13 · Student Radar · Current V3 · Runtime Reviewed`，由历史 `93:1080` 非破坏性克隆而来；历史画板继续保留。
- C13 使用真实教练成员名单直接选择学员，并以真实雷达维度、评估区间、维度进度和能力评语渲染；页面不写入 Figma 示例姓名或分数。
- 真实账号返回 8 个维度，而在线示例为 6 个维度；小程序增加密集维度状态的雷达卡片高度和 `24rpx` 顶部留白，避免标签进入标题区，六维状态不变。运行截图 `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788254323282-8cjn90.jpg` 为严格 `375×812`。

## 2026-09-01 C15 能力评估录入迁入 Current Coach V3

- 当前 V3 Figma 节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 1568:7 / C15 · Assessment Entry · Current V3 · Runtime Reviewed`，由历史 `93:1132` 非破坏性克隆而来；历史画板继续保留。
- 小程序 `/pages/coach/assessment-entry/index` 按真实 `templateId` 动态显示指标组、学员和录入字段，不把设计样例成绩或队伍名称写入代码。当前生产模板 `assessment-template-technical` 只有“技术能力”一组可写指标，Figma 三组胶囊属于不同模板状态，按真实契约保留动态差异。
- WeChatIDE MCP 真实截图 `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788254598753-fk13ie.jpg` 为严格 `375×812`；全屏顶栏、动态分组、真实学员卡、进度轨道和固定教练 TabBar 均可见。

## 2026-09-01 C15 V6 指标卡录入收口

- 当前唯一视觉基准切换为 Coach V6 `zZ6wKyOHKcO4UYXDd9jGwv / 1623:2`（原生 `375×812`），不再以历史长画板 `93:1132` 作为当前实现稿。
- 小程序 `/pages/coach/assessment-entry/index` 已改为单学员录入结构：训练球队上下文、当前学员指标卡、原始值输入、标准分只读显示、全员头像切换、保存草稿和统一提交。所有字段、学员、模板版本和提交结果仍来自真实 API；`score_0_100` 的标准分直接沿用后端同口径输入值，其他值在服务端归一化前显示“待提交”，没有在前端发明换算公式。
- 微信开发者工具 MCP 重新编译 WXML/WXSS 并取得严格 `375×812` 截图：`C:\Users\ASUS\AppData\Local\Temp\c15-runtime-v6-20260901-final.png`。当前真实 `assessment-template-technical` 只返回 1 个可写指标，因此指标卡数量少于 Figma 示例的 3 项，按真实数据差异保留，不补造示例指标。
- 验证：C15 定向 Vitest `9/9`、小程序 `tsc --noEmit`、WXML 编译、WXSS 编译均通过；截图只写入系统临时目录，未写入桌面或工作区。

## 2026-09-01 C15.1 评估提交结果迁入 Current Coach V3

- 当前 V3 Figma 节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 1569:7 / C15.1 · Assessment Submit · Current V3 · Runtime Reviewed`，由历史 `93:1163` 非破坏性克隆而来；历史画板继续保留。
- 小程序 `/pages/coach/assessment-submit/index` 只接收评分提交循环确认后的真实标题、人数和日期，显示成功结果，不额外发起伪请求或推断后端结果。
- WeChatIDE MCP 真实截图 `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788254788264-hm55su.jpg` 为严格 `375×812`；成功图形、动态标题、汇总卡、两个后续动作和教练 TabBar 均存在。

## 2026-09-01 C9 队伍详情迁入 Current Coach V3

- 当前 V3 Figma 节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 1570:7 / C9 · Team Detail · Current V3 · Runtime Reviewed`，由历史 `93:924` 非破坏性克隆而来；历史画板继续保留。
- 小程序 `/pages/coach/team/index` 使用真实队伍摘要、学员名单和教练组数据，页面只提供查看队伍和进入学员雷达的能力，不在前台新增球队。
- WeChatIDE MCP 真实截图 `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788254946742-0k8wr3.jpg` 为严格 `375×812`；Hero、三项统计、四列学员名单、教练组和固定教练 TabBar 均可见。

## 2026-09-01 C10.1 覆盖预览迁入 Current Coach V3

- 当前 V3 Figma 节点为 `zZ6wKyOHKcO4UYXDd9jGwv / 1571:7 / C10.1 · Coverage Preview · Current V3 · Runtime Reviewed`，由历史 `93:983` 非破坏性克隆而来；历史画板继续保留。
- 小程序 `/pages/coach/coverage/index?eventId=<activityId>` 展示真实学员覆盖比例、各维度进度、待同步状态和底部确认动作；“确认”只执行本地返回，不伪造覆盖写入。
- WeChatIDE MCP 真实截图 `C:\Users\ASUS\AppData\Local\Temp\wechatide-viewport-screenshot-1788255066036-einuxo.jpg` 为严格 `375×812`；真实数据比 Figma 示例更密集，但底部确认栏、TabBar 和内容结构未发生遮挡。

## 维护规则

1. 修改在线 Figma 前，先读取目标页面与画板节点，确认文件 Key、页面名、画板名和节点 ID。
2. 修改后必须重新读取关键节点，并生成 Figma 截图检查文字、布局和可见性。
3. 未获得可信 DevTools 或真机 `375x812` 截图前，不得宣称小程序实现与 Figma 完全一致。
4. 需要将在线设计同步回交接包时，先导出本地 `.fig`，再更新此文档中的导出时间、文件大小与 SHA-256。

# 2026-09-01 Parent/Coach V4 产品改版页面

- 在线 Figma 唯一文件仍为 `zZ6wKyOHKcO4UYXDd9jGwv`。为解决历史稿、组件稿和多轮改版集中导致的查找混乱，新增两个独立的顶层 Page；原 `05 Parent Generated`、`06 Coach Generated` 和 V3 页面均保留，不覆盖、不删除。
- Parent V4 页面：`12 Product Redesign · Parent V4`，节点 `1575:28`；总览 `1575:29`。当前画板按 `P1 周态 → P1 月历展开 → P1 空态 → P4 成长 → P5 能力雷达 → P8 发现 → P7 我的孩子` 排列，入口顺序固定为“日程 / 成长 / 发现 / 我的孩子”。
- Coach V4 页面：`13 Product Redesign · Coach V4`，节点 `1576:2`；总览 `1576:3`。当前画板按“全队日程 → 工作台/点名/比赛/战术板 → 训练管理/选队 → 队伍/训练内容/覆盖 → 测评链 → 我的”排列。
- Coach V4 的产品约束在总览首屏再次写明：日程只展示教练权限内所有球队课程，不提供选队；“我的球队 / 选择球队”只在训练管理 C8/C8.1 中出现，选择结果影响训练、点名、测评和统计。
- V4 画板均由已审查 V3 节点非破坏性克隆，主页面尺寸保持 `375×812`；本次只做 Figma 信息架构整理，不改变 API、数据库或小程序代码。
- Coach V4 已补入 C6.1 比赛事件录入：`C6.1 · Match Event Add · V4`，节点 `1580:7`，来源在线节点 `93:827`。运行态路由为 `/pages/coach/match-event-add/index?eventId=<activityId>`；事件类型、球员名单和可写字段继续以真实 API/会话能力为准。
- Coach V4 的训练管理边界已完成运行复核：C8 `1576:563` 与 C8.1 `1576:670`。C8 只承载所选球队的训练管理数据，C8.1 为独立全屏选队页；日程 C1 不提供选队。当前真实账号仅分配一支球队，运行态数量差异不视为视觉缺陷。
- Coach V4 的全队日程已完成运行复核：C1 `1576:43`。C1 只按日期范围展示教练权限内所有球队课程，不保存或读取训练管理的选队上下文；真实日期无课程时显示真实空态。

## 2026-09-01 Parent/Coach V4 交付目录整理（当前总览）

- 为避免 V4 页面内部继续混入旧副本，新增并回读两个当前交付总览：Parent `V4 Product Index · Parent`（`1588:2`）和 Coach `V4 Product Index · Coach`（`1589:2`）。它们只承担导航和治理说明，不是小程序页面。
- Parent V4 当前首批画板补齐为：P1 周态 `1588:27`、P1 月历展开 `1588:200`、既有 P1 空态 `1575:518`、P4 `1575:642`、P5 `1575:802`、P8 `1575:948`、P7 `1575:1066`。P1 三态均为 `375×812`，入口顺序保持“日程 / 成长 / 发现 / 我的孩子”。
- Coach V4 当前首批主链补齐为：C1 全部球队日程 `1589:27`、C2 工作台 `1589:166`、C4 出勤管理 `1589:281`、C7 战术板 `1589:396`、C8.1 选择训练球队 `1589:461`；既有 C6、C8、C9、C10、测评链和 C16 继续保留。C1 不提供选队，C8/C8.1 才提供训练球队上下文。

## 2026-09-01 Parent/Coach V5 改版入口

为避免 V3/V4 与历史稿继续混在同一交付区，新增两页 V5 作为后续实现入口；旧页面不删除、不覆盖：

- Parent V5：`14 Product Redesign · Parent V5`（页面 `1599:973`），总览 `1599:974`；关键画板：P1 周态 `1599:999`、P1 月历 `1599:1172`、P4 `1599:1463`、P5 `1599:1623`、P8 `1599:1769`、P7 `1599:1887`。
- Coach V5：`15 Product Redesign · Coach V5`（页面 `1599:2`），总览 `1599:3`；关键画板：C1 全队日程 `1599:28`、C2 `1599:167`、C4 `1599:282`、C6 `1599:397`、C7 `1599:483`、C8 `1599:548`、C8.1 `1599:655`。
- V5 交付边界：日程页面展示账号权限范围内所有球队课程，绝不放球队选择；训练管理页面才显示“我的球队 / 切换球队”，选择结果只作用于训练、点名、测评和统计。
- V5 页面是从已回读的 V4/V3 画板非破坏性克隆的清晰目录，不代表运行态视觉已经全部通过；后续仍必须逐页执行小程序实现和真实 `375×812` 微信开发者工具截图对照。
- 新增节点均已通过 Figma MCP 截图回读：Parent/Coach 总览、P1 周态/月历、C1、C8.1 均为原生尺寸 `375×812`（总览为 `1280×480`），未删除旧页面和历史画板。

## 2026-09-01 Parent/Coach V6 当前改版入口

- 唯一在线 Figma 文件仍为 `zZ6wKyOHKcO4UYXDd9jGwv`。已验证浏览器中的当前协作者对该文件具有文件级编辑能力；但当前连接的 Figma MCP 账号 `haokun3127` 团队席位为 `View`，只能稳定读取，不能据此宣称 MCP 可写。历史 V3/V4/V5 与原画板均未覆盖、删除或移动。
- Parent V6：`16 Product Redesign · Parent V6`（页面 `1609:2`）；总览 `1609:4`。当前交付画板依次为：P1 周日程 `1610:2`、P1 月历展开 `1610:175`、P4 成长 `1610:466`、P5 能力雷达 `1610:626`、P8 发现 `1610:772`、P7 我的孩子 `1610:890`。
- Coach V6：`17 Product Redesign · Coach V6`（页面 `1609:3`）；总览 `1609:29`。当前交付画板依次为：C1 全部球队日程 `1610:1323`、C2 训练工作台 `1610:1462`、C4 点名 `1610:1577`、C6 比赛记录 `1610:1692`、C6.1 添加比赛事件 `1894:2`、C6.2 比赛草稿提示 `1924:12`、C7 战术板 `1610:1778`、C8 训练管理 `1610:1843`、C8.1 选择训练球队 `1610:1950`、C3 变更活动 `1612:2`、C10 三层训练内容 `1615:2`、C11 测评任务 `1617:2`、C14 能力评估 `1619:2`、C15 指标录入 `1623:2`、C9 队伍详情 `1900:2`、C10.1 覆盖预览 `1903:2`、C12 测评录入 `1905:2`、C12.1 草稿恢复 `1907:2`、C13 学员雷达 `1909:2`、C15.1 评估提交 `1913:2`、C16 我的 `1915:2`、C16.1 权限范围 `1917:7`、C16.2 私教兴趣 `1919:7`、C16.3 账号设置 `1921:7`、C16.4 帮助中心 `1923:7`。
- 产品边界：C1 日程展示当前教练被授权球队的全部课程，不放任何选队控件；只有 C8/C8.1 可选择训练球队，所选球队作为训练、点名、测评与统计上下文。
- C6.1 V6 为 C6.1 V4（`1580:7`）的非破坏性副本；在事件类型网格中补齐真实能力契约所需的“扑救”和“抢断”，新副本节点为 `1894:2`，尺寸 `375×812`。来源和历史画板保留不动，证据见 `.trellis/tasks/09-01-dual-role-v3-page-restructure/research/c6-1-v6-browser-edit-2026-09-02.md`。
- C9 V6 为现有当前稿（`1570:7`）的非破坏性副本，节点 `1900:2`，来源和历史画板保留不动；Figma 回读原生尺寸为 `375×871`，运行态长页按首屏与滚动段证据验收。
- C10.1 V6 为现有当前稿（`1571:7`）的非破坏性副本，节点 `1903:2`，来源和历史画板保留不动；Figma 回读原生尺寸为 `375×812`，运行态覆盖数量和比例按真实 API 验收。
- C12/C12.1 V6 为现有当前稿（`1565:7`/`1566:7`）的非破坏性副本，节点 `1905:2`/`1907:2`，暂标“待运行态同步”；旧稿和历史画板保留不动，证据见任务研究记录。
- C6.2 V6 为旧稿 `93:858` 的非破坏性副本，节点 `1924:12`，位置 `x=870,y=5710`，尺寸 `375×812`；旧稿保留。在线稿仍保留遮罩弹窗示例，运行实现以当前产品规则的全屏页内提示卡为准，证据见 `.trellis/tasks/09-01-dual-role-v3-page-restructure/research/coach-c6-1-c6-2-reaudit-2026-09-02.md`。
- C13/C15.1/C16–C16.4 的 Coach V6 节点已完成在线截图回读：C13 `1909:2`（`375×908`）、C15.1 `1913:2`（`375×812`）、C16 `1915:2`（`375×812`）、C16.1 `1917:7`（`375×812`）、C16.2 `1919:7`（`375×812`）、C16.3 `1921:7`（`375×812`）、C16.4 `1923:7`（`375×924`）。证据和临时目录路径见任务研究记录 `c13-c16-visual-reaudit-2026-09-02.md`；长页面仍按首屏与滚动段验收。
- 已对 Parent/Coach 总览、P1、C1、C8 进行 Figma MCP 回读与截图复核；主页面均为 `375×812`，总览为 `1280×480`。本轮只整理在线设计入口，尚不等同于每个小程序运行态均已验收；后续实现和验收必须以 V6 节点为准。

## 2026-09-02 双端可点击性尺寸基准

- Parent V6 `1609:2` 与 Coach V6 `1609:3` 已同步一轮可点击性调整：可见小字号文案按 9–16px 范围小幅上调；铃铛动作框为 40×40px；TabBar 可视项保持 70px 外壳并扩大内部命中区域；周/月切换和返回箭头提高可见尺寸。
- 抽查节点 P1 `1610:2`、C1 `1610:1323` 回读截图均为原生 `375×812`，未发现画板越界。小程序对应共享实现见任务研究记录 `touch-target-size-unification-2026-09-02.md`。

## 2026-09-02 家长 P1 星期标签基准

- Parent V6 P1 周态节点 `1610:2` 的周一至周日标签已统一为中文“一、二、三、四、五、六、日”；展开月历节点 `1610:175` 原有中文星期标签保持不变。
- 小程序 `/pages/parent/schedule/index` 的 `weekShort` 必须按 `getUTCDay()` 使用 `['日','一','二','三','四','五','六']`，再由周一开头的日期序列展示；禁止恢复英文星期缩写。
-
## 2026-09-01 C15 V6 首屏高度基准复核

- 在线 C15 当前基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 1623:2`，原生尺寸 `375×812`；元数据显示指标面板固定 `310px` 高，球员列表从 `y=502` 起，教练 TabBar 从 `y=742` 起，首屏不展示底部提交条。
- 小程序真实模板只有 1 项可写指标时，面板也保持 `min-height: 620rpx`，避免“保存所有”按钮提前进入首屏并被 TabBar 截断；指标数量、名称和分值继续取真实 API。
- 修复后真实证据为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\c15-after-min-height-script-20260901.png`，规范脚本发布尺寸严格 `375×812`，已与在线节点结构对照通过。
- 浏览器文件级权限已核实为“可编辑”；Figma MCP `whoami` 的团队席位仍为 `View`。后续若需写入设计，先区分浏览器编辑权限与 MCP 写权限，不以 `m=dev` 参数判断权限。

## 2026-09-02 C15 V6 权限与视觉复核补充

- 在线节点 `zZ6wKyOHKcO4UYXDd9jGwv / 1623:2` 当前可由 Figma MCP 正常读取并截图，原生尺寸为 `375×812`；浏览器文件级共享权限仍显示当前账号可编辑。
- MCP `whoami` 当前显示账号 `haokun3127（1039746386@qq.com）` 的团队席位为 `View`。这只说明 MCP 连接的团队席位状态，不能推翻浏览器文件级可编辑结果；`m=dev` 仅是 Dev Mode 参数。
- C15 修复后证据 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\c15-after-min-height-script-20260901.png` 已与 `1623:2` 完成逐模块对照，面板不收缩、提交条不侵入首屏，真实 API 数据差异按契约保留。

## 2026-09-02 Coach C1 课程卡信息层级修正

- 当前 C1 唯一在线基准仍为 `zZ6wKyOHKcO4UYXDd9jGwv / 1610:1323`，标题为“全部球队课程/比赛安排”。该节点已完成并回读：隐藏标题后的说明文字，移除课程卡右侧教练姓名胶囊，课程标题和场地允许自然两行展示；在线回读截图为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence\\figma-c1-course-card-fix-1610-1323-20260902.png`，原生 `375×812`。
- 小程序 `/pages/coach/schedule/index` 已同步：活动类型由真实 `event.type` 预计算为“训练/比赛”，课程卡不再显示本人姓名，标题/地点不再使用单行省略。教练身份姓名仍只显示在页面顶栏。
- 运行态证据为微信开发者工具 MCP `automation_viewport_action.screenshot`：`C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-c1-viewport-20260902.png` 和 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-c1-next-week-20260902.png`，均严格 `375×812`；当前真实日期范围只有训练活动，比赛分支由 C1 定向测试覆盖，不以 Figma 样例补造 API 数据。
- C1 定向测试 `23/23`、TypeScript、WXML/WXSS 编译和限定路径 `git diff --check` 均通过。`simulator_screenshot` 兼容入口本轮出现白屏，不能作为验收证据；同一 MCP 会话的 viewport 像素截图有效，通道差异已记录在任务研究文件。

## 2026-09-03 课堂训练评测与学期测评入口

- 本批读取在线 Coach V6 C2 节点 `1610:1462`，以其中的固定顶栏、深色课程信息卡、出勤上下文和全屏页面边界为课堂训练评测入口的结构参考；C11 `1617:2` 与 C15 `1623:2` 仍分别是测评任务和学期评估录入的视觉基准。
- 当前 Figma MCP 只能读取，未写入或声称写入在线稿。新增小程序页面 `/pages/coach/training-assessment/index` 沿用 C2 的全屏工作台层级，但真实训练项目、已到学员、球队和场地均来自 API，不能以设计示例文案替代。
- 页面职责已明确：C2 的“课堂评测”只保存本堂训练内容评分；学期评估只能从 C11 的任务卡进入 C15，避免训练/学期两类数据在视觉和路由上混淆。

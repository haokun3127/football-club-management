# 核心演示闭环 · 进度跟踪

## 2026-08-31 三层训练内容与截图产物隔离收口

- 教练端训练内容选择已按指标视图组织为“一级核心能力 → 二级子项 → 三级子项 → 训练动作”；保留旧 `projects` 契约，训练动作展示中文名称、难度、剂量、时长和动作要点，并支持按球队上下文读取。
- 训练动作保存链路已完成真实读回验证：`PUT training-projects → session plan → training session → GET workbench` 能返回同一组稳定动作 ID；SQLite 文件重开回归也通过，避免把本地页面选中状态误当作持久化成功。
- 微信开发者工具 MCP 当前截图输出为真实 `375×812`，默认目录为 `%TEMP%\cq-talent-visual-evidence`；本轮桌面根目录没有新截图。项目历史 `.trellis/tasks/**/research` 图片属于验收证据，不作为临时文件清理。
- 验证结果：全仓 `pnpm run check` 通过（domain `21/21`、小程序 `452/452`、API `125/125`）；训练持久化定向测试 `2/2`；截图工具回归 `14/14`；脚本语法检查通过。
- 当前仍保留的微信开发者工具 `appid missing` 控制台错误来自 DevTools 自身的 SDK 报告请求，不影响项目页面、API 请求或截图；未通过伪造 AppID 来掩盖该环境日志。

## 2026-08-29 C7 战术板按在线稿收口

- 在线唯一基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 1040:9`。实现已移除副标题、比赛标题/保存状态重复行，改为在线稿的左侧“本场比赛阵型”与右侧阵型胶囊；球场收口为 16px 左右边距，全部球员改为四列圆形头像、姓名和“首发上场/候补上场”状态。
- 保留真实教练 API 名单、阵型切换、场上/候补拖拽、保存与重新读取；没有新增号码、角色或示例数据。WXML 未使用 JS 数组方法。
- 验证：C7 定向 Vitest `8/8`；WeChatIDE MCP 取得真实教练路由截图，原始截图为 `381×823` 外壳栅格，按现有归一化规则生成严格 `375×812` 的 `tmp/c7-after-height-normalized.png`，并与在线稿 `tmp/figma-c7-live.png` 做并排对照；WXML/WXSS 编译成功。在线稿与运行态的系统状态栏、真实姓名/人数及“未修改时保存按钮禁用样式”属于运行状态/真实数据差异。

## 2026-08-29 家长比赛记录页重复导航修复

- 复查 `pages/parent/match-history/index` 的真实运行截图时发现页面同时渲染微信原生导航和自定义 `page-nav`，造成顶部多出一层导航与明显留白。
- 根因是该页 WXML 已使用自定义导航，但 `index.json` 未声明 `navigationStyle: custom`。新增同页回归测试后先得到预期失败，再补齐配置；定向测试最终 `5/5`。
- 本批只修改比赛记录页配置和测试，不改变 API、角色/session 或比赛数据。当前模拟器是 coach 会话，无法在本批重新取得 parent 角色截图；修复后的家长视觉证据需在真实 parent 会话重新编译后复拍。

## 2026-08-29 C8 训练管理页新鲜运行复核

- 在线唯一 Figma 基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:896`；真实教练会话打开 `pages/coach/training/index` 并取得严格 `375×812` 截图 `tmp/goal-c8-training-runtime-final-20260829.png`。
- 顶栏、深色四项统计卡、训练计划/能力评估/学员管理/测评任务分栏、训练卡片和固定教练 TabBar 均可见；训练名称、日期、人数、统计值由真实 API 返回，与 Figma 示例不同按动态数据差异处理。
- 当前路由回读为 `/pages/coach/training/index`，模拟器 console 过滤 `error|exception|fail|undefined|wx:else|route is not defined|appid missing` 无命中；本轮未修改业务代码或 API。

## 2026-08-28 P2.2 / C4 在线 Figma 复核

- P2.2 `93:198` 在线稿与真实家长会话复核通过：顶栏、状态胶囊、活动卡、信息行、参与孩子、教练、底部说明和家长 TabBar 均存在且位置关系一致；活动标题/状态/场地等差异来自真实 API 数据，未伪造 Figma 示例。
- C4 `93:665` 在线稿与真实教练会话复核通过：首屏和滚动底部均为严格 `375×812`，深色训练摘要、全员到场/清空、八名学员状态、人数汇总和固定教练 TabBar 均无遮挡；真实长元数据换行属于数据长度差异。
- 详细证据：`.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/p22-c4-reaudit-2026-08-28.md`。

## 2026-08-28 P2.1 / C3 在线 Figma 复核

- P2.1 `93:170` 经在线稿与真实家长会话 `375×812` 复核，发现活动详情本地顶栏的返回槽位为 `80rpx` 且原生分享按钮默认占满布局，导致标题从错误位置开始并显示为“比…”。已在 `pages/parent/event/index.wxss` 最小修复为 24px 返回槽位及 `width:auto; min-width:0; margin:0`，重新截图后“比赛详情”完整显示，标题 x=40，分享按钮实际宽 56px。
- P2.1 定向测试按先红后绿完成：修复前 `1 failed / 4 passed`，修复后 `5/5`；小程序 TypeScript 检查退出 0。运行截图与 Figma 在线截图保存在 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-28/`。
- C3 `93:634` 重新读取在线稿，并用真实家长→教练角色切换后的活动变更路由取得首屏和底部 `375×812` 截图；通知卡、保存动作和教练 TabBar 未发现结构或遮挡缺陷。示例日期/场地/家长数与真实 API 不同，按数据状态豁免记录，未伪造数据。
- 详细记录：`.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/p21-c3-reaudit-2026-08-28.md`。

## 2026-08-28 家长端比赛历史列表

- 新增 `pages/parent/match-history` 全屏比赛记录页，复用在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 499:18 / P4.2 Training History` 的返回顶栏、列表卡、左侧状态条和信息层级；比赛内容结合 `zZ6wKyOHKcO4UYXDd9jGwv / 93:170 / P2.1 Match Detail` 的比赛语义。在线文件没有独立比赛历史画板，已明确记录为组合设计，不宣称独立画板逐像素复原。
- 数据来自现有家长日程 BFF，按当前会话学员过滤，180 天请求按 31 天分块，按活动 ID 去重并按开始时间倒序；比赛摘要增加真实对手、比分和状态投影，缺失比分显示“比分待同步”，不填充 Figma 示例事实。
- 成长页新增“比赛记录 / 查看›”入口，点击列表行进入现有家长 P2.1 比赛详情；无数据和请求失败均有明确页面状态。
- 验证：比赛历史定向 Vitest `4/4`，家长相关/API 回归 `25/25`，小程序全量 Vitest `65 files / 395 tests`，小程序 TypeScript、WXML/WXSS 编译、`git diff --check` 通过。WeChatIDE 模拟器真实截图 `tmp/goal-parent-match-history-final.png` 为 `563×1218` 原始栅格，对应逻辑 `375×812`；已复核真实比赛 `4:2`、无比分状态和完成状态布局。

## 2026-08-28 C3 活动变更时间控件同步在线稿

- 在线唯一基准重新读取为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:634 / C3 Activity Change`；当前稿的“新时间”是一个整宽 299×44px 输入框，右侧为 16×16 日历图标，不显示重复的“日期/时间”尾缀。
- `pages/coach/event-change` 删除重复尾缀，将日期与时间两个真实选择器收纳到同一视觉输入框的左右透明触控区域；`dateTimeDisplay` 由 TypeScript 预计算，真实日期/时间选择与变更申请 payload 保持不变。
- 新增本地图标 `assets/icons/c3-calendar.svg`，未使用远程 Figma 资产或示例日期/场地/家长数量。
- 验证：C3 定向 Vitest 先红后绿，最终 `8/8`；小程序 TypeScript、WXML/WXSS 编译、`git diff --check` 通过。WeChatIDE MCP 真实模拟器截图 `tmp/goal-c3-coach-after-combined-time.png` 与 `tmp/goal-c3-coach-bottom-after-combined-time.png` 均严格 `375×812`，分别复核首屏和滚动后的通知卡。

## 2026-08-20 家长端四连修（P2 导航/P4 死链×2/P5 雷达）

- P2 训练详情 topbar：标题 44rpx 居中 → 36rpx 左对齐（设计稿即左对齐，居中版受原生胶囊挤压视觉偏移）。
- P4 死链修复：「成长足迹·更多›」原本无 bindtap；「训练历程·查看›」错链到课时与保障页。新建两个真实页面 `pages/parent/milestones/`（足迹列表）与 `pages/parent/training-history/`（训练历程列表），数据来自日程接口（服务端单次上限 31 天，分块并行拉取近 180 天）。在线稿补板 P4.1（499:2）/P4.2（499:18）。
- P5 雷达按用户裁决改教练端干净样式（default 几何、纯标签无数值徽标）；在线稿删除 Radar Canvas 内 6 个 Chip 徽标，离线缓存已同步。
- 验证：门禁 exit=0（19/365/112）；两新页真实截图均有真实数据（足迹 3 条/历程 7 条）。
- 附带披露：本次 `git add pages/parent/` 扫入了上一棒 agent 的 private/private-success 4 个小改（role-tabbar active child→discover 修正），内容无害且正确，已随提交带上。

## 2026-08-20 C11 测评任务新增做真 + 在线稿补板

- 后端：`POST /coach/assessment-tasks`（模板校验+日期不倒挂校验，`saveAssessmentTask` 真持久化到 SQLite）；GET 响应新增 `templates` 供表单选择器。
- 小程序：新页 `pages/coach/test-task-create/`（名称+模板+起止日期+校验+失败回滚）；C11 列表「新增」两处入口接通，返回自动刷新。
- 在线 Figma 补板 `C11.1 Assessment Task Create`（487:2，教练页 4:7），离线缓存 `c11-1-assessment-task-create.png` 与 frame-map 已同步。
- 验证：门禁 exit=0（19/365/112）；生产部署后真实 POST 创建「8月下旬技术测评」并在列表读回 ✅；表单页截图正常。
- 注意：部署重启会清空内存 session plan（今晚 19:00 演示的训练内容已重放）。

## 2026-08-20 「设计目标模式全做」批次（g1-g7 完成，g8 已排期）

- **C2 训练内容进度卡**：按计划时长×当前时间推导每项 完成/进行中/待开始（诚实推导非虚构）；今晚演示事件（控球与盘带训练 19:00-20:30）已通过真实 PUT 接口挂上 6 项训练内容。关键坑：session plan 仅存内存，API 重启即失，演示前需重放 PUT（脚本见 tmp/prod-verify）。
- **活动时间墙钟约定**：生产活动时间按「北京墙钟存 Z」存储（展示端直接截字符串）。C2 页 `parseEventTime` 换算真实时刻（字面-8h）用于进行中/倒计时/进度推导——否则今晚 19:00 北京不会触发进行中。测试夹具同步按墙钟约定。
- **C16.2 私教兴趣全链路**：迁移 0013（accepts_private_lessons + availability_json）+ GET/PUT `/coach/preferences` + 页面开关/时段格可交互持久化（设计稿绿开关、周一至周五默认全选）。生产部署 c308be4 已读回验证。
- **教练团队微信联系**：迁移 0014（wechat_id）+ coach-team 接口投影 + 卡片「微信联系」按钮复制微信号到剪贴板；生产 16 名教练已补演示微信号。
- **战术板占位清除**：当前权威设计 C7 CODE MVP（233:2）无工具栏/分享按钮 → 删除 LEGACY 遗留工具栏（绘制/撤销/移动/清除/分享）与两个「暂未开放」toast。
- **邀请好友=真实分享**：P2 比赛详情改 `button open-type="share"` + onShareAppMessage（带比赛标题与页面路径）。
- **日程按天筛选做真**：ActionSheet 按类型过滤（全部/训练/比赛/其他）。
- **内容中心/场地搜索做真**：可展开搜索栏，按名称/标题/地址关键词过滤。
- **g8**：19:06 已排一次性 cron（c2-inprogress-verify）自动截图验证 C2 进行中态（计时/结束训练/进度混合态）。
- 门禁全程 exit=0（最新 19/361/111）；生产 API 部署至 g3 版（wechat_id），health 200。

## 2026-08-20 C2 用户改版同步：Tab 栏移至页底 + 全端在线稿新鲜度核查

- 用户在线改版 `93:606`：TabIconsOverlay 从页顶（y=88）移到页底（y=750），顶部导航后直接进入深色 hero。小程序同步：删除页顶 in-flow c2-route-tabs 与 openCoachRoot，页底接入 `role-tabbar`（coach/schedule），body 底 padding 补 180rpx。
- 同日修复：hero 大时间字号 70rpx→104rpx（读设计节点 fontSize=52px ExtraBold，之前目测误判为一致，用户指出后纠正）。
- 全端在线稿新鲜度核查：4:7 全部 27 块业务板重新 get_screenshot 并与离线缓存像素 diff——除当日有意修改的 C2/P8/P5 外全部一致；C3/C4/C9/C12/C13/C14/C15/C16.4 高度≠812 属正常（内容超高画板），未被删除。证据留档 `tmp/figma-audit-now/`（未入库）。
- 验证：门禁 exit=0（19/355/110）；MCP 真实截图与用户改后在线稿比对：顶部无 Tab、底部 Tab 栏、hero 结构全部一致 ✅。已知豁免：设计稿「训练内容进度」卡因无 per-item 进度数据模型，运行态显示「流程状态」卡（真实数据）。

## 2026-08-19 C2 工作台 hero 改日程页同款版式（用户裁决，在线稿已同步）

- 用户裁决：C2 深色卡改成日程页（C1/P1）hero 样式。新结构：顶部「日期·周几 / 重庆天才」小字行 → 超大开始时间（进行中时切换为已进行时长+时钟图标）→ 标题 → meta（队伍 · 场地）→ 底部 pills（出席 X/X 人 + 状态）。
- 在线 Figma `93:606` 已同步改版（Session Header 垂直自动布局重排：TopRow/大计时/标题+meta/pills；删除「学分 0点」chip）；离线缓存 `c2-activity-workbench.png` 已用新在线截图覆盖。注意：use_figma 代码抛错会整体回滚（首个脚本自检误触发导致部分修改丢失，已按节点树核实后补齐）。
- 同时修复：副标题截断与队伍名重复（chips 去重、meta 行完整显示）；`formatTimeOnly` 加入 presentation 工具库。
- 验证：门禁 exit=0（19/356/110）；MCP 真实 375×812 截图与改后在线稿逐区比对一致 ✅。

## 2026-08-19 七个测试账号演示数据充实（客服预览）

- 受控直写生产库（先备份 `backups/api-pre-enrich-20260819.sqlite`）：每个账号球队在上周（8/10-8/16）与本周（8/17-8/23）各铺 6 天活动（5 训练+1 周末教学赛，确定性 id、INSERT OR IGNORE 可重入）；共新增 69 场活动、642 条参与记录（过去活动含 present/late/absent/leave_requested 混合状态）、353 条课时扣减流水（余额按学生逐条递减）、14 条私教申请（pending/confirmed 各半，匹配真实表结构 coach_name/date/time_slot/goals_json）。
- 读回：每队上周/本周均 6 天有数据（≥5 达标）；compose restart api 后 health 200；新建 parent 会话公网读回 parent/calendar 与学生 schedule 均返回本周 8 场活动。
- 脚本留档：`tmp/prod-verify/enrich-accounts.cjs`、`enrich-lesson-req.cjs`、`enrich-verify.cjs`（未入库，tmp 约定）。

## 2026-08-19 P8 训练攻略独立列表页

- 用户裁决：「训练攻略」做独立列表页（只列攻略类文章）。新增 `pages/parent/guide/`（列表卡复用内容页文章卡样式，点击进入文章详情页）；内容中心「训练攻略」快捷卡由滚动兜底改为打开该页，pageScrollTo 兜底死代码随之删除。无对应在线 Figma 画板，版式为按现有页面规范的保守补全。
- 验证：门禁 exit=0（19/357/110）；MCP 真实 375×812 截图确认导航/攻略卡（2026秋季训练计划）正常渲染（`C:\Users\ASUS\AppData\Local\Temp\p8-guide-list.png`）。

## 2026-08-19 P8 快速入口三页顶栏对齐在线稿

- 用户反馈：快速入口各页 topbar 不对。对照在线稿（venues `93:416` / help `93:444` / coaches `93:472`）：设计均为白底、返回箭头+左对齐标题；venues 右侧搜索图标、help 右侧更多、coaches 右侧无。
- 缺陷与修复：venues 标题 `text-align:center`→左对齐；coaches 标题 44rpx 居中→36rpx 左对齐；help 原本已符合（无需改）。右侧的「…+圆圈」是微信原生胶囊，非缺陷。提交（本地，未推送）。
- 验证：门禁 exit=0（19/352/110）；WeChatIDE MCP 真实截图逐页对照在线稿——标题左对齐、字号一致、右侧动作符合设计 ✅（`nav-cmp2` 四条横条比对）。

## 2026-08-19 P8 最近文章可点开 + 文章详情页（新页面）

- 用户反馈：最近文章应可点击打开。新增 `pages/parent/article/` 详情页（导航+标题卡+正文分段，段落 TS 预计算）；`ContentArticle` 增加可选 `body` 字段（契约响应本就 permissive，无需改 schema）；两个种子文件为 4 篇文章补真实正文；内容中心文章卡 bindtap → 详情页。
- 部署链路发现并修复一个真实缺陷：`docker-compose.yml` 的 data-init `chown -R` 会被 0700 的 `secure-backups`（2026-08-18 安全导入产物）卡住导致整个部署失败 → 改 `find -prune` 跳过，compose 修复已随部署同步到服务器。
- 部署：生产已升级到 `dee875d`（构建+重建+health 200）；生产读回确认 4 篇文章均带正文（body 长度 111–133）。
- 验证：门禁 exit=0（domain 19 / miniprogram 352 / api 110）；WeChatIDE MCP 真实 375×812 截图 `C:\Users\ASUS\AppData\Local\Temp\p8-article-detail-2.png` 确认导航/标题卡/三段正文正常。首轮截图曾暴露详情页缺 page-nav 样式（巨型箭头）与生产无正文两个缺陷，均已修复并复验。
- 注意：文章详情页无对应在线 Figma 画板（P8 仅列表），详情页版式为按现有页面规范的保守补全。

## 2026-08-19 P8 内容中心去除重复分类胶囊（用户裁决）

- 用户裁决：内容中心顶部「分类导航」胶囊与下方「快速入口」功能重复（点击效果一致），移除胶囊区。**在线 Figma `93:388` 已同步删除 Category Section（196:1068）并将下方三区块上移 87px，回读截图确认无残留空白**；离线缓存 `docs/design/reference/figma/p8-content-center.png` 已用新在线截图覆盖。
- 代码：`pages/parent/content` 删除 pills UI 与 `selectCategory/applyFilter/openFeatured`，文章列表恒展示全部；「训练攻略」快捷卡由分类过滤改为 `pageScrollTo` 滚动至文章列表；`types/wechat.d.ts` 补 `pageScrollTo` 声明。提交 `cc9ba99`（未推送，本地 dev 现超前 origin/dev 3 个提交）。
- 验证：门禁 exit=0（domain 19 / miniprogram 347 / api 110 全过）；WeChatIDE MCP 真实 375×812 截图 `C:\Users\ASUS\AppData\Local\Temp\p8-content-nopills.png` 确认无胶囊区、特色大卡居首、快速入口与最近文章正常。注意：同次全量门禁曾见两个 SQLite 重开持久化测试超时（10s/15s 预算），隔离重跑 16/16 通过，判定为并行负载抖动，非回归。

## 2026-08-18 七个独立双角色真机演示账号（已生产导入，真机待验）

- 安全受控导入由 3 个固定槽位扩展为 7 个：每个运行时手机号均对应同一 club 内独立的 `parent + coach` 会籍、家长档案、教练档案与单独 8 人球队。家长端严格只投影其中 2 名已绑定学员；教练端只可查看本账号所属的完整 8 人阵容，账号之间不共享家长绑定、球队、日程或业务记录。
- 每个账号均准备相对当前导入时间生成的 5 条历史/当前/未来训练与比赛日程、40 条活动参与记录（含到课、迟到、缺席、请假、待确认等状态）、16 条课时流水、8 名队员的 8 维评测原始值/归一化分数/指标记录/血缘、已完成与待进行比赛及 8 条比赛事件、已保存 4-3-3 战术板；两个家长可见学员另有运营档案、保险、私教申请与沟通记录。
- 真实手机号只以私有运行时变量 `SECURE_CQ_TALENT_TEST_PHONE_1` 至 `_7` 注入；仓库、文档、日志、测试输出和提交均不保存其值。2026-08-18 已完成生产受限备份、无写 dry-run、已确认导入和仅 API 重启；内网与 HTTPS 健康检查均返回 200。随后以 14 个短时、精确删除的 bearer 会话对公网 BFF 逐槽回读：每个 parent 仅见 2 名绑定学员、5 条基准日程及 8 项成长指标；每个 coach 仅见本队 8 人、5 条基准日程、8 项雷达指标和已保存的 8 人战术板，响应未投影手机号。真实微信设备授权、首次角色选择及两端切换仍必须由持有对应手机号的测试人员完成，不能以服务端回读替代。
- 本地验证：安全导入聚焦测试 `14/14`、API typecheck/build、串行全仓门禁均完成；全仓结果为 domain `19/19`、小程序 `332/332`、API `108/108`，命令退出码 `0`。仍需在生产执行受限备份（含 SQLite WAL/SHM）→ dry-run → 用户一次性确认 → confirmed import → 仅重启 API → `/health` 与双角色聚合读回。

## 2026-08-12 Secure production identity and isolated dual-role test-account hardening

- Production entrypoint rejects header-only identity; only the explicit local development entrypoint enables header smoke authentication. Phone identity resolution requires a unique active user and active club membership.
- Added the original transactional, fixed-ID, isolated three-account parent/coach import with separate child, guardian, coach-team, calendar, and participant scopes. As of 2026-08-18, the controlled operation is extended to seven slots; test-phone values remain runtime-only and are never returned by the controlled CLI.
- The controlled file-SQLite CLI allows only dry-run import, confirmed import, and confirmed rollback. Dry-run does not migrate or mutate; confirmed import requires a private backup attestation; rollback refuses absent, partial, tampered, or ownership-inconsistent canonical installations.
- Terra xhigh independently reviewed the final security boundaries. Final local verification: domain `8 files / 19 tests`, mini-program `54 files / 306 tests`, API `11 files / 103 tests`, root typecheck, task-context validation, and `git diff --check` all passed. A previous root-script run had a transient mini-program Vitest worker exit despite all assertions passing; an isolated rerun was clean. No server access, production database operation, deployment, restart, or device login occurred in this task.
- 交接更新：`docs/current/agent-handover-2026-08-12.md` 现为 Claude 接手入口；部署认证边界以 `deployment-requirements.md` 与安全账号专项交接为准。旧文档内的生产演示、`X-User-Id` smoke 与部署记录均须按其历史/本地限定解读，不得直接当作当前生产状态。

## 2026-08-12 教练端演示数据交付边界复核

- 已把后端演示数据分层记录：身份、队伍、日历/签到、课时流水、测评指标、比赛和战术板为 SQLite 持久化实体；训练计划/训练课、评测任务、FAQ 和部分观察记录仍由后端 seed 提供；首页统计、雷达与能力总览是派生视图。它们均不是小程序前端 mock。
- 隔离的开发验收 SQLite 可通过 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` 提供 16 名教练可见队员、6 场活动、完整出勤分布、8 维指标、比赛事件和战术名单。生产模式被代码禁止加载该 seed，不能用该变量对共享/生产数据库“补数据”。
- 本轮只读实测 `https://cqtc.pomi.tech/health` 正常且 OpenAPI 含所需教练路由；健康检查不能证明远端库此刻包含全部演示记录。生产数据核查需使用真实教练会话做只读 GET；任何备份、导入、迁移、重启或写入应另建可 dry-run、可回滚的部署任务。

## 2026-08-12 C13 学员雷达安全区顶栏收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1080 / C13 Student Radar`。粉色页内顶栏从 border-box 改为 content-box，确保状态栏安全区不会压缩画板所需的 88px 内容高度；现有 220×180 真数据雷达画布、总分、维度与训练 Tab 未改变。
- 评语区域继续明确显示“暂未同步”，未把 Figma 的教练姓名和示例建议伪造为后端事实。C13 仍只读取当前教练可见的成员与该成员真实雷达指标。
- 验证：C13 聚焦 Vitest `10/10`、小程序 TypeScript 与 `git diff --check` 通过；没有已登录 C13 的可信 `375×812` 截图，不作运行时视觉验收完成结论。

## 2026-08-12 C11 测评任务安全区顶栏收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。C11 的粉色页内顶栏改为 content-box，使真实状态栏安全区不再压缩 88px 内容高度。
- Figma 的“新增”浮动按钮没有对应创建任务 API，故继续不渲染；任务、进度、状态、筛选与可录入判断仍完全来自真实 assessment-task BFF。
- 验证：C11 聚焦 Vitest `7/7`、小程序 TypeScript 与 `git diff --check` 通过；现有 C11 运行截图是先前版本，本批未取得新的可信 `375×812` 截图，故不作运行时视觉验收完成结论。

## 2026-08-12 C9 队伍详情统计语义与布局收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:924 / C9 Team Detail`。C9 的“累计训练”现使用既有 `coach/team.stats.completedTrainingCount`，不再把滚动 30 天 `trainingCount` 误标为累计。非空出勤率沿用真实 BFF 值并使用绿色强调；缺失值保持 `--`。
- 页面同步收口了安全区顶栏的 content-box 高度、深色 hero 无额外阴影、14px 数值和 4 列学员网格间距。Figma 的教练组横滑卡暂未渲染：现有 `coach-team` 为俱乐部内容切片，不能保证是当前教练所辖队伍，不能挪用或伪造岗位/姓名。
- 验证：C9 聚焦 Vitest `5/5`、小程序 TypeScript 与 `git diff --check` 通过；尚未取得已登录 C9 的可信 `375×812` 截图，故不作运行时视觉验收完成结论。

## 2026-08-11 Coach Figma Header Geometry Repair

- Online Figma authority remains `zZ6wKyOHKcO4UYXDd9jGwv`. This batch corrects real layout causes without replacing missing API fields with Figma sample data.
- C2 (`93:606`) now uses the required in-flow coach navigation below the 88px header; routes are whitelist-checked before `reLaunch`.
- C6/C6.1 (`93:796`, `93:827`) use the new soft, left-aligned header variant, preserving existing match read/write contracts.
- C1/C4/C5/C8/C10/C12/C13/C14/C15 custom headers now account for the status inset inside the fixed 176rpx envelope, with capsule clearance applied to right-side controls.
- Commits: `4e60d35`, `61304f4`, `e61ce43`, `4136498`, `a58ed0b`, `bdcb807`, `5037efb`, `2936d68`, `a852ef3`.
- Verification: full workspace check passed — domain `19/19`, mini-program `293/293`, API `85/85`; TypeScript and `git diff --check` passed. No authenticated post-change 375x812 coach capture was available, so this is not a runtime visual-acceptance claim.

## 2026-08-11 C16 Runtime Screenshot Recheck

- A current authenticated coach-session `375x812` capture at `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811\C16-me-profile-stats.png` was compared against Figma C16 `93:1182`: the pink 88px top bar, dark profile card, three-stat row, role-switch card, menu block, logout outline, and coach bottom tab are present.
- The displayed values (`4`, `3`, `1`) came from the active account's live coach-home response and are not Figma fixtures. Screenshot capture omits the platform menu capsule, so it verifies page geometry but not physical capsule overlap.
- C7 `233:2` was also routed with a coach session, but its available event ID returned the page's honest “read failed” state; it is not recorded as a ready-state visual acceptance.

## 2026-08-11 Coach Runtime Sampling and Workflow Headers

- C9 `93:924` and C11 `93:1002` were captured from the current authenticated coach session at `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811\C9-team-current.png` and `C11-test-tasks-current.png`. Their header, card, member/task, and bottom-navigation geometry is present. Current scope returns two members and two assessment tasks; unsupported Figma sample members and the task-creation affordance remain absent rather than fabricated.
- C3, C4.1, C5.1, C10.1, and C15.1 now use the Figma-required left-title navigation geometry and fixed 88px safe-area envelope. C10.1's neutral header background and C15.1's pink left-title header were aligned without changing any capability or write contract.
- Latest full workspace check: domain `19/19`, mini-program `293/293`, API `85/85`; all TypeScript checks and `git diff --check` passed. C7 ready-state screenshot remains data-blocked, not passed by inference.

## 2026-08-11 C16 Detail-Page Alignment

- C16 account, permissions, private-interest, and help detail headers no longer reserve a right-side placeholder. The back arrow and title now share the left-aligned Figma geometry; account also uses the fixed safe-area-inclusive 88px header envelope.
- The current account and permissions pages were sampled with the authenticated coach session. Dynamic phone, capability, and administrator-only content remains derived from real session/capability data; no edit, save, or contact affordance was invented where the BFF lacks that contract.
- Verification after this batch: domain `19/19`, mini-program `293/293`, API `85/85`, all TypeScript checks, and `git diff --check` passed.

## 2026-08-11 C14 Runtime Header Recheck

- Authenticated runtime capture `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811\C14-team-ability-current.png` confirms the C14 custom top bar now uses the Figma-sized 88px envelope instead of the former over-height header. Back action, left-aligned title, export control, dark overview card, dimension card, and coach bottom tab are present.
- The current API response does not have enough dimensions for a truthful radar polygon; the page displays its existing honest empty-radar state and does not borrow Figma's sample metrics.

## 2026-08-11 C1 Runtime Header Recheck

- Authenticated capture `C:\Users\ASUS\AppData\Local\Temp\cq-coach-audit-20260811\C1-schedule-current.png` confirms the C1 header and date strip now use the Figma 88px/64px structure, and the coach bottom tab remains attached to the viewport bottom.
- The selected real date range contains no accessible activities, so C1 correctly renders its API-backed empty state instead of Figma's illustrative hero, event cards, or summary values.

## 2026-08-11 Dual Parent/Coach Role Switching: Backend Foundation

- Added SQLite-backed app-client sessions with SHA-256 token storage, atomic token rotation, route-bound bearer revalidation, entrypoint-filtered `availableRoles`, and the server-confirmed role-selection endpoint.
- Capability-aware dual-role logins receive a pending session; legacy clients retain the compatible scoped default session. Pending, stale, expired, revoked, inactive-user, inactive-membership, inactive-client, and wrong-role bearer sessions return `401 authentication_required` without development-header fallback.
- A real file-backed restart test closes all original API/database instances before reopening and confirms a current active session remains valid. Full API Vitest `81/81`, API typecheck, and `git diff --check` passed; Terra xhigh approved the backend diff. Mini-program chooser and in-app switch controls remain the next independent batch.

> 依据《Figma 全量补齐决策》（../design/figma/figma-full-implementation-decision.md）执行。
> 本文档随每批工作实时更新：完成一项勾一项，新增发现随时补充。
> 最后更新：2026-08-08

### 2026-08-08 批次 4/5/6 收口：家长端全部 17 页 topbar 按 Figma 修复并逐页实拍验收 + 4 个独立提交

- **提交**：`663be2c` perf(api) 日程列表 N+1（5144ms→711ms）；`c48385b` P4 growth topbar；`2014a0a` radar 首载性能+P5 topbar；`a7646c4` 家长端 13 页 topbar。路径限定暂存，主工作区其余 ~31 项无关未提交改动（assessment 持久化等）未连带。
- **Figma 唯一权威**：`zZ6wKyOHKcO4UYXDd9jGwv`（用户重申 URL），"05 Parent Generated"(4:6) 页下 16 块内容画板；画板枚举/Header 几何取自 mcp get_metadata(4:6)+逐 Header get_design_context。页面↔画板映射：child=P7 Parent Profile Hub(93:336)、status=P7.1(93:364)、event=P2/P2.1/P2.2、reminders=P3(93:222)、metric=P6(93:308)、content=P8(93:388)、help=P8.2(93:444)、private=P9(93:500)、private-success=P9.1(93:531)、binding=P10(93:550)、coaches=Coach Team(93:472)、venues=Venues Premium(93:416)；account 无画板（app-header 已胶囊安全，不动）。
- **统一修法**：44px(88rpx) 内容带 content-box + `padding-top:{{navInset}}px` + `padding-right:{{menuInset}}px`（resolveMenuInset 动态避让胶囊）；‹字符/🔍emoji 全部换 Figma 原版 SVG（新增 search.svg、more-horizontal.svg）；coaches/venues/metric 摘除 app-header 死注册改手写 nav。
- **验收中修复的 2 个真缺陷**：① event 比赛变体「邀请好友」绝对定位压居中标题 → 右操作改流式布局（title flex-1 center）；② private-success 未 decodeURIComponent query → 中文教练名显示 %E7%8E... 乱码，已修并复验。
- **视觉验收**：模拟器逐页实拍 17 页（`C:\Users\ASUS\cq-talent-visual-evidence\b6-page-*.png`），vision 逐页核对胶囊间隙/垂直对齐/设计符合性，17/17 通过（reminders「全部已读」为 0 未读数据态隐藏，判 D 级可接受）。
- **环境事件（重要教训）**：① 强杀 DevTools 进程后冷启动 GUI 白屏（逻辑层正常），shader 缓存清理无效，**Ctrl+Win+Shift+B 重置显卡驱动后恢复**；② 渲染层冻结可只发生在**弹出式模拟器**（原生状态栏/授权弹窗照常更新、webview 页帧陈旧跨路由同哈希），内嵌模拟器同刻健康——此后验证改用 WGC/dxcam 拍内嵌模拟器；③ 合成鼠标事件（mouse_event/PostMessage）**到不了模拟器 webview/原生弹窗**（但能点 DevTools 原生工具栏），登录授权弹窗无法自动点；④ 登录态在强杀后丢失，临时 `DEV_AUTO_SESSION=true`（config.ts）完成验证后已回滚 false 且未提交；⑤ 自动化端口 9421 会话失效后换 9422 恢复。
- **门禁**：miniprogram typecheck ✅ vitest 51/51 ✅；api vitest 68/68 ✅；根 `pnpm run check` ✅。

### 2026-08-08 P6「同队对比」条重做（用户反馈「那个条有问题」）

- **问题**：marker 恒居中在色条下方且文字截断、缺得分分布标签+图例、分段比例不符、队内排名结构不符设计。
- **修复**：按 Figma TeamCompare(196:893) 重做——marker 移到条上方按得分%定位（clamp 5.5–94.5%）；补 4 段图例；分段 19.3/32.2/25.7/22.8%；队内排名改设计结构（我的行+待同步占位）。提交 `见 git log`（metric 3 文件）。
- **验收**：有数据态（运控球 62 分，marker 落浅粉段 62% 处）vision 6/6 ✅；无数据态（marker/我的行隐藏、条+图例+占位正常）vision 4/4 ✅。
- **新 capability**：`miniProgram.callWxMethod("pageScrollTo", {scrollTop})` 在 evaluate 全挂起的本机 build 上可用——折下内容验收不再依赖用户手动滚动（已补入技能）。

### 2026-08-07 P5/radar 批次 3 修复 + 复测（D3-1 白上白已修，D2 底部 tab 已实现，D3-2 根因已定位）

- 代码修复（单独 commit）：radar 画布容器与 radar-canvas 空态白底改透明（对齐 Figma 深色 Hero）；radar 页接入 `role-tabbar`（active=growth）并补底部留白；`openPage` 补 `navigateTo` fail 日志（errMsg + 页面栈深度）；`types/wechat.d.ts` 补 `console`/`getCurrentPages` 声明。miniprogram typecheck 通过。
- 复测：修复后 radar/growth 可信 375×812 截图已重取（新鲜性校验通过，非陈旧帧）；用户目视确认雷达线条/标签可见、底部 tab 出现。像素量化：header 高 88px 与 Figma 精确一致；运行胶囊位置 (281,≈28) vs Figma 占位 (281,28) 误差 ≤1px。
- D3-2 定位：成长页雷达卡 tap 正常触发，`navigateTo:fail timeout` 后页面实际压栈并延迟数秒完整呈现——**radar 页首次加载过慢导致导航超时，非接线缺陷**；性能优化另立批次待用户裁决。
- **模拟器渲染层冻结根因（傍晚定位）**：工作区未提交的 `libVersion` 降级 3.17.0→3.16.2 导致 Stable v2.01.2510290 模拟器 webview 渲染层冻结（跨路由捕获同哈希、原生 canvas 悬浮陈旧帧、可跨重启复现）。经用户同意改回 3.17.0 后渲染恢复，radar 页完整呈现（vision 逐项核实，无悬浮异常）。`project.config.json` 现与 HEAD 一致，未提交。该文件此前在 3.16.2 下产生的一切"只显示多边形/悬浮雷达"观感均为合成器幻影，非页面缺陷。
- 条目状态明细见 `.trellis/tasks/08-05-08-05-test-metrics-p5-radar/visual-audit-2026-08-07.md` 复测记录节。P5 视觉验收判定权留用户（本批不构成通过/不通过判定）。

### 2026-08-07 P5/radar 首次设计↔运行对照取证完成（发现 D3 级差异，验收待修复后复测）

- 设计侧证据齐：`93:278 / P5 Ability Radar` 官方渲染 PNG（375×812）+ `get_design_context` 全量几何/色值，含用户添加的微信胶囊占位节点 `272:860`（left:281 top:28 w:87 h:32）。
- 运行侧：真实家长会话下 `pages/parent/radar/index` 为 ready 成功态（当前学员 ≥3 项有效指标），可信 375×812 截图已取（路由校验通过、用户确认与屏幕一致）。
- 对照结论（措辞上限「已对照，差异见清单」，判定权留用户）：发现 **D3 级差异 2 项**——① 雷达画布容器白底（`radar/index.wxss:25`）叠加 dark 模式白色线条导致白上白、仅红色多边形可见（像素探针证实，用户提出的假设成立）；② 成长页雷达卡点击未跳转详情（用户报告，静态链路核查存在且路径正确，待复现）。另有 D2 1 项（画板底部 Tab 覆盖层 vs 运行页无 tab 组件）待用户裁决。差异清单与证据哈希见 `.trellis/tasks/08-05-08-05-test-metrics-p5-radar/visual-audit-2026-08-07.md`。
- 工具链新陷阱：弹出式模拟器窗口 PrintWindow 后缓冲可能为陈旧帧（哈希与上一张相同即不可信）；本 DevTools 版本 DOM 查询（`page.data`/`page.$`）全部超时。

### 2026-08-07 P5/radar 节点存在性阻塞解除（仅节点，不含截图与设计内容核验）

- 经 Figma MCP `get_metadata` 实读 `zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`，观测到 28 个 375×812 顶层画板存在（21 张原始设计 + 7 张 CODE 契约版），含 `93:250 / P4 Growth Home`、`93:278 / P5 Ability Radar`、`93:308 / P6 Metric Detail`。完整三元组清单见 [Figma 权威来源](figma-source-of-truth.md)。
- 2026-08-05 条目中"当前在线 Figma 尚未取得可验证的 P5、雷达和指标录入节点及截图"含两个断言；本次仅推翻"节点"部分——**画板设计内容与截图仍未核验，不构成视觉验收依据**，需后续逐板 `get_screenshot` / `get_design_context` 取证，且仍须取得微信开发者工具真实 375×812 运行截图后方可做视觉对照。
- 同期完成：教练签到生产持久化验证（生产 PUT → 容器重启 → 同库读回一致，台账零副作用，证据与边界见 `.trellis/tasks/08-05-coach-attendance-persistence/implement.md` 2026-08-07 节）；C4 可信 375×812 视觉验收仍待真实登录后完成。

### 2026-08-05 测试指标 SQLite 持久化（Batch A）

- 测试指标评测已写入 SQLite：`player_assessments`、`assessment_raw_results`、`assessment_scores`、`player_metric_records` 与 `metric_lineages`，保持现有 coach assessment POST 与 parent readback 契约。
- 同一临时 SQLite 关闭后，以构建产物 `apps/api/dist/index.js` 重启并通过 HTTP 读回：`/health`、`growth-summary`、`ability-metrics` 均为 `200`，`assessment-2` 在重启后仍存在；确认 PID `29432` 已停止、端口 `3417` 已释放。
- 本批 API focused tests `59/59`（提高默认超时后）通过，typecheck、build、`git diff --check` 通过；默认 5 秒运行仍准确保留 `server.test.ts:2903` 的历史超时记录。
- P5 雷达视觉实现暂不开始：当前权威 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 尚无可验证的 P5/指标录入节点与截图，因此尚未进行视觉验收。

## 2026-08-04 设计权威切换（覆盖现行规则）

- 自 2026-08-04 起，唯一当前设计权威为在线 Figma 文件 `zZ6wKyOHKcO4UYXDd9jGwv`；旧文件 `ATlfBRO0ruOCDDY5ICagFD` 仅保留为历史审计，禁止新的读取、编辑、实现或视觉验收，且节点 ID 不得跨文件继承。
- 当前设计引用必须使用三元组：`zZ6wKyOHKcO4UYXDd9jGwv / 93:29 / G2 Login Verification`、`zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`、`zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`、`zZ6wKyOHKcO4UYXDd9jGwv / 4:6 / 05 Parent Generated`、`zZ6wKyOHKcO4UYXDd9jGwv / 4:7 / 06 Coach Generated`。
- 即使后续或历史排障记录包含 `ATlfBRO0ruOCDDY5ICagFD` 或裸节点 `93:83`（包括本文末尾的 DevTools 截图通道 hunk），也只表示切源前、尚未完成的历史排障线索，绝不能作为当前文件 `zZ6wKyOHKcO4UYXDd9jGwv` 的读取、实现或视觉验收依据。
- 当前 P1 运行态对照只能使用 `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`；P1 Empty 只能使用 `zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`。P1/G2 下方保留的旧几何均属于切源前历史规格；G2 当前现行 `form-card` 为 `331×144`，旧 `verification-card` `331×128` 仅作历史值。

## 2026-08-05 核心演示闭环（覆盖当前推进总纲）

当前只冻结以下六项，按顺序推进，历史 P1–P10/C1–C16 全量视觉愿景保留但不作为本轮执行范围：

1. P1 视觉验收
2. 教练签到 SQLite 持久化
3. 测试指标 + P5
4. 训练计划
5. 比赛记录
6. 战术板重启读回 + MVP 视觉

- P1 已取得可信 Windows PrintWindow 运行截图，但视觉验收不通过：Hero 左侧酒红面积/边界偏差，运行态周序为 `SUN→SAT` 而当前 Figma 为 `MON→SUN`；本轮无代码改动。
- 教练签到已接入 SQLite；本地文件型数据库重启读回已验证，生产部署目前仅有 health/OpenAPI 可达证据。
- 当前质量记录仅覆盖小程序 `44/44 tests`、小程序 `typecheck` 与截图工具测试；不得写成全仓通过。API fixture 差异仍保留：`apps/api/test/server.test.ts:688` 期望 `not_started`、实际 `in_progress`；`:1344` 数据能力预览记录断言不一致。

### 2026-08-05 教练签到 SQLite 持久化

- P1 当前为产品接受，但保留已知 Figma 差异（Hero 左侧酒红面积/边界及 `SUN→SAT` 周序）；不宣称像素一致或视觉验收完成。
- 教练签到已接入 SQLite：日程与参与者 seed 采用 insert-if-absent，签到按 `(club_id, event_id, student_id)` 保存 `status`、`note` 与 `updated_at`；重启 seed 不覆盖既有签到。
- 已完成文件型数据库实测：PUT 保存 `present` 与非空备注，构建后安全停止已确认 API PID，以同一数据库重启 `dist/index.js`，GET 读回状态与备注；`event-training-1-student-1` 仅保留一条 `-1` attendance debit。
- 本批验证：API `5 files / 66 tests`、API typecheck/build、小程序 typecheck 与 `8 files / 45 tests`、`git diff --check` 通过。此结论不代表全仓测试；历史记录中的 `server.test.ts:688` 和 `:1344` fixture 说明仍仅作历史追踪，不以本批小程序/API 包验证替代全仓验收。
- C4 真实 coach 运行态与可信 `375x812` 截图未取得，视觉验收仍待完成。
- 2026-08-05 生产部署证据：`6526fe4` 已部署至容器 `cq-talent-api`，发布目录为 `/opt/cq-talent-releases/6526fe4`；旧 `/opt/cq-talent-api` 保留且非 Git 工作树，SQLite 使用 named volume `cq-talent-api-data`，生产 API 仅监听 `127.0.0.1:3000`，Nginx TLS 反代 `cqtc.pomi.tech` 至该端口，HTTPS `/health` 返回 `200`，OpenAPI 含 coach attendance 路由。
- 生产本轮仅证明健康检查与 OpenAPI 路由可达；没有真实生产 coach PUT、生产同库重启读回或 C4 视觉验收证据。P1 仅为产品接受，仍保留已知 Figma 差异，不宣称视觉完成或像素一致。

## 总体进度

| 维度 | 总数 | 已完成 | 说明 |
|---|---|---|---|
| Figma 家长端画板 | 28 | 10 原始设计 + 5 契约版 | 契约版待按原始设计重做 |
| Figma 教练端画板 | 43 | 13 原始设计 + 9 契约版 | 契约版待按原始设计重做 |
| 小程序路由 | 44 | — | 家长 15 + 教练 25 + 启动/登录 2 + 其他 1 |
| 后端 BFF 切片 | — | 3（提醒中心 + 私教申请 + 教练球队/能力） | 契约先入 spec 再实现 |

## 已完成

### 批次 1-2：交接收尾（2026-07-29/30）
- [x] 交接包审查、验证链（install/typecheck/83 测试/构建/启动）
- [x] 干净构建修复 `8d6caea`+`f4075b8`；GitHub origin 配置推送 11 分支
- [x] Figma 全量补齐决策入库 `e3bd176`

### 批次 3：视觉基础（A 线）
- [x] token 层 `styles/tokens.wxss` + app.wxss `@import`，硬编码色值清零 `d85ead6`
- [x] fig-kiwi 自研解码器全量走通（`scripts/fig2json.py`），token 按 "CQ Talent Contract Tokens" 变量集精确校准 `33d8044`
- [x] 画板规格导出器 `scripts/fig_export_frame.py`（任意画板 → 实现级规格 md）

### 批次 4：家长提醒中心（首个 BFF 切片 + 页面）
- [x] BFF：`GET .../parent/reminders`（guardian 作用域）`7a1da3d`
- [x] 契约回写 spec "Scenario: Parent Reminders Feed" `187638c`
- [x] P3 提醒中心页面端到端 `c4b0d4f`

### 批次 5：铃铛入口修复 + P7.1 / P8
- [x] 日程页提醒入口按 Figma P1 改为铃铛图标 + 未读红点（app-header 扩展 actionIcon/actionDot/actionPill）`2ca11d4`
- [x] P7.1 课时与保障（真实数据：日历推导 + home BFF）`2ca11d4`
- [x] P8 内容中心（静态设计内容）`2ca11d4`

### 批次 6：P8 快速入口三页
- [x] P8.2 帮助中心（可展开 FAQ，答案基于真实功能）`4633fd7`
- [x] Coach Team 教练团队 `4633fd7`
- [x] Venues 场地信息（筛选 chips 真实过滤）`4633fd7`

### 批次 7：私教约课 + 日期活动列表
- [x] 契约 "Scenario: Parent Private Lesson Request" 入 spec `dec757c`
- [x] 私教申请 BFF（POST 201 + GET 列表，guardian 作用域，契约测试 5 断言组）`dec757c`
- [x] P9 私教预约表单（教练/日期/时段/目标/备注 → 真实 POST）`dec757c`
- [x] P9.1 预约成功页（摘要卡 + 返回动作）`dec757c`
- [x] P1.1 日期活动列表（日程页"列表 ›"入口）`dec757c`
- 注意：私教申请存储为进程内集合，~~SQLite 持久化是已声明的后续项~~ ✅ 批次 12 已落 SQLite

### 批次 8：教练端球队/雷达/能力/活动变更
- [x] 契约 "Scenario: Coach Team & Ability BFF" 入 spec（4 端点）`bd0c9f6`
- [x] C9 队伍详情 BFF `GET /coach/team`（近 30 天作用域聚合：成员/训练场次/出勤率）`bd0c9f6`
- [x] C13 学员雷达 BFF `GET /coach/students/:id/radar`（教练作用域校验）`bd0c9f6`
- [x] C14 团队能力 BFF `GET /coach/team/ability-overview`（维度 队均/TOP/底 + 综合 + 趋势）`bd0c9f6`
- [x] C3 活动变更 BFF `POST /coach/events/:id/change-requests`（201，教练作用域）`bd0c9f6`
- [x] C9 队伍详情页（深色 Hero + 三统计 + 学员网格，点学员进雷达）`bd0c9f6`
- [x] C13 学员雷达页（学员 chips + 深色雷达 Hero + 综合分）`bd0c9f6`
- [x] C14 团队能力页（队均雷达 + 趋势 chip + 维度统计表）`bd0c9f6`
- [x] C3 变更活动页（信息卡 + 原因 chips + 新时间/场地/备注 → 真实 POST）`bd0c9f6`
- 入口：coach/me 三条快捷链接；coach/event 操作格新增"变更活动"
- 验证：api 61 测试全过；dev API 实测两 GET 端点返回真实数据（28 名学员/综合 80）
- 注意：变更申请为进程内集合（同私教申请，持久化是已声明后续项）；作用域窗口为近 30 天

### 批次 9：训练内容选择 / 覆盖面 / 测评任务与录入
- [x] 契约 "Scenario: Coach Training Coverage & Assessment Tasks" 入 spec `9ca68c3`
- [x] BFF `GET /coach/training-coverage`（每学员×维度覆盖+最新得分）+ `GET /coach/assessment-tasks`（新 assessmentTasks 实体+种子 2 条，状态推导）`9ca68c3`
- [x] C10 `pages/coach/content-select/`（搜索+分类 tabs+多选卡片+已选栏，带 eventId 时直接 PUT 到活动）`9ca68c3`
- [x] C10.1 `pages/coach/coverage/`（学员×维度进度条 + 覆盖 X/Y）`9ca68c3`
- [x] C11 `pages/coach/test-tasks/`（全部/未完成/已完成 筛选 + 进度条）`9ca68c3`
- [x] C15 `pages/coach/assessment-entry/`（维度 tabs + 学员滑杆 + 草稿 + 逐学员提交复用 POST /coach/assessments）`9ca68c3`
- [x] C15.1 `pages/coach/assessment-submit/`（成功态+摘要卡，查看结果→团队能力）`9ca68c3`
- [x] 入口：训练页"分类选择 ›"、coach/me"测评任务"；C10 顶栏"覆盖预览" `9ca68c3`
- [x] 契约测试：coverage 200+家长 403、任务状态推导（in_progress/not_started）→ api 62 全绿
- [x] dev API 重启实测：任务 1/28 进行中、覆盖面学员维度明细返回正常
- 注意：测评任务完成度按"窗口内有任一测评记录"判定（v1 简化，未按模板指标逐一比对）

### 批次 10：账号绑定 + 教练设置四页
- [x] P10 `pages/parent/binding/`：绑定学员列表（getParentChildren 真数据）+ 切换学员（写入 activeStudentId）+ 微信绑定/家庭成员区 `5416051`
- [x] C16.1 `pages/coach/permissions/`：权限只读开关列表 + 说明卡 `5416051`
- [x] C16.2 `pages/coach/private-interest/`：接受预约总开关 + 周×时段格子（本机存储持久化）`5416051`
- [x] C16.3 `pages/coach/account/`：资料卡（getCoachHome 真数据）+ 手机号行 + 退出登录（clearSession + reLaunch）`5416051`
- [x] C16.4 `pages/coach/help/`：搜索 + 6 主题网格 + 展开答案 `5416051`
- [x] 入口：parent/child"账号绑定"；coach/me 新增 4 行（权限/私教兴趣/账号/帮助）`5416051`
- [x] 全量 `pnpm check` 绿（62 api + 18 domain + 7 小程序测试；三项目 typecheck）
- 注意：C16.1 权限与 C16.2 时段为前端展示/本机存储（无后端实体，已在页面标注"管理员分配/保存在本机"）

### 批次 11：教练端 6 子状态页
- [x] C4.1 `pages/coach/attendance-success/`：绿勾成功页（课程/日期/场地摘要）；点名提交后 redirectTo 带人数 `852e135`
- [x] C4.2 出勤修改：attendance 页 `mode=correction`（橙色异议警示卡 + 异常计数 + 重新提交走同一保存链路）`852e135`
- [x] C5.1 `pages/coach/lesson-correction/`：警示头 + 学员步进器（±0.5课时）+ 原因 + 逐学员 correctCoachLesson `852e135`
- [x] C6.1 `pages/coach/match-event-add/`：事件类型 chips + 球员 + 分钟，eventChannel 回传比赛页 `852e135`
- [x] C6.2 保存态：比赛保存后按钮闪显"已保存 ✓" `852e135`
- [x] C12.1 自动保存态：assessment-entry 滑杆变更即自动存草稿 + "保存草稿"弹层（继续录入/退出）`852e135`
- [x] 入口：lesson 页"课时更正"、match 页"按设计稿添加"；全量 check 绿
- 注意：异议/纠错目前无独立后端实体——异议学员按缺席/请假状态推导，更正直接写课时台账

### 批次 12：SQLite 持久化 + 家长端内容四切片真 BFF
- [x] `db/migrations/0007_request_collections.sql`：private_lesson_requests + event_change_requests 两表 `bcb382a`
- [x] PersistentApiStore 覆盖 list/create；persistence.test 新增"重开库恢复"用例（63→64）`bcb382a`
- [x] 契约 "Parent Content Slices" 入 spec（4 端点）`bcb382a`
- [x] 种子层 contentArticles(4)/contentFaqs(5)/venues(3, 含坐标) 三集合 `bcb382a`
- [x] BFF：`content/articles`、`content/faqs`、`venues`（monthlyCount=近30天活动聚合）、`coach-team`（真实教练/队伍）`bcb382a`
- [x] 小程序 4 静态切片换真 BFF：content/help/venues/coaches；场地"导航"接 wx.openLocation `bcb382a`
- [x] dev API 重启实测 4 端点返回真实种子数据；全量 check 绿（89 测试）
- 注意：测评任务仍为种子集合（俱乐部配置类，无需运行时持久化）

### 批次 13：家长端契约版视觉重做（8 画板）
- [x] 规格归档 `docs/design/specifications/batches/design-spec-batch13-*.md`（8 张）`36a5072`
- [x] P1 schedule：白顶导 + 深色下一场 hero + 周/今日统计 + pending chips + 色条活动卡 `36a5072`
- [x] P2/P2.1/P2.2 event：按类型 nav、深色 hero、比赛记分牌、底部出席状态钮 `36a5072`
- [x] P4 growth：深色球员 hero + 成长足迹卡（雷达/指标功能区保留）`36a5072`
- [x] P5 新建 pages/parent/radar 独立雷达页（44 路由；学员切换 + 综合评分 + 维度条含同龄游标）`36a5072`
- [x] P6 metric：深色 hero 大分值 + 真实记录 CSS 散点趋势图 `36a5072`
- [x] P7 child：深色球员卡 + 统计行 + 2x2 快捷操作（日程/成长/私教/绑定）`36a5072`
- [x] 全量 check 绿（89 测试）

### 批次 14：教练端契约版视觉重做（9 画板）
- [x] 规格归档 `docs/design/specifications/batches/design-spec-batch14-*.md`（9 张；C7 原画板节点缺失按统一教练 nav 模式处理；C12 用 "C12 Project Score Entry"）`9ca6d33`
- [x] C1 schedule：白顶导+红头像、7 日 strip（选中红）、统计 pills、色条活动卡 `9ca6d33`
- [x] C2 event：nav 结束动作、深色 session hero（真实已进行计时器 + 出席 chips）、出勤卡（名单圆点）`9ca6d33`
- [x] C4 attendance：粉底 nav+提交、深色 hero 出勤/缺勤/待确认圆点计数、全员到场/清空 `9ca6d33`
- [x] C5 lesson：粉底 nav、深色活动头（时长）、学员课时记录卡（销课 chip，更正流保留）`9ca6d33`
- [x] C6 match：粉底 nav、深色记分牌 hero（队伍+比分+半场 chips+战术板链）`9ca6d33`
- [x] C7 tactical-board：白 nav + 保存状态 chip `9ca6d33`
- [x] C8 training：白 nav + 深色 2x2 统计 hero（真实计数）`9ca6d33`
- [x] C12 test-entry：粉底 nav+提交（深色任务头与进度条保留）`9ca6d33`
- [x] C16 me：粉底 TopBar+设置、深色资料 hero（负责队伍数 chip）`9ca6d33`
- [x] 全量 check 绿（89 测试）

## 未完成

### 家长端 · 完全没做
（全部 28 画板均有对应页面：10 原始设计 + 5 契约版待重做 + 其余由契约版覆盖）

### 家长端 · 契约版待按原始设计重做（6 页）
- [x] **P1 Schedule Home** —— ✅ 批次 13（白色顶导 22px+铃铛红点 / 深色 hero 下一场 / pending chips / 色条活动卡）`36a5072`
- [x] **P2 / P2.1 / P2.2** —— ✅ 批次 13（按类型 nav + 深色 hero + 比赛记分牌 + 底部出席状态钮）`36a5072`
- [x] **P4 Growth Home** —— ✅ 批次 13（深色球员 hero + 成长足迹卡 + 雷达入口）`36a5072`
- [x] **P6 Metric Detail** —— ✅ 批次 13（深色 hero 大分值 + 趋势 chip + 真实记录散点图）`36a5072`
- [x] **P7 Parent Profile Hub** —— ✅ 批次 13（深色球员卡 + 统计行 + 2x2 快捷操作）`36a5072`
- [x] **P5 Ability Radar** —— ✅ 批次 13（新建独立页 pages/parent/radar：学员 chips + 深色雷达 hero + 综合评分 + 维度条）`36a5072`

### 家长端 · 数据待后端切片（静态内容替换）
- [x] 内容中心文章列表 / 帮助中心 FAQ / 场地列表（含坐标）/ 教练档案 —— ✅ 批次 12 全部换真 BFF
- [x] 场地导航按钮 → wx.openLocation —— ✅ 批次 12
- [ ] 3 处搜索（内容/帮助/场地）toast 占位 → 真实搜索

### 教练端 · 完全没做
（C3/C9/C10/C10.1/C11/C13/C14/C15/C15.1/C16.1-4 均已落地；剩余为契约版重做与子状态页）

### 教练端 · 子状态页
- [x] C4.1 点名成功 / C4.2 家长异议出勤修改 / C5.1 课时更正 / C6.1 添加比赛事件 / C6.2 保存态 / C12.1 自动保存态 —— ✅ 批次 11 全部落地

### 教练端 · 契约版待按原始设计重做（9 页）
- [ ] C1 / C2 / C4 / C5 / C6 / C7 / C8 / C12 / C16 全部现为契约版

### 其他
- [x] **私教/变更申请 SQLite 持久化** —— ✅ 批次 12（0007 migration + PersistentApiStore 覆盖 + 重开库恢复测试）
- [ ] 交接包 WPS 草稿（642 行，1 个 201 vs 400 失败测试）未合入
- [ ] Trellis 任务 `07-30-figma-design-foundation` 未收官

## 建议推进顺序（2026-07-30 定）
1. ~~P1.1 + P9/P9.1 + 私教 BFF~~ ✅ 批次 7 完成
2. ~~教练端 C3/C9/C13/C14~~ ✅ 批次 8 完成
3. ~~教练端 C10/C11/C15（训练内容 + 测评任务/录入）~~ ✅ 批次 9 完成
4. ~~P10 账号绑定 + C16.1~C16.4~~ ✅ 批次 10 完成
5. ~~教练端 6 子状态页~~ ✅ 批次 11 完成
6. ~~私教/变更申请 SQLite 持久化 + 4 个静态切片换真 BFF~~ ✅ 批次 12 完成
7. 家长端 5 页 + 教练端 9 页契约版按原始设计重做 —— 视觉升级，放最后

## 工作方法（每批固定流程）
1. `fig_export_frame.py` 导出目标画板规格 → 归档 `docs/design/specifications/`
2. 需要新数据 → 契约先入 `.trellis/spec/api/backend/app-client-bff-contracts.md` 再实现 BFF
3. 页面复用 app-header / role-tabbar / status-view + token 变量
4. `pnpm check` + `pnpm build` 全绿后小步提交推送
5. 更新本文档

## 环境备忘
- 改完 `apps/api` 必须 `pnpm build` + 重启 localhost:3000 的 `node apps/api/dist/index.js`，否则小程序打到旧 dist 报 404

## 2026-08-02 交接续作记录

### 历史对话结论

- G2 原稿是家长专属“绑定孩子”画板，不是教练通用登录页；资料中没有独立的 Coach Login 画板。
- 授权前客户端不能可靠知道角色，因此登录页采用角色中性的“身份验证”；微信手机号授权和服务端档案匹配成功后，`parent` 进入家长日程/绑定流程，`coach` 进入教练日程。
- 旧登录实现的主要问题是顶端安全区过大、验证码行与操作控件重叠、微信授权动作重复，以及在角色未知时显示家长语义。当前代码已删除验证码伪流程并保留单一真实手机号授权入口。

### 当前未完成项

- `apps/miniprogram-cq-talent/pages/login/` 已按 G2 v2 规格调整；本次续作进一步修正顶部 88px 包络，并在微信登录凭证加载期间禁用授权按钮。尚未取得可信的 `375x812` DevTools 截图。
- 在线 Figma 更新未完成：前一轮 Hermes CLI 调用在进入 MCP 操作前因 provider HTTP 502 失败。不能将本地 `.fig` 或在线文件写入视为已完成。
- Trellis 任务 `.trellis/tasks/07-30-figma-design-foundation` 仍为 `in_progress`，当前工作树有 64 项未提交改动，不能直接收官或清理其它批次。

### 最新验证事实

- 上一轮小程序 typecheck 通过；本次登录几何 patch 后需重跑。
- 全仓 check/test 最近失败于两个 API fixture：`apps/api/test/server.test.ts:688` 期望 `not_started`、实际 `in_progress`；`apps/api/test/server.test.ts:1344` 期望固定数据能力预览记录、实际返回更大/不同记录集。它们与本次登录页改动无直接关系，但在修复或隔离前不得报告全仓通过。
- P3 提醒、活动详情参与人映射、P1/P2/P3 及相关视觉批次的代码改动仍在当前工作树中，后续应按批次逐项复核，不要回滚用户已有改动。
- curl 访问 localhost 需 `--noproxy '*'`（本机 Clash 代理）
- fig 工具链：先运行 `Python313/python.exe scripts/fig2json.py <设计.fig> <decoded-fig.json>`，再运行 `python scripts/fig_export_frame.py <decoded-fig.json> "<画板名>" <输出.md>`。Token 报告使用 `python scripts/fig_extract_tokens.py <设计.fig> <decoded-fig.json> [report.md]`。

### 2026-08-02 P1 无日程 Hero 保留

- 家长日程页在 `state === "ready"` 且选中日期无活动时保留固定 Hero；空态不伪造活动字段，也不绑定点击事件；下方 `p1-empty-list` 保留。
- 在线 Figma P1 节点 `93:83` 已核对成功态结构（Hero → 日期周条 → 标签 → 列表）；当前文件没有明确的 Empty Hero 画板，因此代码空态是保守补全，不能当作已由 Figma 定义。在线 Figma 后续应补同尺寸 Empty Hero 状态。
- Luna 实现后经 Terra 复审：目标测试 `5/5`、小程序包测试 `4 files / 17 tests`、typecheck、`git diff --check` 通过。尚未取得微信开发者工具或真机 `375x812` 有活动/无活动截图，视觉验收仍待完成。

### 2026-08-02 P1 响应式标签与 Figma 状态同步

- 家长日程页 chips 已完成最小响应式修正：容器允许换行，chip 不再裁切、省略或强制单行；动态红色日期 chip 使用自适应宽度，绿色/黄色统计 chip 保留原定 `182rpx` / `124rpx` 几何。
- 在线 Figma 文件 `ATlfBRO0ruOCDDY5ICagFD` 中已观察到 `93:83`、`241:166` 与 `241:412` 状态根 Frame；`241:412` 根 Frame 为 `375×812`，并仅观察到部分 Empty Hero（`343×180`，代码对应 `686rpx×360rpx`）。虚线空列表的关键在线规格、bounds 与样式未能可靠读取；完整 Empty 未验收，也未据此更新。
- 当前验证：目标测试 `6/6`、小程序包测试 `4 files / 18 tests`、typecheck 通过；WXML 禁用 JS 方法扫描干净；`git diff --check` 无空白错误，仅有工作树既有 LF→CRLF 提示。
- 视觉证据分层：在线 Figma 已读取 `93:83`、`241:166`，并仅观察 `241:412` 的根 Frame 与部分 Hero；未取得可复核的完整 Empty 截图或虚线空列表规格。尚未取得微信开发者工具或真机 `375x812` 截图，因此小程序运行态视觉验收仍未完成，不能宣称与 Figma 完全一致。

### 2026-08-03 P1 Hero 与提醒图标在线同步

- 在线 Figma 实测并复读：成功态 `93:83` 与 `241:166` 的 `Hero Card > hero-stats` 均为相对 Hero `X=16, Y=137, W=311, H=31`；Hero 为 `343×180`，底部留白 `12px`。此前历史规格中的 `Y=147` / `2px` 底距已过时；`241:412` Empty 未改动。
- 小程序成功态与空态均使用 `.hero__stats { top: 274rpx; }` / `.hero__stats--empty { top: 274rpx; }`，与在线成功态 `Y=137px` 对齐。提醒入口保留真实 `menuInset`、`navActionTop` 与 `openReminders`，不引入未验证 SVG；CSS 铃铛使用 `64rpx` 点击区、约 `18×20px` 视觉轮廓和带白描边的红点。
- Terra 复核后，P1 单测 `8/8`、小程序包测试 `6 files / 26 tests`、typecheck、WXML 禁用 JS 方法扫描与 `git diff --check` 通过。未改 API、session、角色或数据契约；真实 parent/API 的 DevTools 或真机 `375×812` 成功态与空态截图仍待验，不能宣称小程序运行态视觉完成。

### 2026-08-03 P1 在线 Figma 状态画板排布修正

- 已整理在线 Figma P1 三个独立状态画板的画布排布：`93:83` 保持 `(1370,120)`，`241:166` 移至 `(1785,120)`，`241:412` 移至 `(2200,120)`；三者均为 `375×812` 根 Frame，间距 `40px`。
- 本批仅移动根 Frame，未修改任何子层、尺寸、内容、样式、本地代码或 Git；Terra 复核通过。该结果不替代 DevTools/真机 `375×812` 小程序运行态视觉验收。
- 微信开发者工具/真机 `375×812` 视觉验收待完成，不能据此宣称运行态视觉通过。

### 2026-08-03 P1 Empty 在线设计源尝试（A）

- 本轮未修改在线 Figma `241:412`。虽读取到根 Frame 与部分 Content/Hero 参数，但虚线空列表的关键在线 metadata、bounds 与样式无法可靠取得；完整 Empty 状态仍阻塞。
- 待获得可复核的在线 metadata 或完整截图后，另行独立实施；本记录不表示 Empty 设计源或小程序运行态视觉已完成。

### 2026-08-03 Role TabBar Parent 专属隔离（B）

- 仅修改 `components/role-tabbar/` 的三个组件文件：根节点输出 Parent/Coach modifier；移除无角色限定的 active 粉色图标底和红点泄漏。Parent active 使用 `#A80F1B` 与 `4×4rpx` 红点、无粉底；Coach 明确无红点；图标尺寸按 Figma 契约为 `44×44rpx`。
- 组件测试 `5/5`、小程序包测试 `6 files / 27 tests`、typecheck、WXML 禁用 JS 方法扫描与 `git diff --check` 均通过。路由、PNG 映射、API、session、授权及角色业务逻辑未改。
- 真实 Parent/Coach `375×812` DevTools/真机截图矩阵仍待补，不能宣称运行态视觉完成。

### 2026-08-03 P1 TabBar 几何与统计胶囊单行修复（C）

- 已直接读取在线 Figma 文件 `ATlfBRO0ruOCDDY5ICagFD` 的 `P1 Schedule Home` 节点 `93:83`。其中 `TabIconsOverlay` 为 `375×70`，每个 tab 为 `125×56`；图标 `22×22` 位于 tab 顶部 `6px`，标签位于 `Y=31px`，Parent active 红点为 `4×4`、`Y=48px`。在线设计未修改。
- 根因：现有 `role-tabbar` 让 tab 内容在带安全区 padding 的可用高度中垂直居中，没有按 Figma 的 `56px` tab 几何定位，导致图标贴近上边框；固定定位后，父层安全区 padding 又会把标签下半部分裁掉。现保持 `140rpx`（70px）外框不变，TabBar 自身不再承载安全区 padding，内容 tab 固定 `112rpx`、顶部 `12rpx`、图标 `44×44rpx`、标签间距 `6rpx`、红点固定在 `96rpx`；页面内容区继续保留底部安全留白。不改路由、PNG 图标映射、API、session 或角色逻辑。
- P1 日期统计 chips 改为固定 `54rpx` 高、单行居中、禁止收缩和换行；动态红色日期 chip 仍为自适应宽度，绿色/黄色 chip 仍为 `182rpx` / `124rpx`。该修复针对用户截图中“待处理 0”分行的问题。
- 验证：目标测试 `57/57`、小程序包完整测试 `7 files / 57 tests`、`pnpm --filter @football-club/miniprogram-cq-talent typecheck`、`git diff --check` 均通过。该历史记录当时尚未取得修复后的可信 DevTools 或真机 `375×812` 原始截图；后续截图证据见下节。

### 2026-08-03 P1 成功态运行截图取证（D）

- 已重新读取在线 Figma 文件 `ATlfBRO0ruOCDDY5ICagFD` 的 `P1 Schedule Home` 成功态节点 `93:83`。本条只记录成功态；`P1 Schedule Home — Empty` 仍没有完整、可复核的运行态视觉验收。
- 已取得微信开发者工具前台 iPhone X 模拟器的家长日程成功态 `375×812` PNG：`C:\Users\ASUS\AppData\Local\Temp\cq-talent-p1-375x812-current-20260803.png`。截图确认“`2节`”保持单行，且“日程”标题与右上角提醒图标的视觉中心对齐。
- 同一工作区复核：小程序测试 `7 files / 59 tests` 通过，`pnpm --filter @football-club/miniprogram-cq-talent typecheck` 通过。该结论仅覆盖 P1 相关小程序检查，不能写成全仓 `pnpm check` 已通过。
- 全仓质量仍有两项必须单独复现并准确记录的 API fixture 差异：`apps/api/test/server.test.ts:688` 期望 `not_started`、实际 `in_progress`；`apps/api/test/server.test.ts:1344` 的数据能力预览记录断言不一致。未复现并处理前，不得笼统称为“既有失败”或全仓检查通过。

### 2026-08-04 DevTools Automator 截图工具重做

- 旧原型直接发送 DevTools RPC 且要求原始 PNG 必须为 `375×812`，会把真实 iPhone X 会话的 `563×1218` 等比导出误判为失败。新实现仅使用 `miniprogram-automator@0.12.1`，并将 Windows `.bat` 启动、端口等待、截图、同路由复核和 `systemInfo` 读取拆成可测试的最小链路。
- 证据定义改为：SDK `systemInfo` 必须证明逻辑视口为 `375×812`；PNG 保留原始像素且必须为等比完整导出；sidecar 同时记录 `devicePixelRatio` 与实际导出倍率。不能用微信运行时 `pixelRatio` 反推截图 PNG 像素。
- 静态验证：目标回归 `10/10`、小程序完整测试 `7 files / 40 tests`、`pnpm --filter @football-club/miniprogram-cq-talent typecheck`、`git diff --check` 已通过。未改页面、Figma、API、session、授权或角色逻辑。
- 运行态边界：2026-08-04 已实际连接到自动化端口并读取 `pages/parent/schedule/index` 及 iPhone X `375×812` 系统信息；调试中的超时使当前 DevTools 自动化窗口无法重新初始化，故新命令尚未生成可提交的最终 PNG。完全退出并重新打开 DevTools、真实授权并重新取图后，才能进行 P1 截图对照；在此之前不得宣称视觉验收通过。

### 2026-08-04 DevTools 截图通道兼容性复现

- 在 DevTools 完全重启、真实微信授权并回到 `pages/parent/schedule/index` 后，官方 Automator 协议日志证明当前桌面版本 `2.01.2510290` / 基础库 `3.17.0` 正常回复版本、当前路由和路由栈；唯一未响应的调用是 SDK 内部的 `MiniProgram.screenshot()`，脚本在 30 秒保护期后退出。
- 取证脚本没有发布 PNG 或 sidecar，因而没有把失败、黑屏或桌面截图误标成 P1 视觉证据。此结论仅说明当前 DevTools 的截图通道与官方 SDK 的组合不可用；不影响已经通过的静态/类型/单测结论，也不代表 P1 已完成运行态 Figma 验收。
- 后续动作：先完整退出所有 DevTools 进程，再由 `cli auto --auto-port` 建立一个实际监听的新自动化端口后，以相同的 `devtools:screenshot` 命令重新验证。2026-08-04 只关闭/重开项目窗口时，主进程仍自 10:24 存活、旧端口 `9421` 仍自 10:25 被占用；请求 `9422` 只创建新的渲染进程而未监听该端口。若全新自动化端口仍无响应，再判断 DevTools/Automator 兼容性。SDK 收到 PNG 后，才按在线 Figma `93:83` 做 P1 成功态逐像素/布局对照；当前不要继续通过更改页面样式、登录、API 或角色逻辑来猜测性“修复截图”。

### 2026-08-05 Windows DevTools 模拟器截图工具

- 已新增 `apps/miniprogram-cq-talent/scripts/devtools-simulator-capture.py`，并接入 `scripts/devtools-screenshot.mjs`。Windows 上，Automator 继续只读校验路由、路由栈和逻辑 `375×812` 视口；当且仅当这些校验通过后，Python 用 `PrintWindow(PW_RENDERFULLCONTENT)` 离屏获取唯一可见的“××的模拟器”窗口，并根据 DPI 与 iPhone X 刘海裁出完整逻辑画布。
- 真实验证：当前路由为 `/pages/parent/schedule/index`，逻辑视口 `375×812`，输出原始 PNG 为 `563×1218`；模拟器窗口为“重庆天才俱乐部的模拟器”，裁剪参数为 `x=11, y=93, width=563, height=1218`。截图已人工检查为完整家长日程画面，不是黑屏或普通桌面截图。
- 回归测试覆盖 Windows 选择窗口路径、SDK 截图超时不发布证据、错误标题拒绝和 ASCII-safe 元数据；Windows 之外仍使用官方 SDK 的截图路径。后续可直接运行 `pnpm --filter @football-club/miniprogram-cq-talent devtools:screenshot -- --output <仓库外绝对路径>.png --expect-route-prefix /pages/parent/ --port 9421` 获取同类证据。
- 约束：仅允许一个可见模拟器窗口；多个窗口时设 `WECHAT_DEVTOOLS_SIMULATOR_TITLE`。无论窗口捕获、路由复核、视口验证或 PNG 尺寸验证中的哪一步失败，最终 PNG 与 sidecar 均不得发布。此工具只解决可信取证通道，不代替将截图与当前在线 Figma 节点逐页对照的视觉验收。

## 2026-08-09 全页级 Figma↔实页巡检（17页）+ 4 项修复
- 巡检方法：miniProgram.screenshot 直出 375x812（免窗口遮挡），17 页首屏+滚动下半部全采，vision 逐页缺陷扫描后对照 design-spec 确认
- 修复1（c05e82f）：比赛英雄卡——比分槽渲染「比赛结束后更新」长文案在 96rpx 字号下换行溢出卡片（440rpx 固定高）；时间地点 `<br>` 不生效粘连。修为 scoreText 非比分格式回落 "0 : 0"（对齐设计未开始态）+ dateText 只保留「日期+开始时间」+ 时间地点改双 view 纵排
- 修复2（同 commit）：训练英雄卡时间行对齐设计「09:00-10:30 · 6月28日」（时间段在前），消除 API 字段「日期 时间 · 时间~时间」重复
- 修复3（同 commit）：提醒中心空态双渲染（status-view + 自定义图标块）→ 只留设计规格的图标版
- 修复4（bda7b3b）：雷达页维度列表泄漏第9行「射门综合评分 3」（遗留 metric-finishing 不在核心雷达视图）→ 按 growth.views[0]（核心能力雷达8维）过滤，综合评分 68→76 回归8维口径；与 growth 页 radarForView 同款逻辑
- 非缺陷确认：content 文章卡左侧色条=设计原样；coaches 滚动中内容经过固定 tab 栏下方=正常；growth 芯片/日程banner标题省略号=设计防溢出；雷达图在 mp.screenshot 中不显示=canvas 采集限制（dxcam 验证正常）
- 证据：cq-talent-visual-evidence/audit-*.png（17页+滚动）、fix-event-match2.png、fix-event-training.png、fix-reminders.png、fix-radar-scoped.png

## 2026-08-09 成长页雷达预览真实数据化（2 commits）
- 1fe9d8b feat：雷达预览卡从静态装饰图形（固定六边形+假多边形）改为真实数据渲染——TS 计算 N 边形顶点百分比注入内联 clip-path；副标题「6维度」改真实维数「8维度」
- e4294d0 fix：补回网格环/基准多边形/维度标签，对齐点进去的详情页观感。关键教训：**clip-path 下 border 不绘制**（纯描边元素整体消失），轮廓线一律用「外多边形实心底+内缩盖面」双层叠加模拟
- 验收：fix-growth-realradar3.png 4/4 通过（4圈网格环✓ 8轴线✓ 红色描边多边形+外部网格可见✓ 8标签无重叠✓）；门禁 typecheck+51 tests 全绿

## 2026-08-10 Figma 全页实现：家长 P7 / P7.1 / 服务页收口

- 设计权威：`zZ6wKyOHKcO4UYXDd9jGwv`。本轮完成并独立提交 P7 孩子档案、P7.1 训练与保障、P8 内容中心、Venues、P8.2 帮助中心、Coach Team；对应任务记录均已归档。
- P7/P7.1（`f05fff8`）：孩子档案仅显示真实课时状态及孩子日程；训练记录仅计入明确关联当前孩子的训练；未知保险为“待同步”。`student-home` 请求错误进入页面 error state，不再回退到虚构课时或保险数据。
- 服务页（`b783782`、`ebb5f52`、`ac97d4c`、`8da7ff0`）：文章、场馆、FAQ 与教练团队都只展示已有 API 契约的字段；搜索、文章详情、客服、电话、虚假地图导航、默认球队名、合成角色/目标与直接联系均不伪装为可用。
- 验证：最后一次全仓门禁通过——领域 18、API 68、小程序 98 测试；类型检查通过。门禁首次运行曾出现 `apps/api/test/persistence.test.ts:13` 单条 5 秒超时，单独复现 9/9 通过，随后完整门禁重试通过；该现象须在后续稳定性工作中单独跟踪，不能归因于本轮页面改动。
- 当前全页实现目标已继续进入下一批（P9/P9.1）；项目总体已豁免真实设备截图作为阻塞条件，但本轮没有新增运行态视觉验收结论。

## 2026-08-10 C10.1 教练覆盖预览

- 在线 Figma 唯一基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:983 / C10.1 Coverage Preview`；新增教练覆盖预览页，采用本地粉色顶栏和教练训练 Tab。
- 页面仅在真实 coach 会话下读取 `GET /coach/training-coverage`；无 coach 角色不发请求。学员、维度、覆盖数和分数均来自真实响应；`scorePercent: null` 显示“待同步”，`0` 保持真实零值。
- Figma 底部确认示例没有写入契约，因此未实现伪确认、伪保存或硬编码覆盖数量；请求陈旧保护、空态、错误态和重试均有覆盖。
- 验证：focused Vitest 5/5、Mini Program typecheck、Trellis task validate、diff check 均通过；本批未进行真机/DevTools 截图验收。
- 代码提交：`01ea5f4 feat: align coach coverage preview with C10.1`。任务归档与会话日志待后续独立提交。

## 2026-08-10 Test-Metric SQLite Persistence and Parent Readback

- Code commit: `269611c feat(api): persist assessment metrics across restarts`. Assessment, raw-result, score, metric-record, and metric-lineage rows now persist in one SQLite transaction; seed replay inserts missing records without replacing saved assessment data.
- The restart merge now hydrates persisted assessment IDs before the in-memory ID counters initialize. A second assessment POST after reopen stays a distinct `201` instead of reusing an ID and returning `400`; no idempotency contract was added.
- Fresh controlled HTTP proof used a SQLite database outside the repository. PID `43400` returned health `200` and coach assessment POST `201`; only that PID was stopped. PID `43908` reopened the same database and returned parent `growth-summary` `200` plus `ability-metrics/metric-finishing` `200` with the non-seed `assessment-2` / `assessment-raw-result-1` / `metric-finishing` relation and `metric-lineage-1`, with no duplicate relation.
- Checks: API focused Vitest `59/59`, API typecheck/build, mini-program Vitest `262/262`, mini-program typecheck, and scoped `git diff --check` all passed. This batch makes no new P5/radar visual-acceptance claim.

## 2026-08-10 Coach Attendance Persistence Archived

- Implementation commit `6526fe4` persists attendance status and note in SQLite without changing the attendance API contract, authorization, idempotency conflict handling, or the present/late lesson-debit rule.
- Evidence separates local and production: local file-backed `dist` restart preserved a non-empty note and status with exactly one participant record; the recorded production marker-note PUT survived one `cq-talent-api` container restart on the same named SQLite volume and was then restored.
- Fresh review confirms no uncommitted attendance-task files. C4 real-coach `375x812` screenshot evidence remains absent and is explicitly not reported as complete; under the current project goal it is nonblocking for this persistence-task archive.

## 2026-08-11 Acceptance Identity Runtime Binding Repair

- Root cause: the fixed dual-role acceptance seed used a deterministic synthetic fixture phone on each restart, while real WeChat login resolves the currently authorized phone. The database therefore returned `binding_required` even though the intended user and membership were active.
- Commit `d472307` adds private runtime override `FCM_CQ_TALENT_ACCEPTANCE_PHONE`; it is applied only to the fixed acceptance user and its matching parent profile. The value is not stored in the repository, test fixtures, deployment notes, or logs.
- Verification: focused fixture regression first failed against the old seed and passed after the fix; full root check passed (domain `19/19`, mini-program `278/278`, API `85/85`).
- Production: a new isolated tracked release was built after a restricted SQLite backup. The API was restarted with the private WeChat runtime credentials and acceptance-phone variable. HTTPS health returned `200`; the acceptance user and parent profile matched the configured phone, and both user and club membership were active with `parent` + `coach` roles. A fresh real WeChat authorization remains the required final device-side confirmation.

## 2026-08-10 Figma 49-State Completion Audit

- The current online authority `zZ6wKyOHKcO4UYXDd9jGwv` was rechecked as 49 business states: Parent 21 and Coach 28. CODE frames, ordinary internal frames, and `93:877 / LEGACY C7` are excluded; C7 uses `233:2 / C7 MVP`.
- Sol's final audit mapped all 49 states to completed implementation/task records and commits. Historical task-parent links that were missing from the audit tree were restored; the active phone-authorization single-flight guard was unlinked because it is a separate functional follow-up, not an unimplemented Figma state.
- Test-stability remediation: the two file-backed SQLite restart integrations now use local `15_000` ms budgets after measured full-suite runtimes exceeded Vitest's 5-second default. Global timeout remains unchanged. Fresh root `check` exited `0`: domain `19/19`, mini-program `262/262`, API `78/78`.
- Completion claim boundary: the 49-state implementation scope is complete. This does not claim pixel-level equality, universal DevTools/device screenshot coverage, or complete runtime visual acceptance.

## 2026-08-10 Parent Schedule Live Date and Calendar Boundary

- Fixed the parent schedule's develop-only historical default: parent schedule and parent day now use the real local device date unless `DEV_PARENT_PAGE_DATE_OVERRIDE` is explicitly set in shared configuration. The override is `null` by default and is unavailable outside develop.
- Parent calendar and parent student schedule now validate date ranges and interpret date-only `to` as the exclusive start of the following UTC day. This includes Sunday daytime activities, excludes the following Monday, rejects malformed/reversed/over-31-day ranges with `400 invalid_date_range`, and retains guardian participant redaction.
- Parent schedule now provides previous/next week controls; each moves the selected date by seven days and reloads the corresponding Monday–Sunday BFF interval. No activities are fabricated for empty weeks.
- Verification: focused API regression passed after a recorded red failure; mini-program date/week tests passed after recorded red failures; API and mini-program type checks passed; root `check` passed with domain `19/19`, mini-program `264/264`, API `79/79`; `git diff --check` passed. No visual or production deployment claim is made by this entry.
- Dual parent/coach role switching remains a separate planning task. Terra review blocked implementation until sessions can survive API restart/multi-instance use and every bearer request revalidates active membership and role availability.

## 2026-08-11 双角色日常切换入口

- 在线 Figma 权威文件 `zZ6wKyOHKcO4UYXDd9jGwv` 已新增 `RoleSwitchEntry` 组件集（`304:14`），并放置到 P7 孩子档案（`93:336`，实例 `305:340`）及 C16 教练“我的”（`93:1182`，实例 `305:430`）。两处均显示“当前身份 / 家长端或教练端 / 切换 ›”。
- 小程序将入口从隐藏账户项提升为日常入口：家长 P7 的孩子卡下、教练 C16 的资料卡下；只有 `availableRoles` 含另一真实角色时显示。切换继续调用后端 role endpoint，保存服务端轮换后的完整 session 后才跳转，单角色账号没有入口。
- 验证：定向 Vitest 54 文件、278 用例通过；小程序 TypeScript 检查通过；`git diff --check` 通过。在线 Figma C16 节点截图已复核。尚未取得本轮小程序 375×812 DevTools/真机截图，故不作运行态视觉验收结论。

## 2026-08-11 家长成长切换与演示历程数据

- 根因修复：成长页从右上角齿轮的学员绑定页返回时，绑定页此前只写入 `activeStudentId` 缓存，未同步内存中的 authenticated session，因此成长页仍按旧学员请求。现改为复用 `setCurrentStudentId`；成长页 `onShow` 检测到 session 学员变更后重新读取该学员的成长、指标和最近 30 天活动，并忽略陈旧异步响应。
- 训练历程页改为使用真实本地日期和 API 支持的最近 30 个自然日，不再在开发环境请求历史锚点和超过 API 上限的一年范围。
- 在既有双角色验收家庭中新增两次带“演示”标识的已完成训练（控球协调、传接射门）。该家庭现有最近 30 天 3 次已完成训练和 1 场已完成比赛；成长页摘要、最新成长足迹和训练历程文案均从真实日程响应计算，不伪造前端数据。固定 ID 回滚清单、测试期望同步扩展为 6 个演示事件。
- 验证：先记录绑定页回归测试失败，再修复；小程序 Vitest `54 files / 281 tests`、小程序 typecheck、API focused Vitest `9 files / 85 tests`、API typecheck 通过。尚未做本批 375×812 运行态视觉验收。
- 生产发布：提交 `688d1af` 已在受限 SQLite 备份后发布到 `https://cqtc.pomi.tech`。HTTPS health 为 `200`；容器内微信凭据和验收绑定变量均只核验“已配置”，未读取其值；6 条固定演示日程存在，其中 3 条为已完成训练。真机仍需重新编译小程序后自行查看，本文不作视觉验收结论。

## 2026-08-11 P4 成长足迹与训练历程结构复原

- 依据在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:250 / P4 Growth Home`，将错误的两段居中占位文字恢复为两种卡片结构：成长足迹的“更多”入口及三条状态项、训练历程的趋势柱与时间轴。
- 三条状态和八个柱均由当前学员最近 30 天的真实完成训练/比赛及真实雷达数据预计算；无活动只显示“待达成”状态和最小基线，不伪造完成记录。
- 验证：P4 目标回归与完整小程序 Vitest `54 files / 281 tests`、小程序 typecheck、`git diff --check` 通过。本批尚无新的 375×812 真机/DevTools 对照截图。

## 2026-08-11 教练端验收演示数据扩展（已部署）

- 为使教练端 C1–C16 有足够的真实 BFF 数据可检查，opt-in 的重庆天才双角色验收 seed 将演示队从两人扩展为八名既有 synthetic club 学员；新增六人只加入教练队、六条既有演示日程、已完成比赛、能力评测和战术名单，不新增任何家长监护绑定。
- 家长端隐私边界保持不变：真实角色切换后的 `parent/children`、`parent/calendar` 和活动详情参与者仍只投影原两名被监护孩子；教练端战术板可读取完整八人名单。没有新增小程序 mock、伪 API、伪角色或伪 session。
- 回滚收窄为固定 `metric-record-cq-talent-demo-*` 记录，不再按该体验教练删除全部指标，因此同俱乐部的非演示指标和其他俱乐部/客户端记录均保留。
- 验证：先观察到旧两人 seed 使新增 fixture/server 回归按预期失败；最小实现后 API focused Vitest `59/59`、API typecheck、API build 和 `git diff --check` 均通过。生产发布前已将独立 Docker SQLite 数据卷备份到受限目录；提交 `034b51b` 的发布镜像已构建并以单实例方式重启。`https://cqtc.pomi.tech/health` 返回 `200`，只读计数确认线上已有 8 名演示队员、6 个演示事件、48 条参与记录和 64 条能力指标。本条不构成真机视觉验收。

## 2026-08-11 C8 训练管理真实统计与 Figma 收口

- 在线设计权威：`zZ6wKyOHKcO4UYXDd9jGwv / 93:896 / C8 Training`。训练页深色 hero 调整为 180px、20px 内边距、2×2 的 64px 统计卡；Tab 为 48px，列表左右 22px，训练卡最小 114px。页面仍使用现有角色导航与安全区处理。
- 数据契约：`GET /coach/team` 新增 `stats.completedTrainingCount`。它只计算当前教练名下、状态明确为 `completed` 的训练活动；管理员按现有教练端授权范围统计全部已完成训练。原 `trainingCount` 仍是近 30 天窗口，未被误标为累计课时。出勤率、在队人数和本月比赛继续来自各自已有的真实 BFF 响应。
- 演示数据与回归：双角色验收教练名下已有 3 节已完成训练、1 场已完成比赛、后续训练与战术比赛；新增集成回归断言教练会话读取的累计课时为 3。完整门禁通过：领域 19/19、小程序 294/294、API 85/85，全部 typecheck 与 `git diff --check` 通过。
- 生产部署：提交 `dc11b5c` 已在独立 SQLite 卷备份后发布至 `https://cqtc.pomi.tech`；容器重建后内部健康检查和 HTTPS `/health` 均返回 `200`，容器重启计数为 0。本条仍不构成 375×812 运行时视觉验收。

## 2026-08-11 C1/C2 教练日程与工作台第一批收口

- 在线设计基准：C1 `93:578`、C2 `93:606`。C1 保留真实日程/周切换和 Hero，但给时间行中的真实长活动标题补上弹性截断约束，避免挤压时间。
- C2 移除与画板不符的顶部路由 Tab，恢复 Figma 底部 70px 教练导航；深色活动卡调整为 140px 最小高度，三列操作卡为 100px 最小高度，避免动态操作名称造成卡片重叠或溢出。业务接口、活动路由与写入规则未改。
- 验证：C1/C2 聚焦小程序测试 16/16、类型检查和 `git diff --check` 通过。尚未取得本批 375×812 运行时截图，不作视觉验收完成结论。

## 2026-08-11 C3 变更活动表单收口

- 在线设计基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:634 / C3 Activity Change`。真实变更申请流程未变；内容区改为 22px 双侧内边距、12px 白色卡片、44px 日期/场地输入控件与 80px 说明框，继续保留 Figma 的柔和顶栏和底部教练导航。
- 验证：C3 聚焦测试 6/6、全仓门禁通过（领域 19/19、小程序 295/295、API 85/85）、类型检查和 `git diff --check` 通过。截图命令在 49 秒后超时且未产生 PNG，因此 C1/C2/C3 的 375×812 运行时视觉验收仍明确待补。

## 2026-08-11 C7 战术板与完整演示名单

- 在线设计基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 233:2 / C7 MVP`。提交 `eaf8b73` 将 C7 的球场结构收敛为 351×430 的绿色场地、边界线与中线、40px 红色球员圆点、替补席和 48px 双操作按钮；旧的中圈、禁区框、圆点外姓名/位置文字和投影被移除。页面继续只读取真实 tactical-board 响应，保存、拖动、换人、重置及只读规则未改为前端伪状态。
- 演示名单扩展为 16 名确定性的既有 synthetic 学员：11 名首发和 5 名替补，六条既有演示日程各有 16 位真实参与者，指标记录为 128 条；没有增加任何家长监护绑定，家长投影仍保持两名孩子。
- 生产在受限 SQLite 备份后发布 `eaf8b73` 与兼容修复 `55d2036`。线上数据库只读确认 16 名队员、6 个事件、96 条参与、128 条指标；此前已保存的两人战术板不被覆盖，读取时安全补齐缺少的 14 人，用户下一次保存才会写回完整名单。容器无重启，内网与 `https://cqtc.pomi.tech/health` 均为 `200`。
- 验证：先记录旧实现对 16 人 roster 和 C7 几何的失败测试；全仓门禁通过（domain `19/19`、mini-program `293/293`、API `85/85`）且 `git diff --check` 通过。本批尚未取得新的 375×812 真机/DevTools 截图，因此不宣称运行时视觉验收完成。

## 2026-08-11 C4 快速点名真实数据与 Figma 收口

- 在线设计节点：`zZ6wKyOHKcO4UYXDd9jGwv / 93:665 / 93:696 / 93:715`。C4 使用粉色共享顶栏、深色活动摘要、40px 快捷操作、紧凑名单和教练底部导航；C4.1 仅保留课程、日期、出席、时间四项真实回读摘要与单一主操作。C4.2 采用警示卡、逐人更正和底部提交的真实通用更正态，不伪造 Figma 示例中的家长异议、异常人数或全局更正说明。
- 数据契约：`confirmed` / `invited` 属于活动 RSVP，进入 C4 时被规范为 `pending`，因此教练必须选择真实出勤状态后才能写入；写入层仍只接受 `present`、`absent`、`late`、`leave_requested`、`excused`。显式空备注会传到 API，允许真实清除已存备注。
- Opt-in acceptance seed 的完成训练现在有 16 名真实队员：10 到课、2 迟到、2 缺席、1 请假、1 免扣；未来训练的 16 个 RSVP 仍是后端持久化 `confirmed`，供 C4 演示待点名。新增 file-backed SQLite 回归：coach workbench 读到完整分布，真实 PUT 后重新 GET，再关闭和重开数据库后仍读回相同状态与备注。家长投影继续严格只有两名被监护孩子。
- 验证：先记录 RSVP/空备注/状态分布的失败测试，后通过小程序 21 项聚焦测试、API 59 项聚焦测试、两端 typecheck 与 `git diff --check`；提交前完整仓库门禁亦通过：领域 19/19、小程序 297/297、API 85/85。本批尚未取得可信的 C4/C4.1/C4.2 运行时截图，因此不作视觉验收完成结论。

## 2026-08-12 C5 课时确认与更正真实数据收口

- 在线 Figma 唯一基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:734 / C5 Lesson Confirm` 与 `93:765 / C5.1 Lesson Correction`，均为 `375x812`。C5 复用粉色 88px 顶栏、深色活动摘要、紧凑名单、52px 确认按钮和教练 Tab；C5.1 复用警示卡、紧凑可更正名单、真实学员标识和底部保存区。
- 数据边界：C5 继续只调用既有 `GET workbench` + `GET lesson-confirmation`，写入仍为既有 `POST lesson-confirmation`；C5.1 写入仍为既有带幂等键的 `PATCH lesson-confirmation`。角色守卫、BFF 的 coach/event 授权、持久化账本和写后重新读取均未替换。Figma 没有备注/更正原因输入，页面不再渲染它们；服务端原有审计默认值与可选字段契约仍保留，未加入伪造说明。
- 演示数据：opt-in acceptance SQLite 种子已有 16 名教练可见学员及真实课时余额；即将开始的训练可经正常确认 API 产生账本记录，随后可经正常 PATCH 更正。种子为 insert-if-absent，只影响全新验收数据库；本批未重置、迁移或修改任何线上数据库。
- 验证：先记录 C5/C5.1 Figma 结构的失败测试，再通过页面 Vitest 15/15、API lesson/seed 相关回归 59/59、两端 typecheck 和完整仓库门禁：领域 19/19、小程序 300/300、API 85/85；`git diff --check` 通过。尚未取得新的可信 375x812 运行时截图，故不作视觉验收完成结论。

## 2026-08-12 C6 比赛记录、录入事件与本地草稿收口

- 在线 Figma 基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:796 / C6 Match Entry`、`93:827 / C6.1 Add Match Event`、`93:858 / C6.2 Save State`。C6 统一为 16px 页面边距、深色比赛摘要、白色事件卡、红色描边“+ 添加事件”、中性“比赛总览 / 事件记录”分段标签和按真实事件类型预计算的时间线色标；C6.1 收口为能力契约驱动的事件类型、白色表单卡、48px 控件和红色提交按钮。未把 Figma 样例中的换人、其他、半场比分或比赛计时伪造为现有 BFF 不支持的业务能力。
- 可验证数据：重庆天才 opt-in 验收种子中的已完成友谊赛为 `event-cq-talent-demo-match-completed`，16 名真实种子队员、最终比分 `3:2`；事件为第 22 分钟进球和助攻、第 37 分钟黄牌、第 64 分钟扑救。所有事件均引用该场比赛的真实名单成员；现有家长监护投影边界未扩大。
- 安全与持久化边界：生产环境忽略 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`，不会因该变量写入或重置生产数据。C6.1 仍严格要求 API 返回 HTTP `201` 才视为创建成功；事件创建的独立 SQLite 重启回归覆盖首次写入、相同幂等键重放、冲突以及重开后恰好一条记录。C6.2 仍只是设备本地未提交草稿，不冒充服务端自动保存。
- 验证：Terra 审查通过；聚焦 Vitest `41/41` 通过；完整仓库门禁通过（领域 `19/19`、小程序 `303/303`、API `85/85`，两端 TypeScript 均通过）；`git diff --check` 通过。本批未取得新的可信 375x812 运行时截图，因此不宣称 C6 视觉运行时验收已完成。

## 2026-08-12 C12 项目评分录入真实多指标收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1030 / C12 Project Score Entry`。页面从“单一项目、逐人纵向录入”收口为画板的深色 96px 任务摘要、待录入学员卡、最多四列紧凑指标格和固定保存区；教练底部导航与本机草稿恢复弹层仍保留。
- 数据边界：每个学员卡仅投影当前真实评分分组中连续的最多四个字段，标签、输入类型、单位、值、缺测状态、完成数和写入键均来自 `workbench`、`assessment form` 与本机草稿。字段多于四个时，既有真实分组/项目选择仍可访问后续字段；不复用 Figma 样例中的姓名、成绩、截止时间或总分。每个输入框携带自己的真实 `testItemId`，不会误写到当前分组第一项。
- 真实演示数据：opt-in 重庆天才验收种子已有教练可见的 16 名队员、可用评测模板和已持久化能力指标；C12 只为具备真实模板的活动读取并提交成绩，不新增假评测或修改线上数据。
- 验证：先记录 `metricCells` 缺失及输入错误绑定的 RED 失败，再通过 C12 聚焦 Vitest `15/15`、小程序 TypeScript 和完整仓库门禁（领域 `19/19`、小程序 `306/306`、API `85/85`）；`git diff --check` 通过。本批未生成新的可信 375x812 运行时截图，故不作运行态视觉验收完成结论。

## 2026-08-12 C14 团队能力总览重叠修复

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`。此前 C14 深色雷达卡只有 `520rpx`（260px），而画板为 520px；雷达、综合分和空态又处于独立绝对定位，导致用户截图中的文字重叠。现改为画板同等的 `1040rpx` 高卡片、720rpx plot、620rpx×600rpx 雷达区域，以及纵向的雷达/综合分组合。
- 状态边界：有足够真实维度时才渲染雷达、综合分和趋势；维度不足时只渲染居中的“暂无足够维度生成雷达图”，不会叠加综合分或趋势。团队、维度统计、趋势和排名不可用提示继续完全来自既有 `team-ability-overview` / `coach team` 响应，不新增样例数据、排行或导出能力。
- 验证：先记录旧结构不具备雷达态容器、尺寸与互斥空态的 RED 失败；随后 C14 聚焦 Vitest `5/5`、小程序 TypeScript、完整仓库门禁（领域 `19/19`、小程序 `306/306`、API `85/85`）和 `git diff --check` 均通过。本批尚未取得新的可信 375x812 运行时截图，故不作视觉运行态验收结论。

## 2026-08-12 C16.4 帮助中心顶栏对齐

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`。帮助中心 88px 粉色顶栏增加与 24px 返回区等宽的无交互右侧占位，使标题在可用中轴居中；不改变 FAQ、搜索、分类或支持卡的数据来源与功能边界。
- 验证：先记录顶栏缺少等宽占位和居中标题的 RED 失败；C16.4 聚焦 Vitest `4/4`、小程序 TypeScript、完整仓库门禁（领域 `19/19`、小程序 `306/306`、API `85/85`）和 `git diff --check` 通过。本批未取得可信 375x812 运行时截图，因此不作视觉运行态验收结论。

## 2026-08-12 教练端真实演示数据复核

- 为继续逐页复原而复核了现有的后端验收数据。它不是小程序 mock：在明确隔离的非生产 SQLite 中，`FCM_CQ_TALENT_ACCEPTANCE_SEED=1` 会提供 16 名教练可见队员、6 条固定活动（3 节已完成训练、1 场已完成比赛、1 节待办训练、1 场待办战术赛）、五种出勤状态、8 维能力指标、训练项目树、评测任务、完整比赛事件与战术名单。
- 隐私边界保持不变：教练可见的额外 14 名队员未获得家长监护绑定；家长投影仍只返回原有 2 名孩子。C16.1 权限和 C16.2 私教意向仍是明确标注的本地/展示状态，未被伪装成服务端持久化数据。
- 验证：API focused Vitest `test/cq-talent-fixtures.test.ts` 与 `test/server.test.ts` 共 `59/59` 通过。file-backed SQLite 回归包含真实会话角色选择、家长数据脱敏、出勤写入读回、评测写入、战术板保存与 API 重启后读回。
- 生产安全：验收 seed 在 `NODE_ENV=production` 下被代码禁止加载；不以启动带 flag 的方式写入生产或共享库。当前 DevTools 截图通道已成功生成真实 375×812 登录页 PNG，但本审计尚未用真实教练会话采集新页面，因此以上是数据/API 证据，不构成新的视觉验收。

## 2026-08-12 C2 教练活动工作台结构复原

- 在线 Figma 唯一基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:606 / C2 Activity Workbench`。C2 的设计是 88px 白色顶栏下紧跟 70px 的页内“日程 / 训练管理 / 我的”导航，而不是固定底部 Tab；该差异只在 C2 页面落地，未改共享 `role-tabbar` 或其他教练页。
- 操作区从带“可用操作”外壳和彩色胶囊的卡片网格收敛为 Figma 的白底图标卡。图标由 TS 为已有真实操作预计算，操作数量、名称、可用性和跳转仍完全来自真实 `CoachWorkbench`；超过三项自动换行，不新增画板样例中的倒计时、结束训练、出勤 18/20、学分或虚构进度。
- 验证：先记录 C2 对“页内导航 + 中性图标操作卡”的 RED 失败；随后 C2 聚焦 Vitest `8/8`、小程序 TypeScript、完整仓库门禁（领域 `19/19`、小程序 `306/306`、API `85/85`）与 `git diff --check` 均通过。模拟器当前停在真实登录页，故本批未取得新的已登录教练 375×812 截图，不作视觉验收完成结论。

## 2026-08-12 任务#5 收敛：单一主线收口
- 诊断：9720b40≡fb1e268（hunk 一致）、b903456 patch-等价已在主分支、唯一独有 e83c4ae 已 cherry-pick 为 63961cf
- master 快进至 63961cf = codex/chongqing-talent-business（单一主线）；两个 hotfix worktree+分支已清
- 遗留：手机号回归测试单跑 28.6s，并行下 flake（非逻辑失败）

## 2026-08-12 任务#6 外部验证 + 分支模型收敛 + 慢测试修复
- 分支模型：单 master（本地+远端已同步 1b335a8）+ dev 测试分支（32039ef）；12 个远端 codex/* 旧分支已删（内容全包含验证后）；origin/main 被 master 全包含但属 GitHub 默认分支，需改默认后才能删
- 慢测试：persistence.test.ts 三个文件库用例显式超时（手机号回归 90s，attendance/assessment 30s），统一 options 写法消除与结尾第三参的旧超时冲突；根 check 并行下 429 全绿
- 任务#6：3000 端口公网暴露已外部验证关闭（直连 43.136.114.225:3000 不可达，https://cqtc.pomi.tech/health 200）；compose 漂移=18e1692 已把服务器两处手改（loopback 绑定+env_file）提交回仓；剩余服务器侧逐字节比对需 SSH 私钥

## 2026-08-12 任务#6 收口 + origin/main 删除（六项任务全部完成）
- origin/main：默认分支已通过 GitHub API 改为 master，main 已删；远端最终=origin/master + origin/dev 双分支
- 3000 端口三重验证闭环：外部直连 000 不可达 + docker ps 显示 127.0.0.1:3000->3000 + ss 仅 127.0.0.1:3000 LISTEN
- compose 漂移=0：服务器运行配置 /opt/cq-talent-releases/18e1692/docker-compose.yml 与仓库 docker-compose.yml 逐字节一致
- 服务器访问：ubuntu@43.136.114.225 密码认证可用（注意密码已出现在聊天记录，建议择机轮换）

## 2026-08-12 测试账号登录受限根因与修复
- 现象：已授权的测试手机号能选身份但选家长后落「账号暂时受限」页
- 排查：生产库三账号 users/memberships(parent+coach,active)/parent_profiles/guardian_bindings/student_profiles 全部完好；登录 children 链路=listStudents(实时 SQLite LEFT JOIN operational)×isGuardianOfStudent(内存 this.data)
- 根因：PersistentApiStore 启动时 mergePersistedPlatformData 快照合并 parents/guardianBindings；任务#4 导入(19:06)晚于 API 进程启动（#3 重启验证在 #4 之前）→ 运行进程内存快照无导入绑定 → isGuardianOfStudent=false → children=[] → parent_without_children
- 修复：docker restart cq-talent-api（重建快照），health 200 日志干净；三个账号同一根因一并修复
- 架构教训：secure-test-accounts 导入后必须重启 API 才生效（内存快照启动时合并）；另观察：导入命令不创建 student_operational_profiles（登录不依赖，但学员运营字段视图会空）

## 2026-08-12 三个测试账号数据丰富化（192 行）
- 备份：/var/lib/cq-talent/api-backup-pre-enrich-20260812.sqlite（VACUUM INTO，写前一致性快照）
- 每账号新增：8 日程（4 已完成训练/友谊赛+3 未来训练+1 未来联赛，中文标题+备注，Asia/Shanghai）×2 孩子参与；8 核心雷达维度 ×（训练观察+周期评测）=16 条 metric 记录/孩子；运营档案（学校/区域/在读/课时余额21/保险期）；保险单（太平洋保险至 2027-01-15）；课时台账（充值24+余额21快照）
- 三账号对称共 192 行，ID 全部带 secure-test 命名空间可识别清理；FK 约束逐一核对（payment_event_id 置 null 避开不存在引用）
- 注意：这些行不在 secure-test-accounts 命令 canonical manifest 内，未来 rollback 不会自动清理，需按 %secure-test% 手动清
- 已重启 cq-talent-api 刷新内存快照，health 200，读回核对三账号数据对称完整

## 2026-08-12 测试账号数据铺满最近一个月（再+168 行）
- 每账号再补 8 个 7 月中下旬已完成事件（每周 2 训练+双周赛：07-14/17/19/21/24/26/28/31）×2 孩子参与；每孩子再补 2 轮 8 维度 metric 记录（07-22 训练观察 + 07-29 周期评测）
- 全账号事件跨度 2026-07-14 ~ 2026-08-17（过去一个月每周有数据+未来一周排期）；测评时间线 07-15/07-22/07-29/08-05 四个采样点
- 运营档案 total_checkins 同步为 10；重启 health 200


## 2026-08-12 深夜：未来赛事出勤修正 + Figma 复原开工
- 数据修正：24 行未来赛事（08-13/15/16/17 三个账号各 2 孩子）event_participants.status 由 confirmed 改为 enrolled（已完成赛事保持 confirmed）；已重启 API 刷新内存快照，health 200
- 原因：未来赛事显示"已到场"不符合实际，家长端活动详情页出勤卡应按状态待确认呈现
- Figma 复原开工：在线画板 id 映射固化 docs/design/specifications/figma-online-frame-map-2026-08-12.md（P1 在线已重设计为 269:250，新增 P1-Empty 269:479；本地旧 fig-out.json 部分 id 已失效）
- P1 Schedule Home 已对齐新设计（周历去箭头、今日红圈/选中深色圈双高亮），提交 4e0bd64，375x812 截图验收通过
- 教训：DEV_AUTO_SESSION 对生产 API 无效（生产硬关 x-user-id 头鉴权）且伪造会话残留 wx storage 致持续 403；补救=clearStorage+干净重启；生产页面验收必须真实微信会话
- 截图工具链：automator reLaunch/navigateTo promise 挂起，须走 callWxMethod('reLaunch') 通道（tmp/prod-verify/mp-route-shot.cjs 已封装，当前自动化端口 9428）

## 2026-08-13 家长端导航补齐 + 内容中心整页空态根因修复

### 已提交（5 个提交）

- `d674b15` 家长端底部导航从三格补为设计稿的四格：新增 `discover` 图标与 `ROLE_TABS` 条目，内容/场地/帮助/教练团队/私教申请及结果页此前只能高亮「我的孩子」，现改为高亮「发现」。同时新增 `openTab` 走 `reLaunch`：tab 根页之间原用 `navigateTo`，页面栈会持续堆叠且超过 10 层后静默失败；`openPage` 的失败回调也降级到 `reLaunch` 兜底。
- `df7085f` 三处入口缺口修复：日程页训练任务原跳 `/coach/training/index?eventId=x`，但训练管理页是 tab 根页、不读 `eventId`，点进去等于丢上下文，改跳 `content-select`；`lesson-correction` 与 `test-tasks` 两页在 `app.json` 注册但全站无入口，分别由课时确认页「发起更正」和训练管理页「测评任务」页签接入。
- `d7a3309` 内容中心/场地/活动详情对齐设计稿：文字图标块换线性 SVG、补推荐大图卡、场地卡补实景图、地址行 emoji 换 `map-pin` 图标；活动详情训练类出勤区改「线下确认」文案，不再暗示 APP 内可确认出勤；tokens 补 `--space-page`。
- `2613721`、`1ab6785` DevTools 工具链收编进仓库：`scripts/devtools/` 下 `mp-route-shot.cjs`、`mp-batch-shot.cjs`、`mp-eval.cjs`、`mp-smoke.cjs`、`page-data.cjs`、`focus-devtools.ps1`、`sidebyside.py` 加使用说明与已知坑。批量截图在单连接内跑完整条路由清单，比每页重连快一个量级。

### 未提交：内容中心整页空态根因修复

- 现象：内容中心点进去整页空白，只有顶栏。
- 根因：`state` 把「加载失败」和「文章列表为空」混为一谈——文章数为 0 时置 `state: "empty"`，而 WXML 把分类导航、推荐卡、快速入口四格等**静态设计内容整体挂在 `state === 'ready'` 之下**，于是后端返回空文章列表会连带擦掉整页。页面本已有 `hasVisibleArticles` / `emptyMessage` 字段，但在旧逻辑下是不可达的死代码。
- 修复：加载成功一律 `state: "ready"`；文章数为 0 只驱动「最近文章」段内的空提示。测试同步改为断言段级空提示，并加结构守卫防止静态块再次被文章数据门禁。小程序 Vitest `54 files / 307 tests` 通过。
- 验证：模拟器实测 `state: "ready"` / `articles: 0`，整页正常渲染（顶栏、分类 pills、推荐卡、快速入口四格、最近文章段内空提示、四格底栏且「发现」高亮）。

### 「除教练团队外都没内容」根因（数据侧，未修）

用户报告快速入口点进去大多没内容。逐个接口实测（真实会话，Bearer 不记录）：

| 接口 | 结果 |
|---|---|
| `/content/articles` | `200` `{"articles":[]}` |
| `/content/faqs` | `200` `{"questions":[]}` |
| `/venues` | `200` `{"venues":[]}` |
| `/coach-team` | 有真实数据 |

根因：`contentArticles` / `contentFaqs` / `venues` 三个集合**只存在于验收 seed** `apps/api/src/seed/cq-talent-acceptance.ts:653`（4 篇文章、5 条 FAQ、3 个场地），而该 seed 在 `apps/api/src/seed/index.ts:44` 被限制为 `NODE_ENV !== "production"` 且 `FCM_CQ_TALENT_ACCEPTANCE_SEED === "1"`，**生产按设计永不加载**，因此线上三个集合为空。教练团队页有内容是因为 `coach-team` 路由（`apps/api/src/routes/app-client.routes.ts:2097`）读的是 `listTeams` / `listCoaches` 运营实体表，那里有 2026-08-12 补数写入的真实数据。

结论：这不是页面渲染缺陷，页面的空态、跳转与入口都是对的（`venues`/`help`/`coaches` 三页的整页空态是这些页面本身没有静态设计内容，与内容中心的情况不同，属正确行为）。属内容运营数据缺失。待用户裁决灌数方式后另立任务，三条候选路径：① 受控 INSERT 进生产库（须先 `VACUUM INTO` 备份 + 写后 `docker restart cq-talent-api`）；② 只在本地带 `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` 跑，小程序指向本地；③ 不灌数，按设计稿补更完整的空态引导。本轮未执行任何生产写库。

## 2026-08-13 生产 API 重新部署（75fd0e9，用户授权）
- 背景修正：小程序控制台 /content/venues|coaches 404 实为模拟器旧编译产物，非生产缺路由；但 diff 实测生产代码大幅落后 dev（缺 ops/、会话持久化仓储等）
- 流程：docker exec VACUUM INTO 备份（api-backup-pre-75fd0e9-20260813.sqlite）→ 旧镜像打 rollback-pre-75fd0e9 标签 → git archive HEAD 上传解包 /opt/cq-talent-releases/75fd0e9 → docker build 新镜像（432f1457e0fe）→ sudo docker compose up -d --no-build --force-recreate（.env.runtime root 600 需 sudo，首次裸跑失败导致约 2 分钟停机）
- 验证：容器跑新镜像 sha256:432f1457e0fe；迁移 0009/0010 自动应用（app_client_sessions、student_guardian_bindings 表已建）；/health 200；/venues 403 鉴权拦截（路由存在）；备份文件在卷内
- 影响：会话表上线后旧内存会话失效，所有用户下次需重新授权一次（模拟器同）

## 2026-08-13 发现区复原巡检 + 家长端 15 页全量 smoke（生产会话）
- 发现区 4 画板（P8 内容中心/venues-premium/P8.2 帮助中心/coach-team）与实现逐项比对：结构均已对齐，tokens 即设计色（brand #a80f1b、card 白、quick-card 带边框圆角、coach-card 白卡+阴影）；vision 对比报的『灰色/无卡片』多为比对噪声
- 真实缺口全部收敛为**后端字段缺失**（不伪造）：赛季目标行、教练角色 pill/角色色头像框、微信联系按钮——API coach-team 无 goal/role/contact 字段
- 白屏根因修复：venues/help/coaches/content/private-success 五页 index.json 未注册 status-view（未注册组件静默不渲染）→ 全部补注册（adb44f0），venues/help 现为正确空态、coaches 真实列表
- 家长端 15 路由 smoke（mp-smoke + 生产会话）：13 ready/empty 正确；metric、private-success 为参数页，无参时给正确错误态（非缺陷）
- launch 页 reLaunch 推迟到 appLaunch 后执行，消除 non-empty page stack 报错（1fd4465）
- P2 训练详情导航徽章改按孩子出勤状态着色（159d458）

## 2026-08-14 用户新纪律「figma 有的效果全复原、缺数据可补」后的复原批次
- coaches 页：接上 API 已有的 teamGoal/role 字段——赛季目标行+角色 pill+角色色头像框（主教练红/体能橙/其他蓝），旧『防占位』测试改写为新纪律语义（4fe5b61）；微信联系按钮无真实数据来源，继续隐藏
- P2.1 比赛详情：未开始比赛比分显示 0:0（设计稿语义，完赛未录仍『比分待确认』）、赛事名两行不截断、队名列 180rpx 完整显示（be30874 + 队名列宽后续提交）
- API：事件详情按 primaryTeamId 从 teams 表解析 teamName（be30874，含 server.test 断言）——已二次部署生产（镜像 2dbab99eb370，缓存加速构建，sudo compose up -d --no-build，health 200）
- 生产数据：3 支 secure-test 队重命名为中文『U10 测试队 1/2/3』（备份 api-backup-pre-teamname-20260813.sqlite）
- 验收：P2.1 实机截图 sidebyside 通过——真实主队名、完整赛事名、0:0+待开始 pill、布局无挤压

## 2026-08-17 C4 出勤页最终 UI 收口（静态/API 验证通过，运行时视觉待补）

- 在线 Figma 抽查：`zZ6wKyOHKcO4UYXDd9jGwv` 的 C4 `93:665`、C4.1 `93:696`、C4.2 `93:715` 与本地参考 PNG 仅有非实质像素差异；不覆盖参考图。
- C4：保留真实 workbench 名单和既有出勤 PUT；`confirmed`/`invited` 在页面 view model 中仍按未点名处理，动态新增“共 N 名学员”尾栏，到课状态改为可点击、仍可打开真实选择器的绿色确认圆形。
- C4.2：同时兼容规范路由 `?correction=1` 和旧 `?mode=correction`；不再继承深色活动摘要，只保留真实警示、真实名单、逐人备注和固定重新提交区，不添加“家长异议”“异常数量”“全局修改说明”等无 API 支持的数据。
- C4.1：继续按 eventId 重新 GET workbench 读取真实统计；移除未声明的 `venue`/`hasVenue` 写入，主按钮改为中性“查看活动详情”。共享顶栏新增按页启用的 22px 标题变体，未改变其他页面的默认标题尺寸。
- 验证：先新增会失败的回归测试，再完成最小实现；聚焦 Vitest `23/23`、小程序 `typecheck`、`git diff --check` 及全仓门禁均通过（domain `19/19`、小程序 `319/319`、API `104/104`）。
- 运行时截图：先前自动化已确认 C4 路由和 iPhone X 逻辑 `375×812`，但提交前 `9432` 端口已失效，且 Windows 未发现可见的“的模拟器”窗口；未生成或接受任何截图证据，因此明确不宣称视觉运行态验收完成。

## 2026-08-17 DevTools Automator 拒绝连接根治（截图连接层）

- 根因：仓库内各截图/诊断脚本私自默认 `9421`、`9425`、`9429`、`9430` 或 `9432`，而 DevTools 的 `.ide` HTTP 服务端口又与 Automator WebSocket 端口混用；手动打开 IDE 后，脚本仍可能盲连已经不存在的旧端口。
- 修复：新增 `scripts/devtools/automation-session.cjs` 作为唯一端口状态；`devtools:automator:open` 先只读探测可用 Automator，再在需要时把当前 `.ide` HTTP 端口传给 `cli auto --port`、注册独立 `--auto-port`，仅在 `currentPage()` 握手成功后写入忽略的 `tmp/devtools-automation-session.json`。所有已跟踪的 Automator helper 已改为读取它，`MP_AUTO_PORT` 只保留为一次性覆盖。
- 实测：2026-08-17 手动打开的 DevTools 经 `cli auto --project <小程序目录> --port 14535 --auto-port 9432` 后监听 9432；新的 canonical opener 复用该端点、写入状态文件，并真实读到 `pages/coach/schedule/index`。这证明“拒绝连接”已解决。
- 边界：后续一次有界 `MiniProgram.screenshot()` 探针未能在约 55 秒内完整返回（其中断开阶段也未结束），已中止且未接受 PNG；这是 SDK 截图/断开能力边界，不是再度拒绝连接。C4/C4.1/C4.2 仍须另取可信 375×812 图片后才可声明视觉验收。

## 2026-08-17 DevTools 嵌入式模拟器截图回退修复

- 新根因：DevTools Stable `v2.01.2510290` 当前只有一个主窗口 `重庆天才俱乐部 - 微信开发者工具`，iPhone X 模拟器嵌在主窗口右侧，不会暴露旧脚本要求的“××的模拟器”独立窗口。此前因此在 Automator 已连通后仍报找不到模拟器窗口。
- 修复：`devtools-simulator-capture.py` 保留独立窗口路径；没有独立窗口时，选择唯一可见的 DevTools 主窗口，并搜索 iPhone X 刘海的纵向+横向黑色签名，以 DPI 比例裁出完整视口。新增偏离主窗口中心的 Python 回归测试，防止算法退回“只看正中心”的假设。
- 实测：真实 `.ide` HTTP `61245` 通过 CLI 注册 Automator `9424`，`devtools:screenshot` 已读取 `/pages/coach/schedule/index`，输出 `563×1218` PNG；`systemInfo` 同时确认逻辑视口 `375×812`、`devicePixelRatio: 3`、均匀栅格比例约 `1.5`。图像只含小程序画布，没有 DevTools 边栏或弹窗。
- 范围：这证明截图工具链恢复，不替代 C4/C4.1/C4.2 各自的 Figma 对照验收；下一页验收前仍须导航到目标路由并重新截图。

## 2026-08-17 C4 出勤页复验与截图 DPI 收口

- 在线 Figma 已逐页重新读取：C4 `93:665`、C4.1 `93:696`、C4.2 `93:715`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C4.1 的真实运行时对照确认 80px 成功图标、四行摘要、48px 通宽红色 CTA；CTA 文案收敛为画板的“查看训练详情”。
- 真实读写证据：教练会话对安全测试活动 `event-cq-talent-secure-test-1-trn-0817` 执行页面既有“全员到场 → 提交”；两名真实学员由 `pending` 持久化为 `present`，C4.1 按 eventId 重新 GET 后读回 `2/2`。未创建前端 mock、伪 session、伪角色或伪名单。
- C4.2 依据 `93:715` 重建通用订正态：警示卡、48px 三角图标、紧凑“学员列表 / 共 N 名学员”卡和 52px 固定重新提交区与画板结构一致；真实到课状态仍以绿色确认圈呈现。没有伪造“家长异议”“异常数量”或不受 API 支持的全局修改说明，原来的逐人空备注输入也不再冒充该设计字段。
- 可信截图通道补齐 Windows DPI：当 DevTools 在 150% 缩放下捕获 `563×1218` 物理画布时，`devtools-simulator-capture.py` 仍以高质量缩放输出严格的 `375×812` PNG，并由 Python 回归覆盖。Automator 的 `mp.screenshot` 仍可能在路由成功后超时；该 SDK 限制不影响屏幕像素通道。
- 验证：C4 聚焦 Vitest `7/7`、C4.1 聚焦 Vitest `4/4`、截图脚本 Python `4/4`、小程序 typecheck、`git diff --check` 与完整门禁均通过（domain `19/19`、mini-program `322/322`、API `104/104`）。已产出真实 C4、C4.1、C4.2 375×812 截图与左右对比图；最后一次 ready 状态宿主消除由页面回归覆盖。DevTools CLI 无“仅编译当前已打开 IDE”的安全命令，故在用户已允许不以最后一次视觉截图为完成前置的前提下，不将该最后一处宿主变更误报为新鲜运行态像素验收。

## 2026-08-17 C5 课时确认与 C5.1 更正页复原

- 在线 Figma 已重新读取：C5 `93:734`、C5.1 `93:765`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C5 对齐深色活动摘要、16px 白色列表卡、28px 学员头像、1.5 课时风格的绿色额度标签和 52px 主操作；C5.1 对齐软粉标题栏、16px 警示/名单卡、40px 头像、80px 紧凑上下调整器与圆角保存操作。
- 页面继续只读既有真实 workbench + lesson-confirmation GET，确认继续走既有 POST，更正继续走既有 event-scoped PATCH 和幂等键；未新增前端 fixture、伪余额、伪差异、伪角色或 API 字段。设计稿的“系统差异”“原值 1.5 课时”是样例数据，没有移植到真实页面。
- 已消除 ready 状态下 `status-view` 与实际内容同时渲染的宿主问题；C5 的活动元数据分组、名单行高/标签内边距和底部操作区按画板收口。C5.1 将此前容易挤压名单的横向减/数值/加控制收为画板同类的数字框加上下箭头，同时保持每次点击写入真实 `±0.5` 调整值；本轮又把内容左右内边距收为 22px、保存按钮恢复到学员卡后的正常内容流，并用 CSS 实心警示图标替代会随系统字体变色的 emoji。
- 验证：先更新页面回归并确认失败，后完成最小实现；C5.1 聚焦 Vitest `7/7`、小程序 typecheck、`git diff --check` 和全仓门禁均通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 真实视觉证据：在线 Figma 节点 `93:765` 重新导出为 `tmp/coach-runtime-acceptance/C5-1-figma-online.png`；当前教练活动通过微信开发者工具屏幕像素通道取得 `tmp/coach-runtime-acceptance/C5-1-final.png`，严格 `375×812`，并生成 `tmp/coach-runtime-acceptance/C5-1-final-compare.png`。页面级结构、卡片宽度、按钮位置和警示图标已通过对照；样例学员姓名/头像/课时数/“系统差异”标签与真实 API 数据不同，按动态数据豁免，不伪造样例数据。顶部状态栏、菜单胶囊和底部 Home Indicator 属于微信模拟器壳层，不计入业务页面差异。

## 2026-08-17 C6 比赛记录、C6.1 事件录入与 C6.2 本机草稿态复原

- 在线 Figma 已重新读取：C6 `93:796`、C6.1 `93:827`、C6.2 `93:858`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C6 对齐软粉标题栏、深色比赛摘要、白色比赛事件卡和描边添加按钮；C6.1 对齐能力驱动事件 chips、白色表单卡、48px 控件和圆角红色提交按钮；C6.2 对齐遮罩、左对齐本机草稿弹层和继续/退出操作。
- 保留真实链路：C6 仍只读 coach match-detail BFF；C6.1 仍走既有 event-scoped POST 与稳定幂等键；C6.2 只展示设备本机未提交草稿，不声称服务端自动保存，也没有把 Figma 示例里的换人、其他事件、示例比分或样例球员写入业务。
- 页面收口：ready 状态不再同时渲染 `status-view`；C6 去掉非画板眉题和额外状态 pill，时间线改为无分割线紧凑行；C6.1 将事件类型移到表单外、时间/球员/备注按画板顺序布局，备注改为真实多行输入；本机草稿弹层按钮顺序和颜色与画板一致。
- 验证：先让新增 C6 结构回归失败，再完成最小实现；聚焦 C6/C6.1 Vitest `15/15`、全仓门禁通过（domain `19/19`、mini-program `322/322`、API `104/104`），小程序 typecheck 和 `git diff --check` 通过。
- 运行态边界：Automator 成功从 C5 跳到 `/pages/coach/match/index`，屏幕像素通道输出严格 `375×812`，但画布仍显示旧 C4.2 页面；因此不把 C6 图片作为可信视觉通过，准确记录为 IDE 未刷新编译产物，未因此回滚页面实现。

## 2026-08-17 C9 队伍详情页 Figma 复原

- 在线 Figma 已读取 `zZ6wKyOHKcO4UYXDd9jGwv` 的 C9 节点 `93:924`，确认结构为软粉 88px 顶栏、深色队伍摘要、四列学员网格和横向教练卡。
- `/coach/team` BFF 增加真实 `coaches` 数组：仅从当前教练可访问队伍的真实 `defaultCoachId` 查找 active 教练，返回 `id/name/role`，不返回全俱乐部教练目录或联系方式。
- C9 前端增加真实教练组 view model、滚动卡片、菜单胶囊避让和 ready 状态门禁；成员仍从真实 scope 读取，点击继续进入真实学生雷达页。旧 BFF 没有 `coaches` 字段时归一为空数组，队伍正文不进入错误态。
- 验证：先红后绿的 C9 小程序测试 `7/7`、API 安全账号测试 `11/11`；全仓门禁 domain `19/19`、小程序 `324/324`、API `104/104`，两端 typecheck、API build、`git diff --check` 通过。
- DevTools Automator 已连接 `9424`，路由已切到 `pages/coach/team/index`，运行时确认 iPhone X 逻辑视口 `375×812`；屏幕像素裁剪因当前 Windows 主窗口找不到 iPhone X 刘海锚点而拒绝生成 PNG，未宣称视觉截图通过。此前本地 API `tsx watch` 进程仍存在但 `/health` 无响应，重启/启动动作被当前 Windows 执行策略阻止，需后续在可控终端重启本地 API 后再做运行态联调。

### C9 运行态补证

- 在线节点 `93:924` 已重新读取；真实教练会话导航到 `pages/coach/team/index` 后取得 `tmp/coach-runtime-acceptance/C9-acceptance-phone-current.png`，裁剪结果严格 `375×812`。
- 顶栏、队伍摘要卡、四列真实学员网格、教练组区域和教练 TabBar 的结构/间距与在线稿一致。当前 BFF 返回的真实队伍没有教练组成员，因此页面如实显示“暂未配置队伍教练”；没有把 Figma 示例的林教练、王助教、李体能写成测试数据。
- C9 聚焦 Vitest `7/7` 通过；本项无业务代码变更，记录为“视觉结构通过，教练组真实数据为空态”。

## 2026-08-17 C10 训练内容选择与 C10.1 覆盖预览复原

- 在线 Figma 已在本批开工前重新读取：C10 `93:952`、C10.1 `93:983`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C10 收口为软粉 88px 安全区顶栏、44px 搜索、32px 分类 pills、64px 紧凑训练项目行与 70px 选择底栏；训练项目名称、标签、难度、时长、选中数和总时长仍由既有真实项目树及 workbench 返回派生。
- C10 保存链路未改：仍是 `getCoachTrainingProjectTree()` + `getCoachWorkbench(eventId)` → `saveCoachTrainingProjects(eventId, ids)` → 精确 workbench 回读；未加入 Figma 示例训练项目、时长、选择或伪 API 结果。
- C10.1 收口为软粉 88px 顶栏、真实学员覆盖卡、6px 覆盖轨道与 Figma 固定底栏。示例“已覆盖 3 项”改从真实响应中按已覆盖维度去重计算；“确认”只执行本地返回，不发写请求、不产生伪成功态。返回的维度数可以大于画板示例的三行，页面保留全部真实维度。
- 测试先行：先让 C10/C10.1 的布局/派生字段/本地确认回归按预期失败，再完成最小实现；聚焦 Vitest `14/14`、小程序 typecheck、`git diff --check`、全仓门禁均通过（domain `19/19`、mini-program `325/325`、API `104/104`）。
- DevTools 自动化已复用当前实例 `9424` 并路由到 C10/C10.1；C10.1 的运行态仍是旧 bundle（页面 `ready` 但没有新 `coverageSummary` 字段），`devtools-simulator-capture.py` 因无法定位当前嵌入式模拟器刘海而拒绝生成 PNG。故本批**没有**新的可信 375×812 视觉截图，不将静态/单测结果表述为运行态视觉验收。

### C10/C10.1 运行态补证

- 在线节点 `93:952`、`93:983` 已重新读取；真实教练会话导航到 `pages/coach/content-select/index?eventId=event-cq-talent-demo-training-upcoming` 和 `pages/coach/coverage/index?eventId=event-cq-talent-demo-training-upcoming`，取得 `tmp/coach-runtime-acceptance/C10-acceptance-phone-current.png`、`tmp/coach-runtime-acceptance/C10-1-acceptance-phone-current.png`，两张裁剪结果均严格 `375×812`。
- C10 的搜索、分类 pills、训练项目卡、选择圆、底部选择栏和 C10.1 的学员覆盖卡/6px 轨道/确认栏与在线稿结构一致；训练项目、标签、时长、已选数量、覆盖比例和维度数量全部来自真实 API，未用画板示例内容替代。
- C10/C10.1 聚焦 Vitest `8/8`、`6/6` 通过；本批无业务代码变更，记录为“视觉结构通过，动态真实数据差异已豁免”。

## 2026-08-17 C11 测评任务列表 Figma 复原

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。页面复原为软粉 88px 顶栏、左侧返回与 22px 标题、菜单胶囊避让的“新增”、32px 筛选、12px 圆角/16px 内边距任务卡、4px 轨道、全任务卡右箭头和 56px 红色 FAB。
- 真实业务边界未变：标题、日期、状态、已完成学员数、进度宽度和 `templateId` 仍只来自 `getCoachAssessmentTasks()`；只有真实 `in_progress` 且带 `templateId` 的任务可进入测评录入。未开始/已完成任务仍说明不可录入，未开始轨道使用画板灰色。
- Figma 的顶栏“新增”与 FAB 都没有创建任务 API。两个入口统一为明确的不可用提示，不写本地状态、不调用写接口、不构造新任务或成功结果。
- 验证：先为新增入口、菜单避让、全量箭头和无伪造创建写下 RED 测试，后 C11 聚焦 Vitest `8/8` 通过；小程序 TypeScript 与 `git diff --check` 通过。根门禁的 domain `19/19` 与小程序 `326/326` 均通过，API 再以独立命令完整复核为 `104/104`、exit `0`。
- 运行态边界：本批未获取新的可信 375×812 C11 截图。用户已授权本阶段不以实时截图作为完成前置；因此不把静态/单测结果表述为 C11 运行时视觉验收。

## 2026-08-17 C12/C12.1 项目评分录入最终栅格收口

- 在线 Figma 基准已重新读取：C12 `93:1030`、C12.1 `93:1061`（文件 `zZ6wKyOHKcO4UYXDd9jGwv`）。C12 顶栏改为 88px 内容高度叠加动态状态栏，页面正文和固定提交栏收敛到画板的 22px（44rpx）横向栅格，同时保留右侧系统胶囊动态避让。
- C12.1 的本机草稿遮罩出现时，顶栏展示文案切换为“成绩录入”；点击“继续录入”后恢复“项目评分录入”。这只新增展示字段 `navTitle`，不改 `assessment-draft`、真实评分表、活动数据、提交 API 或任何草稿写入行为。
- 测试先确认新增标题/栅格断言会因旧实现失败，随后完成最小显示层修改。聚焦 C12 Vitest `15/15`、小程序 TypeScript、`git diff --check` 均通过；全仓门禁复核为 domain `19/19`、mini-program `326/326`、API `104/104`。
- 运行态边界：本批未生成新的 C12/C12.1 375×812 DevTools 截图。用户已授权本阶段不以截图作为完成前置，因此以上为 Figma 源码/测试验收结论，不冒充新的运行时像素验收。

## 2026-08-17 C14 团队能力总览安全区顶栏收口

- 在线 Figma 基准已在改动前重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`；标题栏设计高度为 88px、底色 `#fceeef`。
- 根因是 C14 已通过 WXML 注入动态状态栏高度 `navInset`，但 `.ability-nav` 仍使用 `box-sizing: border-box`，会侵占设计要求的 176rpx 内容高度。现改为与 C12/C13/C10 已验证页面一致的 `box-sizing: content-box`。
- 业务边界未变：团队雷达、维度统计、真实 API 读取、导出不可用状态及教练 tabbar 均未改动；没有新增样例数据或伪造接口结果。
- 验证：回归先红后绿（C14 定向 Vitest `5/5`）；小程序 typecheck、`git diff --check` 与全仓门禁均通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C15 能力评估录入安全区顶栏收口

- 在线 Figma 基准已在改动前重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15 Assessment Entry`。旧交接中写作 `93:1135` 的节点在线已不存在，当前 Figma 映射表的 `93:1132` 为唯一实际施工基准。
- C15 的 WXML 已动态注入 `navInset`，而 `.c15-nav` 的 `border-box` 会吞掉 176rpx（88px）设计内容高度；现按同类 C14/C13 页面改为 `content-box`，保留状态栏之上的 Figma 顶栏几何。
- 没有改动真实评测模板/字段、教练名单、滑动评分范围、本机草稿键、提交 API 或成功页跳转；也没有采用画板中的样例姓名、年龄、分数作为业务数据。
- 验证：C15 定向 Vitest 先红后绿 `8/8`，小程序 typecheck、`git diff --check` 与全仓门禁均通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C15.1 评估提交安全区顶栏收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1163 / C15.1 Assessment Submit`。页面的 88px 软粉顶栏通过动态 `navInset` 适配设备状态栏。
- `.c151-nav` 原本仍为 `border-box`，会将动态状态栏内边距从 176rpx 设计内容区中扣除；现改为 `content-box`，与 C14/C15 形成统一的自定义顶栏安全区模式。
- 保留真实边界：仅接受教练角色、合法路由标题和正整数已提交人数；“查看当前结果”仍跳转团队能力总览、返回仍返回列表。画板的“处理中 / 24小时 / 18名”等示例未被伪装成真实产品数据。
- 验证：C15.1 定向 Vitest 先红后绿 `4/4`，小程序 typecheck、`git diff --check` 与全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16 教练“我的”安全区顶栏收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me`。同时复核 Figma 组件约束：身份切换只对服务器确认的双角色会籍展示。
- C16 顶栏已经从 WXML 接收 `navInset`，但 `.c16-bar` 仍是 `border-box`；改为 `content-box` 后，88px 设计内容高度不会被状态栏内边距侵占。
- 保留既有真实行为：仅 `availableRoles` 同时包含 parent/coach 时显示身份切换；切换继续通过服务器 `switchActiveRole`，退出登录保留一次确认和清空会话。没有把在线稿的林教练、球队、主教练或统计样例写入真实数据。
- 验证：C16 定向 Vitest 先红后绿 `9/9`，小程序 typecheck、`git diff --check` 与全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16.1 权限范围只读几何收口

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1210 / C16.1 Permission Scope`。旧交接的 `93:1215` 不再作为在线施工依据。
- 已收口有真实契约的视觉：88px 安全区顶栏、说明卡的 16px 栅格/蓝色图标底、56px 权限行以及 52px 深红管理员提示操作。页面不再以旧的偏粉红按钮色或紧凑行距偏离画板。
- 业务边界保持：权限清单继续只由会话 `client.roleEntrypoints.coach` 投影；不可点、不可写的“仅管理员可调整”不会假装成 Figma 的“保存更改”。未添加画板中无后端契约的私教、财务、开关状态或保存请求。
- 验证：C16.1 定向 Vitest 先红后绿 `4/4`，小程序 typecheck、`git diff --check` 与全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16.2 私教兴趣安全区顶栏收口

- 在线 Figma 基准已在改动前读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1238 / C16.2 Private Interest`；顶栏为 88px 的软粉内容区，叠加设备动态状态栏安全区。
- 根因与已收口的 C14-C16.1 相同：WXML 向 `.c162-nav` 注入 `navInset`，而旧 `border-box` 会从设计规定的 176rpx 内容高度中扣除这段安全区内边距。现改为 `content-box`，不改标题、返回、正文卡片或教练 tabbar。
- 真实业务边界保持不变：仍只投影 `session.capabilities.features.private_lessons` 的 enabled / unavailable / pending 状态；没有伪造 Figma 示例中的“接受私教预约”、周时段、17:00-20:00、价格、存储或 API 写入。
- 验证：先让新的安全区断言因旧 `border-box` 失败，再以最小 WXSS 修改转绿；C16.2 定向 Vitest `4/4`、小程序 typecheck、`git diff --check` 和全仓门禁均通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16.3 教练账号安全区顶栏收口

- 在线 Figma 基准已在改动前读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`；顶栏设计为 88px 软粉内容高度并叠加设备状态栏安全区。
- 根因是 `.c163-nav` 通过 WXML 注入 `navInset` 后仍使用 `border-box`，导致动态状态栏内边距侵占 176rpx 的设计内容高度。现改为 `content-box`，其余卡片、资料和底部角色 tabbar 保持不变。
- 真实数据边界保持：页面继续只读取当前登录教练和 `getCoachHome()` 返回的数据；没有采用在线稿的林教练、U10、手机号、认证、修改资料、密码、设备或清缓存样例，也没有新增未经契约支持的操作。
- 验证：先让 C16.3 的安全区布局断言因旧 `border-box` 失败，再以最小 WXSS 改动转绿；C16.3 定向 Vitest `5/5`、小程序 typecheck、`git diff --check` 和全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C16.4 教练帮助安全区顶栏收口

- 在线 Figma 基准已在改动前读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`；顶部为 88px 的软粉导航内容区，叠加设备动态状态栏安全区。
- 根因与 C16.2/C16.3 相同：`.c164-nav` 从 WXML 获得 `navInset`，旧 `border-box` 会挤占 176rpx 设计内容高度。现以 `content-box` 保留顶部的 Figma 几何，标题居中 spacer、返回、搜索、FAQ、支持卡和教练 tabbar 未改。
- 真实帮助契约保持：分类、FAQ、搜索/筛选/展开状态仍从教练帮助响应与本地 view model 派生；未把 Figma 的固定分类、示例问题、支持时间、在线咨询、公众号或联系方式伪造成真实服务数据。
- 验证：先让 C16.4 的新安全区布局断言因旧 `border-box` 失败，再以最小 WXSS 改动转绿；C16.4 定向 Vitest `4/4`、小程序 typecheck、`git diff --check` 与全仓门禁通过（domain `19/19`、mini-program `326/326`、API `104/104`）。
- 运行态边界：用户已授权本阶段不以新截图作为完成前置，因此本项为在线 Figma/源码/测试验收，不表述为新的 375×812 像素级运行态验收。

## 2026-08-17 C1 日程主页安全区回归审计收口

- 全教练端顶栏审计发现 C1 `pages/coach/schedule` 的 WXML 已传入 `navInset`，但 `.c1-nav` 仍是 `border-box`；在线 Figma C1 `zZ6wKyOHKcO4UYXDd9jGwv / 93:578` 指定 88px 顶栏，动态状态栏不应侵占 176rpx 的设计内容区。
- 已将 C1 顶栏改为 `content-box`，保持原有菜单胶囊避让、实时日期/周导航、真实日程数据和角色跳转逻辑不变；不改任何 API 或展示样例数据。
- 验证：先让 C1 安全区断言对旧 `border-box` 失败，后 C1/C2/C3 聚焦 Vitest `24/24`、小程序 typecheck 和 `git diff --check` 通过。C2/C3 前一批的在线 Figma/源码/测试验收保持有效；用户已明确本目标不再以新模拟器截图作为完成前置。

## 2026-08-17 C8 训练管理安全区回归收口

- 在线 Figma 基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:896 / C8 Training Management`；训练管理页顶栏为 88px 内容区，WXML 同时注入动态 `navInset` 和菜单避让。
- 全教练端顶栏审计发现 `.c8-nav` 仍为 `border-box`，会将动态状态栏内边距从设计内容高度中扣除。现改为 `content-box`，保留真实训练统计、训练卡、真实 eventId 跳转以及已移除 C10 写入边界。
- 验证：先让 C8 安全区断言对旧 `border-box` 失败，后 C8 定向 Vitest `6/6`、小程序 typecheck 和 `git diff --check` 通过；用户已明确本目标不再以新模拟器截图作为完成前置。

### C8 运行态补证

- 使用当前真实教练会话导航到 `pages/coach/training/index`，通过屏幕像素通道取得 `tmp/coach-runtime-acceptance/C8-acceptance-phone-current.png`，裁剪结果严格 `375×812`。
- 与在线节点 `93:896` / `docs/design/reference/figma/c8-training-management.png` 对照：顶栏、深色四格统计、四项 Tab、训练卡列表、固定教练 TabBar 的几何和层级一致；统计数字、训练名称、日期、地点、状态和人数来自真实 API，与画板样例不同属于动态数据差异。

## 2026-08-17 教练端全量任务记录收口

- 全量在线画板↔路由表已核对到 C16.4：C1 `93:578`、C2 `93:606`、C3 `93:634`、C4/C4.1/C4.2 `93:665/696/715`、C5/C5.1 `93:734/765`、C6/C6.1/C6.2 `93:796/827/858`、C7 `93:877`、C8 `93:896`、C9 `93:924`、C10/C10.1 `93:952/983`、C11 `93:1002`、C12/C12.1 `93:1030/1061`、C13 `93:1080`、C14 `93:1106`、C15/C15.1 `93:1132/1163`、C16–C16.4 `93:1182/1210/1238/1262/1286`。
- 复核发现并修复两处此前遗漏的同根因：C1 `.c1-nav` 与 C8 `.c8-nav` 均同时接收 `navInset` 和声明 176rpx，现统一使用 `content-box`；对应 C1/C8 红→绿回归已提交。
- C4、C5、C6、C2 视觉任务和证据审计的剩余未勾选项仅是新的已认证截图前置。根据用户本轮明确授权，已改为“Figma/source/data/test evidence only；截图不阻塞完成”，并补齐逐路由 node/evidence matrix；不把静态结果表述为像素级视觉通过。

## 2026-08-17 C7 战术板在线 Figma 复原与真实截图复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:877 / LEGACY / C7 Tactical Board PoC`。页面从旧的绿色比赛战术布局改为 Figma 的白色 88px 顶栏、深紫 `343×380px` 球场、三个中轴圆、半场线、红色真实球员标记、阵型文字、五项工具栏、红色录制/保存按钮和教练 TabBar。
- 真实业务边界保持：球员、阵型、比赛、只读权限、拖动、换位、重置和保存仍由既有 API/角色守卫驱动；没有加入 Figma 中不存在于当前 API 的蓝色对方球员、样例姓名或伪保存响应。WXML 未使用 `.map()`、`.filter()`、`.slice()`、`.indexOf()`。
- 新增 C7 局部 SVG 图标，避免 WXSS 长 base64；顶栏继续使用动态 `navInset/menuInset`，并采用 `height:176rpx + box-sizing:content-box`，保证微信状态栏不侵占 Figma 内容高度。
- 可信运行态证据：`tmp/coach-runtime-acceptance/C7-acceptance-phone-final.png`，屏幕裁剪结果严格 `375×812`；Figma 离线对照图为 `docs/design/reference/figma/c7-tactical-board-poc.png`。动态真实学员短名和只读比赛数据与画板样例数字不同，属于数据差异；结构、色彩、层级和固定底部工具区已按截图复验。
- 验证：C7 聚焦 Vitest `6/6`、小程序 typecheck、根 `check`（domain `19/19`、小程序 `327/327`、API `104/104`）和 `git diff --check` 均通过。

## 2026-08-17 C6/C6.1/C6.2 教练端运行态截图补证

- 在线 Figma 基准：`zZ6wKyOHKcO4UYXDd9jGwv`，C6 `93:796`、C6.1 `93:827`、C6.2 `93:858`。本轮使用真实受保护教练会话和比赛 `event-cq-talent-demo-match-completed`，确认 C6 返回 `200`、真实比分 `3:2`、真实名单 16 人和真实比赛事件；不使用 secure-test 的 `403` 响应或 Figma 示例数据替代业务数据。
- C6.1 通过真实页面录入分钟 `45` 后回到 C6；C6.2 真实显示“未提交草稿已保存”，并明确“这条未提交的比赛事件仅保存在当前设备”。这是设备本机草稿契约，不宣称服务端自动保存。
- 可信屏幕像素证据：C6 `tmp/coach-runtime-acceptance/C6-acceptance-coach-final.png`、C6.1 `tmp/coach-runtime-acceptance/C6-1-acceptance-coach-final.png`、C6.2 严格 `375×812` 的 `tmp/coach-runtime-acceptance/C6-2-acceptance-phone-clean.png`；C6.2 对照图为 `tmp/coach-runtime-acceptance/C6-2-acceptance-compare-final.png`。C6.2 的遮罩、弹层层级、圆角卡片、继续/退出按钮顺序和底部教练导航与在线画板结构一致；比赛标题、比分、时间和本机保存时间属于动态真实数据差异。
- C6 视觉修复仍为最小改动：`apps/miniprogram-cq-talent/pages/coach/match/index.wxss` 将内容区顶部留白调整为 `88rpx`，并在 `index.test.mjs` 增加布局回归断言。C6/C6.1 聚焦测试先红后绿 `15/15`；本批提交前已重新运行全仓门禁、TypeScript 与 `git diff --check`。

## 2026-08-17 C11 测评任务运行态视觉复验与几何收口

- 在线唯一基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。Figma 的 `331px` Task List 是外层容器，内含左右 `16px` gutter；可见任务卡应为 `299×116px`。已将页面内容横向内边距收口为 `76rpx`，并按画板的筛选器内嵌节奏调整为 `64rpx` 顶部/`28rpx` 卡前间距。
- C11 顶栏使用 `height:calc(176rpx - navInset)` 与 `padding-top:navInset` 保持合计 `88px` 的安全区包络，不再因状态栏内边距把正文向下推移。真实 BFF 的任务、日期、状态、进度、筛选、角色守卫和无创建 API 时的诚实提示均未改变。
- 可信 375×812 证据：`tmp/coach-runtime-acceptance/C11-acceptance-phone-final.png`；在线稿对照：`tmp/coach-runtime-acceptance/C11-figma-online-20260817.png`；并排图：`tmp/coach-runtime-acceptance/C11-acceptance-compare-final.png`。筛选、卡片、进度轨、FAB、底栏的几何已复验；具体日期/状态/进度和原生状态栏、微信胶囊是动态数据或设备系统层差异。
- 验证先红后绿：C11 聚焦 Vitest `8/8`、小程序 typecheck 与 `git diff --check` 通过；根 `npx --yes pnpm@10.33.0 run check` 全绿（domain `19/19`、mini-program `327/327`、API `105/105`）。

## 2026-08-17 C12 项目评分录入真实运行态视觉收口

- 在线唯一基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1030 / C12 Project Score Entry`。真实教练路由为 `pages/coach/test-entry/index?eventId=event-cq-talent-demo-training-upcoming`；安全测试活动返回 `403 Event is not accessible for this coach membership`，未绕过该权限契约。
- C12 保留真实的 16 名学员、62 个评分字段、活动/模板名称、评分草稿、缺测和提交链路。为避免真实长指标撑高卡片，`displayLabel` 在 TypeScript view model 中预计算并在 WXML 单行展示；项目分组与上一项/下一项导航移至学员列表之后，首屏不再被导航控制区占据。
- 运行态对照发现 C12 自定义顶栏仍把 `176rpx` 内容高度与 `navInset` 相加，令正文整体下移约一个状态栏高度。已改为 88px 安全区包络并固定 `331×96px` 任务卡；学员区恢复任务卡后的 20px 间距和 8px 内上边距。没有改动 API、角色、草稿或真实数据。
- 可信证据：在线稿 `tmp/coach-runtime-acceptance/C12-figma-online-20260817.png`；真实模拟器图 `tmp/coach-runtime-acceptance/C12-acceptance-phone-final.png`（严格 `375×812`）；并排图 `tmp/coach-runtime-acceptance/C12-acceptance-compare-final.png`。顶栏、任务卡、列表、保存区、TabBar 已复验；状态栏/微信胶囊和真实数据文本为允许差异。
- 已完成红→绿 C12 定向回归、Mini Program typecheck 和 `git diff --check`。C12 最新聚焦 Vitest `18/18`；串行全仓门禁通过，domain `19/19`、mini-program `332/332`、API `105/105`，退出码 `0`。此前两项 SQLite 重开超时是旧并发检查记录，不再代表当前门禁状态。

## 2026-08-17 C13 学员能力雷达真实运行态视觉收口

- 在线唯一基准已通过 Figma MCP 重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1080 / C13 Student Radar`；真实路由为 `pages/coach/student-radar/index`。
- 运行态发现并修复 C13 顶栏安全区问题：`.radar-nav` 原为 `176rpx + navInset`，导致自定义顶栏比画板高约一个状态栏高度；现改为 `88rpx + box-sizing:content-box`，保留动态状态栏和菜单胶囊避让。
- 可信屏幕像素证据已保存：`tmp/coach-runtime-acceptance/C13-acceptance-phone-final.png`（首屏）、`tmp/coach-runtime-acceptance/C13-acceptance-phone-bottom.png`（底部评语区）和 `tmp/coach-runtime-acceptance/C13-acceptance-compare-final.png`，输出均严格 `375×812`。顶栏、chips、`343×260px` 雷达卡、维度评分卡、评语容器和 70px 教练 TabBar 的几何已完成对照。
- 真实数据不替换为 Figma 样例：当前会话返回 2 名学员、8 个维度、总分 `83`、评估期 `2026-08-05`，评语显示“能力评语暂未同步”；这些是 API 数据/空态差异。状态栏、微信胶囊和 Home Indicator 属系统壳层差异。
- 验证：小程序 `54/54` 文件、`330/330` 测试，domain `19/19`，API `105/105`；全仓 typecheck、`git diff --check` 均通过。C13 变更仅涉及 `apps/miniprogram-cq-talent/pages/coach/student-radar/` 和对应文档/任务记录。

## 2026-08-17 C14 团队能力总览真实运行态视觉收口

- 在线唯一基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`；在线节点实际为 `375×1258`，首屏以 `tmp/coach-runtime-acceptance/C14-figma-online-top-20260817.png` 对照。
- 真实截图发现 `radar-canvas` 在 C14 的纵向 flex 容器中没有取得页面传入的 `.ability-hero__canvas` 尺寸：普通 `class` 被组件样式隔离，原生 canvas 图层上浮进标题区。共享组件现声明受控 `host-class` 并把它应用于根容器；C14 同时在 `wx.nextTick` 后挂载 canvas，确保布局稳定后才创建原生节点。该外部样式类没有改变其它调用方。
- `综合 81` 的真实值继续来自团队能力 BFF；仅将字号从 `40rpx` 调整为在线截图对应的 `96rpx`。当前团队名称、8 个能力维度、综合 `81`、趋势 `+1.3`、评估时间/排名未同步均为真实数据差异，未填入 Figma 样例。
- 可信 `375×812` 最终证据：`tmp/coach-runtime-acceptance/C14-acceptance-phone-final.png` 与 `tmp/coach-runtime-acceptance/C14-acceptance-compare-final.png`。顶栏、上下文、深色雷达卡、综合分/趋势、统计卡及教练 TabBar 已完成首屏对照；状态栏与微信胶囊属于系统壳层差异。
- 验证：C14/共享雷达组件定向 Vitest `7/7`、小程序 typecheck、`git diff --check` 与根 `npx --yes pnpm@10.33.0 run check` 全绿（domain `19/19`、小程序 `330/330`、API `105/105`）。

## 2026-08-17 C15 能力评估录入真实运行态视觉收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15 Assessment Entry`。在线画板当前为 `375×1002`，故保存动作和教练 TabBar 应位于学员列表之后；此前仅作静态验收时沿用的固定底部布局会遮住首屏真实学员内容。
- 运行态确认 C15 将 `navInset` 与 `176rpx` 内容高度叠加，令顶栏比 Figma 高一个状态栏。现改为 `88rpx + content-box`，并移除返回箭头与标题间多余间隔；真实模板、草稿和逐学员提交契约没有改动。
- 共享 `role-tabbar` 新增默认关闭的 `flow` 属性，只有 C15 显式开启，其他页面继续固定底栏。C15 的保存动作和 TabBar 因此按在线长页顺序流动，不再覆盖首屏。
- 为匹配 6px Figma 指标轨道，同时保持真实触控录入，C15 将原生 slider 设为透明交互层，TS view model 预计算 `progressPercent`，WXML 仅渲染预计算宽度的轨道；未在 WXML 调用 JS 方法。学员副标题取真实 `getCoachTeam()` 的团队名。
- 可信证据：`tmp/coach-runtime-acceptance/C15-acceptance-phone-final.png` 与 `tmp/coach-runtime-acceptance/C15-acceptance-compare-final.png`，均为 DevTools `print_window` 通道生成的严格 `375×812` 图。真实服务器目前提供两名学员、七个指标、真实团队名和空草稿，而在线稿为三名/六项/样例分数；这些是数据差异，未伪造以求像素相同。
- 验证先红后绿：C15 + `role-tabbar` 定向 Vitest `332/332`、小程序 typecheck、`git diff --check` 通过；根 `npx --yes pnpm@10.33.0 run check` 已以完整后台日志得到 `CHECK_EXIT_0`（domain `19/19`、mini-program `332/332`、API `105/105`）。

## 2026-08-17 C15.1 评估提交真实运行态视觉收口

- 在线唯一基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1163 / C15.1 Assessment Submit`。真实教练路由为 `pages/coach/assessment-submit/index?title=%E8%83%BD%E5%8A%9B%E8%AF%84%E4%BC%B0&count=2`，页面只接受已认证 coach、经过解码的标题及正整数人数。
- 运行态发现顶栏仍将 `176rpx` 与 `navInset` 叠加，令粉色导航和后续内容整体下移一个状态栏高度。现按画板的 88px 安全区包络收口为 `88rpx + content-box`，同时把左右内边距/标题间距调为画板的 16px/8px 节奏。
- 为保持真实语义，成功标题现在由合法路由标题派生（如“能力评估已提交”）；主按钮收敛为“查看结果”，仍只跳转既有团队能力总览。画板的“24小时 / 处理中 / 18名 / 技术评估”未被伪装成生产数据。
- 可信 375×812 证据：`tmp/coach-runtime-acceptance/C151-acceptance-phone-final.png` 与 `tmp/coach-runtime-acceptance/C151-acceptance-compare-final.png`；截图通道为 DevTools `print_window`。摘要卡和操作区已对齐在线稿；动态真实数据、状态栏、微信胶囊及 Home Indicator 属允许差异。
- 截图链路同步修复：当 DevTools 不在前台时，`PrintWindow` 会得到纯白帧、桌面 fallback 会截到 Codex。现在在捕获前桥接当前前台输入线程并在 `finally` 解除桥接，实测可自行切回 DevTools 后输出严格 `375×812`。
- 验证先红后绿：C15.1 定向 Vitest `4/4`、截图脚本 Python 回归 `6/6`、`git diff --check` 与根 `npx --yes pnpm@10.33.0 run check` 全绿（domain `19/19`、mini-program `332/332`、API `105/105`）。

## 2026-08-17 C16 教练“我的”真实运行态视觉复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me`。Figma 顶栏内容区为 88px，标题左内边距为 16px；身份切换组件仍只应在服务端确认的双角色会籍下显示。
- 运行态根因是 `.c16-bar` 使用 `176rpx` 内容高度，同时 WXML 已为真实状态栏注入 `navInset`，令顶栏及后续内容整体下移。现将该内容区收口为 `88rpx + box-sizing: content-box`，并把左内边距从 `44rpx` 收口为与在线稿对应的 `32rpx`；右侧仍由现有 `menuInset` 避让真实微信胶囊。
- 真实业务边界未改：教练姓名、球队和三项统计继续来自 `getCoachHome()`；身份切换仍由 `switchActiveRole` 的服务端会话确认，四项菜单和退出登录行为不变。截图中的 `Secure parent 1`、球队和统计与 Figma 示例不同，属于真实数据差异。
- 可信证据保留在本机忽略目录：`tmp/coach-runtime-acceptance/C16-acceptance-phone-final.png`（`print_window` 通道、严格 `375×812`）及 `tmp/coach-runtime-acceptance/C16-acceptance-compare-final.png`。顶栏底线、首张卡片起点、角色入口、菜单、退出按钮和教练 TabBar 已完成对照；系统状态栏、微信胶囊与真实数据文案按设备/数据差异豁免。
- 验证先红后绿：C16 定向 Vitest `9/9`、小程序 TypeScript 和 `git diff --check` 通过。最初两次根检查在 30 秒命令窗口后留下重叠的 SQLite 测试进程，曾诱发 `apps/api/test/app-client-match-event-create.test.ts:135`（10 秒）与 `apps/api/test/persistence.test.ts:13`（15 秒）的重开超时；这不是本次 C16 或仓库的最终门禁结果。确认没有残留进程后，以单一串行会话复跑 `npx --yes pnpm@10.33.0 run check`，明确 exit `0`：domain `19/19`、mini-program `332/332`、API `105/105` 全部通过。后续根检查必须等待前一轮完全退出，避免并行 SQLite worker 制造假失败。

## 2026-08-17 C16.1 教练权限范围真实运行态视觉收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1210 / C16.1 Permission Scope`。在线稿 TopNav 内容区为 88px，左内边距为 16px；换算到当前小程序为 `88rpx` 与 `32rpx`。
- 运行态基线证实 `.c161-nav` 的 `176rpx` 内容高度与 WXML 的真实 `navInset` 叠加，令标题和后续内容下移；现按 C16 同一安全区规则收口为 `88rpx + box-sizing: content-box`，左内边距收口为 `32rpx`。返回动作、右侧胶囊避让、TabBar 和背景未改。
- 当前真实 coach 会话没有已配置的 `roleEntrypoints.coach`，因此页面显示“暂无可用入口 / 仅管理员可调整”。在线稿的五项权限、开关和“保存更改”属于配置就绪样例；没有服务端契约时未伪造成真实数据或可用操作。
- 曾出现 `9424` Automator 连接拒绝，根因是旧会话端口失效而非页面或 API。重新读取当前 IDE HTTP 端口 `61245` 并通过唯一注册入口更新为 `9420` 后，路由握手确认 `pages/coach/permissions/index`，再取得可信截图。
- 可信证据：`tmp/coach-runtime-acceptance/C161-runtime-baseline-valid.png`、`C161-runtime-baseline-valid-compare.png`、`C161-acceptance-phone-final.png`、`C161-acceptance-compare-final.png`；均由 DevTools `print_window` 通道生成，最终图严格 `375×812`。修复后顶栏粉色边界、标题位置和 body 起点与在线稿的几何结构一致；系统状态栏、微信胶囊、TabBar 图标细节及空态/就绪态数据差异按运行环境与服务端数据豁免。
- 验证先红后绿：C16.1 定向 Vitest 先因旧 `176rpx/44rpx` 失败（1 failed / 4），改动后 `4/4` 通过；尚待本任务最后一次全仓门禁与独立提交。

## 2026-08-17 C16.2 教练私教兴趣真实运行态视觉收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1238 / C16.2 Private Interest`。在线稿要求 88px 粉色顶栏、返回箭头、居中标题和右侧 24px 占位；内容卡片左右内边距为 22px。
- 运行态基线发现两个确定的视觉差异：`.c162-nav` 仍为 `176rpx`，且 WXML 没有右侧占位，导致标题靠左。现将顶栏收口为 `88rpx + content-box`、右侧避让为 `200rpx`，补齐 `c162-nav__placeholder`，并使标题 `flex: 1; text-align: center`。
- 真实数据边界保持不变：当前会话只提供 `capabilities.features.private_lessons`，没有接单状态、周时段、价格或持久化契约。运行截图中的“暂无法确认俱乐部是否已开通私教服务 / 状态待同步 / 当前教练可用时段尚未接入”保留为诚实状态，未伪造 Figma 的 17:00–20:00 样例、绿色开关或确认排期。
- 可信证据：`tmp/coach-runtime-acceptance/C162-runtime-baseline.png`、`C162-runtime-baseline-compare.png`、`C162-acceptance-phone-final.png`、`C162-acceptance-compare-final.png`；均由当前 DevTools Automator 端口 `9420` 路由确认后使用 `print_window` 通道生成，最终 PNG 严格 `375×812`。状态栏、微信胶囊、TabBar 图标细节及配置样例/真实空契约差异按环境与数据边界豁免。
- 验证先红后绿：C16.2 定向 Vitest 先因缺少居中标题/占位和旧顶栏失败（1 failed / 4），补齐最小结构与样式后 `4/4` 通过；尚待本任务最后一次全仓门禁与独立提交。

## 2026-08-17 C16.3 教练账号真实运行态视觉收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`。在线稿为 88px 粉色 TopNav，标题居中，左侧返回与右侧 24px 占位维持视觉平衡。
- 运行态基线确认当前页仍有 `176rpx` 顶栏、无右侧占位和标题左对齐。现将 `.c163-nav` 收口为 `88rpx + content-box`，右侧按在线稿胶囊避让为 `200rpx`，增加无交互 `c163-nav__placeholder`，标题改为 `flex: 1; text-align: center`。
- 真实数据边界不变：显示名来自认证 coach session；球队来自单一的近 30 天 `getCoachHome()` 请求并受已有 request-token 防过期保护。手机号、微信绑定、密码、设备、缓存、编辑、认证及所有写操作没有可靠契约，运行图继续诚实显示“当前会话未提供 / 状态待同步”，未伪造 Figma 样例。
- 可信证据：`tmp/coach-runtime-acceptance/C163-runtime-baseline.png`、`C163-runtime-baseline-compare.png`、`C163-acceptance-phone-final.png`、`C163-acceptance-compare-final.png`。均先通过 Automator `9420` 确认路由 `pages/coach/account/index`，再经 `print_window` 生成严格 `375×812`。状态栏、微信胶囊、TabBar 图标细节及样例账号内容属于系统/真实数据差异。
- 验证先红后绿：C16.3 定向 Vitest 先因缺少右侧占位和旧顶栏失败（1 failed / 5），最小 WXML/WXSS 修复后 `5/5` 通过；尚待本任务最后一次全仓门禁与独立提交。

## 2026-08-17 C16.4 教练帮助中心真实运行态视觉收口

- 在线唯一基准已通过 Figma MCP 重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`。画板 TopNav 内容区为 88px；之前 `.c164-nav` 声明 `176rpx + content-box`，与 WXML 的真实 `navInset` 叠加后把搜索框和正文整体下移。
- 运行态基线 `tmp/coach-runtime-acceptance/C16.4-baseline.png` 证实该几何偏差。按已验收 C16.2/C16.3 的同型安全区规则，将 `.c164-nav` 收口为 `88rpx + box-sizing: content-box`；返回、居中标题、右侧占位、真实 FAQ 搜索/筛选/展开、支持空态和教练 TabBar 均保持不变。
- 修复后可信屏幕像素证据为 `tmp/coach-runtime-acceptance/C16.4-after-height-fix.png`（首屏）和 `tmp/coach-runtime-acceptance/C16.4-bottom.png`（下段），均严格 `375×812`，来源 `print_window`。搜索框、快速上手区、FAQ 起点与在线稿垂直结构对齐；真实接口当前返回的分类/问题数量及“支持方式待配置”与 Figma 样例不同，属于数据/契约差异，未伪造样例客服、公众号或咨询操作。
- 排障确认微信提示来自 `apps/miniprogram-cq-talent/scripts/__pycache__` 的 Python 生成缓存；该目录及 `.pyc` 已移除，后续截图统一使用 `python -B`，未修改 `project.config.json`。`donutAuthorize__` 是微信工具保留目录名提示，不是业务页面目录。
- 验证先红后绿：C16.4 定向 Vitest `4/4`、小程序 typecheck、`git diff --check` 和串行根门禁均通过；根门禁为 domain `19/19`、小程序 `332/332`、API `105/105`，退出码 `0`。

## 2026-08-17 P0 微信手机号授权单飞防重入任务收口

- 已确认实现提交 `3d4837b` 已在当前 `dev` 分支，不在遗留 hotfix worktree：登录按钮触摸入口同步取得锁，原生回调只消费一次；取消、空 code、`getPhoneNumber too frequently` 和超时均不自动重试，只有用户显式重试才释放锁。
- 真实登录契约未改变：没有伪造手机号、验证码、session、角色或 API 响应；`binding_required`、无孩子家长档案和错误提示继续保持受限状态，错误文案不回显原始授权/API payload。
- 验证：`pages/login/index.test.mjs` 定向 Vitest `15/15`，小程序 TypeScript typecheck 通过；该实现已随最近一次串行根门禁验证（domain `19/19`、mini-program `332/332`、API `105/105`）。

## 2026-08-17 双角色切换任务收口

- 复核 `08-10-active-role-switch`：服务端通过 SQLite 持久化哈希 bearer session，能力声明为 `X-App-Client-Capabilities: active-role-switch-v1`；双角色登录先创建 `activeRole: null` 的待选择 session，选择和日常切换都必须经过服务端 `POST /session/role`，每次轮换 token，旧 token 立即失效。
- 复核授权边界：每次 bearer 请求重新检查 club、app-client、用户、精确 membership、当前 entrypoint-filtered `availableRoles` 和 active role；本地修改 active role、`roleHint` 或旧 token 都不能获得另一端权限。父端只投影 guardian children，教练端不返回家长 children。
- 复验：`apps/api/test/app-client-role-switch.test.ts` 为 `2/2`（双实例、关闭全部实例后文件型 SQLite 重开、角色删除/用户/会籍/client 失效和 token 轮换）；OpenAPI/login 契约为 `2/2`；小程序登录选择器、家长/孩子/教练切换入口为 `44/44`。
- 本仓库任务的实现验收已满足；生产双角色测试账号导入、真实微信授权和真机运行态登录仍属于独立部署/设备验收，不以本地测试冒充生产证据。

## 2026-08-18 WeChatIDE MCP 截图通道迁移

- 已将可信视觉截图默认切换为 `scripts/devtools/wechatide-mcp-capture.cjs`：通过 WeChatIDE MCP 编译/打开精确路由，读取 `currentPage` 与 `systemInfo`，请求 `simulator_screenshot(optimize=false)`，再用 Pillow 归一化输出严格 `375×812` PNG + JSON sidecar。
- 已补充 MCP stdio JSON-RPC 客户端、Windows 中文安装路径的 encoded PowerShell 启动、路由/视口/PNG 比例 fail-closed 校验和原子发布；不触碰登录、授权、session、角色或 API 数据。
- 已更新 `scripts/devtools/README.md`、本地手工验收文档和两份交接文档。旧 Automator/PrintWindow/桌面裁图仅保留为人工明确指定的紧急回退。
- 当前真实 MCP smoke 已完成 Codex 客户端授权、工具发现和路由调用；当前模拟器实际是 iPhone 12/13 (Pro) 的 `390×844`，命令按 375×812 门禁停止，未伪造截图证据。切回 iPhone X 后可直接重跑同一命令完成最终 PNG/sidecar smoke。

## 2026-08-18 C11 测评任务浮动新增按钮层级复验

- 在线 Figma 基准已重读：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。真实 iPhone X `375×812` 截图确认原 `.tasks-fab` 的 `z-index: 20` 被固定教练 TabBar（`z-index: 9999`）遮盖，只露出圆形按钮上半部。
- 已按测试先行将 C11 的布局断言从旧层级升级为 `z-index: 10000`：先观察到定向 Vitest 因旧值失败，再以单行 WXSS 改动使新增按钮浮于 TabBar 之上。没有改变测评任务 API、创建能力提示、真实任务数据或跳转行为。
- 新的可信证据：`tmp/coach-runtime-acceptance/C11-20260818-fab-layer.png`（真实 WeChatIDE MCP 模拟器）与 `tmp/coach-runtime-acceptance/C11-20260818-figma-online.png`（在线画板）。两张均为 `375×812`；任务日期、进度和状态仍为真实 API 数据差异。
- 验证：C11 定向 Vitest `332/332`、小程序 TypeScript `tsc --noEmit`、限定路径 `git diff --check` 均通过；全仓串行门禁待本轮其他页面审计结束后统一复跑。

## 2026-08-18 C15/C15.1 WeChatIDE MCP 运行态复验

- 在线 Figma 已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15 Assessment Entry` 与 `93:1163 / C15.1 Assessment Submit`。本轮截图改走 `scripts/devtools/wechatide-mcp-capture.cjs`，不是旧 Automator/PrintWindow 通道。
- C15 使用真实教练会话与接口任务 `assessment-template-technical`（“速度耐力体测”）打开；MCP sidecar 确认路由 `/pages/coach/assessment-entry/index`、原始及归一化 PNG 均为 `375×812`。证据：`tmp/coach-runtime-acceptance/C15-20260818-mcp-3.png`、`C15-20260818-mcp-3.png.json`、`C15-20260818-mcp-compare.png`。
- C15 顶栏、左返回、保存草稿、能力分组胶囊、学员卡、真实滑杆轨道、保存按钮和教练 TabBar 的几何与在线稿一致。Figma 示例有三组分组、三名学员和六项评分；当前真实模板只返回一个可录入分组、两名学员和真实指标，因此完整样例数量/分组差异标为数据/契约阻塞，不补造 Figma 数据。
- C15.1 使用 coach 角色、正整数真实确认人数契约打开提交态；MCP sidecar 确认 `/pages/coach/assessment-submit/index` 为 `375×812`。证据：`tmp/coach-runtime-acceptance/C151-20260818-mcp-1.png`、`C151-20260818-mcp-1.png.json`、`C151-20260818-mcp-compare.png`。成功图标、标题区、摘要卡、状态胶囊、双按钮和 TabBar 结构复验通过；任务标题、人数与状态按真实路由数据展示，未伪造在线稿中的“技术评估/18名/处理中”。本轮未重复写入生产评估，仅复验已存在的提交态路由契约。
- 诊断记录：第一次 C15 失败截图由 shell query 转义把模板 ID 变为 `assessment-template-technical^`，MCP network 明确返回 404；改用正确的 `&` 查询后复验成功。该问题属于取证命令，不是页面/API 业务缺陷。

## 2026-08-18 C16 退出登录按钮宽度收口

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me`。Figma 的退出登录 CTA 横向占满正文内容区（375px 画板中约 331px），而真实 MCP 截图中的原生 `<button>` 仅渲染为约 183px，属于明确的运行态视觉差异。
- 根因是该 CTA 继续使用微信原生 `button` 的默认布局行为；在相同 WXSS `width: 100%` 下仍被收缩。按项目其他自定义 CTA 的模式改为普通 `view` 交互节点，并显式使用 `display: flex`、`box-sizing: border-box`、`align-items/justify-content: center`，保留原有 `logout` 逻辑、确认弹窗和会话清理边界。
- 可信复验：`tmp/coach-runtime-acceptance/C16-20260818-mcp-after-logout-fix.png`，WeChatIDE MCP `simulator_screenshot`，严格 `375×812`；按钮已从约 183px 恢复为正文全宽约 331px，位置、红色描边、圆角和文字居中与在线稿一致。教练姓名、球队、统计、状态栏和微信胶囊仍按真实数据/系统壳层豁免。
- 验证先红后绿：C16 定向 Vitest 先因原生 button 标记与布局断言失败（1 failed / 9），改动后 `54` 个测试文件、`332/332` 用例通过；小程序 typecheck、`git diff --check` 和 MCP 截图均通过。本批代码文件待路径限定独立提交。

## 2026-08-18 七槽位安全演示账号幂等性修复与生产发布

- 提交 `afd20e0` 将 secure demo 的运营档案完整性由不可靠的固定行 ID 改为真实 SQLite 唯一边界 `(club_id, student_id)`：已存在的合法旧运营档案不被覆盖，完整安装的受控导入会正确返回 `already_present`。回归测试覆盖两个旧 ID 档案保留场景；提交 `30d2869` 同步记录脱敏交接与生产回读。
- 本地最终门禁：`npx --yes pnpm@10.33.0 run check` 退出 `0`（domain `19/19`、mini-program `332/332`、API `109/109`）；白名单 diff 检查通过。两笔提交均已推送 `dev`，未连带任何小程序、任务归档、工具或用户文件的在途改动。
- 经明确生产授权，已由纯 Git 提交树构建并发布 API release `30d2869`。发布前建立了受限 SQLite 一致性快照，并在私有服务器区域保留 WAL/SHM 状态；旧镜像以仅供回退的标签保留。发布只重建 `cq-talent-api`，不重跑 confirmed import、不清理数据库、不重建其他服务。
- 启动发布器最初把无间隔的 18 次 `/health` 查询误判为失败；只读诊断确认容器随后正常启动、退出码为 `0`、监听仍仅限 `127.0.0.1:3000`。之后内网和 `https://cqtc.pomi.tech/health` 均为 HTTP `200`，运行镜像标签为 `30d2869`。
- 生产受控 CLI dry-run 返回且仅返回 `{"operation":"import","status":"already_present","accountCount":7}`。临时创建并在 `finally` 精确删除的 14 个短时 bearer session 完成 BFF 回读：7 个家长 scope 合计 14 名绑定孩子、每槽至少 8 条能力指标；7 个教练 scope 合计 56 名队员、每槽 8 维雷达数据和一个已保存的 8 人战术板。日志、文档与结果均未记录手机号、token 或凭据。
- 本条是生产 API/数据回读证据，不替代任何真机微信手机号授权、首次角色选择、双角色切换或视觉验收。

## 2026-08-18 P5 新版 Figma 静态复原（家长会话待补）

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:278 / P5 Ability Radar`。新版画板明确为六维深色雷达模型：`#07111f` 主卡、`#1f1f24` 雷达画布、五层网格、六个真实分值胶囊、纵向“综合评分”以及六行维度详情。
- 代码批次将家长雷达展示模型限制为最多六个真实且可量化指标；八维真实数据不会被伪造成 Figma 样例，超出六项的指标仍由成长/指标详情契约承载。`radar-canvas` 新增 opt-in `geometry="p5"`，默认调用方的四维网格、方向和同龄基准绘制保持不变。
- 本批已完成 P5 顶栏、玩家胶囊、主卡/画布高度、综合分、维度条和 P5 专用雷达绘制参数；没有改 API、登录、角色或生产数据。
- 静态证据：P5 定向 Vitest `7/7`、小程序 TypeScript `tsc --noEmit`、限定路径 `git diff --check` 通过。在线 Figma PNG 临时取证已获取并保存于系统临时目录；可信运行态截图尚未发布。
- 运行态阻塞如实记录：当前微信开发者工具会话为不含 `parent` 可选角色的 coach 会话，尝试打开 `/pages/parent/radar/index` 被守卫留在 `/pages/coach/me/index`；C16 页面也没有渲染 `.c16-role-switch`。未执行会写入生产 SQLite 的旧种会话脚本，因此本条不能宣称 P5 视觉验收通过。

## 2026-08-18 C5 课时确认最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:734 / C5 Lesson Confirm`。本轮在施工前取得 design context 与原始 `375×812` 在线截图，确认最新画板仍是软粉 88px 顶栏、深色活动摘要、紧凑课时名单、底部“确认全部 / 发起更正”和三栏教练 TabBar。
- 使用当前已认证教练会话的真实活动 `event-cq-talent-secure-test-1-trn-0813` 打开 C5 成功态。WeChatIDE MCP sidecar 证实路由为 `/pages/coach/lesson/index`、运行窗口及输出 PNG 均为严格 `375×812`；证据位于系统临时目录 `cq-talent-runtime-c5-success-20260818-a.png`，在线稿及并排图为 `cq-talent-figma-c5-current-20260818.png`、`cq-talent-c5-compare-20260818.png`。
- 运行截图的活动标题、队名/时间、两名名单和“1课时”均来自真实 BFF；在线稿中的五名样例、日期和“1.5课时”不写回页面。除真实数据数量造成的白色内容区长度不同外，顶栏、活动卡、名单几何、确认操作和 TabBar 对齐，无需新增代码改动。

## 2026-08-18 C5.1 课时更正最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:765 / C5.1 Lesson Correction`。当前在线稿为软粉顶栏、警示卡、紧凑更正名单、正常内容流保存按钮和三栏教练 TabBar。
- 对照同一真实教练活动的 MCP 截图，修正了一处静态标题文案：`需要更正的学员` → `需更正学员`。真实服务端没有“系统差异”字段，因此保留真实的“课时调整”、实际姓名和“课时余额待核对”状态，未填入 Figma 样例头像、异常标签或 `1.5课时`。
- 截图前已调用 WeChatIDE MCP `simulator_refresh`，避免旧 bundle；最终 sidecar 证实 `/pages/coach/lesson-correction/index` 和 PNG 为严格 `375×812`。在线稿、最终运行图和并排图均位于系统临时目录，文件前缀分别为 `cq-talent-figma-c51-current-20260818`、`cq-talent-runtime-c51-after-refresh-20260818`、`cq-talent-c51-after-refresh-compare-20260818`。
- 验证按红→绿完成：C5.1 定向 Vitest `7/7`、小程序 TypeScript `tsc --noEmit`、限定路径 `git diff --check` 均通过。

## 2026-08-18 C6 比赛记录最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:796 / C6 Match Entry`。最新画板的内容区为顶栏后 `16px` 间距、深色比赛摘要、白色事件卡和固定教练 TabBar。
- 真实 `375×812` 基线确认 `.match-page__content` 仍保留旧的 `44px` 顶部留白，使英雄卡与事件卡整体下移约 `28px`。现按在线节点改为 `padding: 32rpx 32rpx 200rpx`；刷新模拟器并重截后，英雄卡顶边已与画板对齐，事件卡也回到正确首屏位置。
- 截图使用当前教练有权限的完成比赛 `event-cq-talent-secure-test-1-completed-match`。比赛标题、`4:2` 比分、七条事件、事件标签和当前 BFF 没有提供的分半场明细均保持真实数据；没有把 Figma 的样例对手、0:0 或四条事件写入前端。
- 可信在线稿、最终运行图和并排图位于系统临时目录，前缀为 `cq-talent-figma-c6-current-20260818`、`cq-talent-runtime-c6-after-gap-20260818`、`cq-talent-c6-after-gap-compare-20260818`。验证先红→绿：C6 定向 Vitest `10/10`、小程序 TypeScript `tsc --noEmit` 和限定路径 `git diff --check` 通过。

## 2026-08-18 C6.1 添加比赛事件最新在线稿验收状态

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:827 / C6.1 Add Match Event`。该画板要求事件类型、时间、球员、备注和提交动作；源码仍按真实 `capabilities.match.eventTypes`、真实比赛详情和名单构建，没有硬编码 Figma 的六个样例选项、45 分钟、球员头像或备注。
- 当前已认证教练会话打开 `event-cq-talent-secure-test-1-completed-match` 后，BFF 真实返回“当前客户端未配置可记录的比赛事件类型”，因此页面进入安全空态而不是 Figma 的可录入样例。该空态截图已由 WeChatIDE MCP 生成，sidecar 确认路由和图片均为严格 `375×812`；证据前缀为 `cq-talent-runtime-c61-baseline-20260818`，在线稿/并排图为 `cq-talent-figma-c61-current-20260818`、`cq-talent-c61-baseline-compare-20260818`。
- 此项不能宣称 C6.1 成功态视觉通过。阻塞点是生产会话的客户端能力配置，非 WXML/WXSS 几何缺陷；未改写真实 API 契约，也没有生成或提交任何比赛事件。

## 2026-08-18 C6.2 草稿保存态最新在线稿验收状态

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:858 / C6.2 Save State`。新版画板是“比赛进行中”的全场暂停/结束背景上的自动保存弹层，文案为“已自动保存 / 比赛记录已暂存，可稍后继续编辑”。
- 当前实现的唯一可用状态是 C6.1 为一条未提交比赛事件生成的设备本机草稿：C6 再读取同一活动后才显示 `hasLocalDraftOverlay`。它不声称保存整场比赛，故现有“未提交草稿已保存 / 这条未提交的比赛事件仅保存在当前设备”文案是对真实存储范围的准确描述。
- 本会话的 C6.1 缺少 `capabilities.match.eventTypes`，没有真实可录入事件，因而不能无写入地形成可验证本机草稿；同时后端没有画板所示的比赛进行中、暂停、结束和整场自动保存契约。此页面当前仅完成在线稿/源码契约审查，不能标为成功态视觉通过，也不会用 setData、mock 或伪草稿强行截图。

## 2026-08-18 C7 战术板最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:877 / LEGACY / C7 Tactical Board PoC`。该节点虽标记为 LEGACY，仍是当前画板↔路由表中 `pages/coach/tactical-board` 的唯一节点；本轮以它作为只读设计参照。
- 真实 `375×812` 截图发现 `.c7-header` 仍为旧 `176rpx` 内容高度，加上真实状态栏后将球场整体推低约 `44px`。按画板的 88px 顶栏收口为 `height: 88rpx; box-sizing: content-box`，刷新后球场首尾与在线图对齐：从约 `y=136` 至 `y=516`。
- 验证使用有真实持久化战术板的 `event-cq-talent-secure-test-1-scheduled-match`。红色球员圆点、实际阵型 `4-3-3` 和仅当前会籍可见的名单均来自 BFF；未填入画板左右两队的假蓝方球员或编号。定向 Vitest `6/6`、小程序 TypeScript、限定路径 `git diff --check` 通过；在线稿、最终图和并排图的临时前缀分别为 `cq-talent-figma-c7-current-20260818`、`cq-talent-runtime-c7-after-header-20260818`、`cq-talent-c7-after-header-compare-20260818`。
- 画板的 LEGACY 布局将 TabBar 置于球场正下方，并让工具栏绝对覆盖其下方；生产小程序的共享 `role-tabbar` 是固定底栏，当前 C7 工具栏也固定在其上。这一处是画板自身与全局导航组件的结构冲突，尚不能宣称 C7 全页像素通过；本轮不为匹配该旧 PoC 而破坏全局 TabBar 行为。

## 2026-08-18 C8 训练管理最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:896 / C8 Training Management`。当前画板要求 88px 安全顶栏、16px 圆角的深色统计 Hero、40px 四项标签栏，首项文案为“训练计划”，训练状态标签按已排定/待确认/已结束区分色彩。
- 真实 `375×812` MCP 截图确认旧页面缺少 Hero 圆角、标签栏偏高 8px，且直接显示 API 原始状态码。现将 Hero 收口为 `32rpx` 圆角、标签栏改为 `80rpx`、激活文案改为“训练计划”；TypeScript view model 预计算真实状态的中文标签和色调，WXML 不执行 JavaScript 方法。
- 运行态使用认证 coach 的实际数据：统计为 `10 / 93% / 8 / 5`，训练名称、日期、地点、人数及已结束状态均来自 BFF；在线稿中的 `46 / 89% / 18 / 3`、U10 队和三个样例地点没有写入小程序。微信系统状态栏、胶囊和 Home Indicator 作为平台壳层差异保留。
- 在线稿、最终运行图及并排图位于系统临时目录，前缀分别为 `cq-talent-figma-c8-current-20260818.png`、`cq-talent-runtime-c8-refresh-20260818.png`、`cq-talent-c8-refresh-compare-20260818.png`；运行 PNG sidecar 确认路由 `/pages/coach/training/index`、原始和归一化尺寸均为严格 `375×812`。
- 验证先红→绿：C8 定向 Vitest 从 `3 failed / 4 passed` 到 `7/7` 通过，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。

## 2026-08-18 C9 队伍详情最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:924 / C9 Team Detail`。当前画板为软粉 TopNav、16px 圆角深色队伍摘要、四列学员网格、横向教练卡和固定教练 TabBar；设计稿的完整高度为 `375×871`，首屏按 `375×812` 运行态对照。
- 真实基线确认 `.team-nav` 的旧 `176rpx` 内容高度与注入的 `navInset` 叠加，令 Hero 从约 `y=104` 下移至 `y=148`。现收口为 `88rpx + content-box`，并同步按在线稿调整返回/标题的 8px 间距、18px 标题字级和 Hero 的 16px 圆角；读取、返回和学员雷达跳转契约不变。
- 最终 MCP 截图中 Hero 已回到 `y≈104`，成员区和设计稿首屏的结构起点恢复一致。实际会话返回 8 名学员、1 名教练、`10 / 93% / 8` 等真实数据，而在线稿为 12 名学员、3 名教练和示例数值，因此教练卡更早进入首屏；未填充或伪造名单。
- 在线稿、基线及最终运行证据位于系统临时目录：`cq-talent-figma-c9-current-20260818.png`、`cq-talent-runtime-c9-baseline-20260818.png`、`cq-talent-runtime-c9-after-20260818.png`。最终 sidecar 确认路由 `/pages/coach/team/index`，原始和归一化 PNG 均为严格 `375×812`。
- 验证先红→绿：C9 定向 Vitest 从 `1 failed / 6 passed` 到 `7/7` 通过，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。

## 2026-08-18 C10 训练内容选择最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:952 / C10 Training Content Select`。当前画板为软粉返回顶栏、搜索、横向分类、64px 训练卡、70px 底部选择栏和教练 TabBar；内容区左右为 22px、上下为 16px。
- 真实基线中旧 `.select-nav` 的 `176rpx` 使搜索框、分类和训练库列表整体下移约 44px；返回标题也比在线稿更大且与图标距离过宽。现收口为 `88rpx + content-box`，并将标题改为 18px、标题与返回图标的间距改为 8px；筛选、选择、保存后 BFF readback 和返回行为未改动。
- 最终 MCP 截图中搜索框起点为 `y≈105`，训练列表、底部选择栏和 TabBar 与在线稿首屏结构对应。当前真实训练库返回运控球、1v1 等分类/项目，当前活动也没有已选内容，故显示真实的空心选择圈、`已选 0 项`和禁用按钮；未填充 Figma 的四个样例项目和三项已选状态。
- 在线稿、基线和最终证据位于系统临时目录：`cq-talent-figma-c10-current-20260818.png`、`cq-talent-runtime-c10-baseline-20260818.png`、`cq-talent-runtime-c10-after-20260818.png`。最终 sidecar 证实路由 `/pages/coach/content-select/index`、查询为当前训练活动，归一化 PNG 严格为 `375×812`。
- 验证先红→绿：C10 定向 Vitest 从 `1 failed / 7 passed` 到 `8/8` 通过，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。

## 2026-08-18 C10.1 覆盖预览最新在线稿运行态复验

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:983 / C10.1 Coverage Preview`。当前画板为软粉返回顶栏、紧凑覆盖卡（12px 内边距、10px 行间距、6px 轨道）、70px 底部确认栏和教练 TabBar。
- 基线中 `.coverage-nav` 仍为 `176rpx`，使“学员覆盖”和第一张卡片整体下移约 44px。现按在线稿将顶栏收口为 `88rpx + content-box`，返回/标题间距改为 8px，标题改为 18px/22px；确认仅调用本地返回，不新增或伪造覆盖写入。
- 最终 MCP 截图中“学员覆盖”从 `y≈153` 回到 `y≈109`，第一张真实覆盖卡紧随其后，确认栏与 TabBar 位置不变。运行态实际返回两名学员、每人 8 个维度、`覆盖 8/10` 和若干待同步项；在线稿为三名学员、三维样例，属真实数据/契约差异，未删减或填充。
- 在线稿、基线与最终证据位于系统临时目录：`cq-talent-figma-c101-current-20260818.png`、`cq-talent-runtime-c101-baseline-20260818.png`、`cq-talent-runtime-c101-after-20260818.png`。最终 sidecar 确认路由 `/pages/coach/coverage/index`，PNG 归一化为严格 `375×812`。
- 验证先红→绿：C10.1 定向 Vitest 从 `1 failed / 5 passed` 到 `6/6` 通过，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。

## 2026-08-18 C16.3 新版 Figma 复原与共享 TabBar 校准

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`。新版稿确认 88px 粉色顶栏、左对齐“账号设置”、92px 资料卡、45px 分组行、16px 内容边距和 70px 三栏底部导航。
- `pages/coach/account` 已按新版结构收口：资料卡补齐编辑标签、状态徽标、微信绑定图标、手机号右侧动作和三组箭头行；账号字段仍显示真实会话可提供的信息（当前会话未提供/状态待同步），没有写入 Figma 示例手机号、姓名、认证结果或伪造 API 能力。
- 新版稿的 TabBar 图标框为 16px、标签为 9px、内容区高 56px；共享 `components/role-tabbar` 已同步为 `32rpx` 图标、`18rpx` 标签、`16rpx` 顶部内边距和 `84rpx` 指示点位置，家长端与教练端共用。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\c163-figma-current.png`；运行态截图：`C:\Users\ASUS\AppData\Local\Temp\c163-coach-runtime-after-tabbar-ed2e646615534f91b581683fbbb3050d.png`，sidecar 证实 `/pages/coach/account/index` 严格为 `375×812`；并排图：`C:\Users\ASUS\AppData\Local\Temp\c163-compare-1dcb603d1043494a9f7f0de37b1a616a.png`。状态栏、微信胶囊、真实账号文案作为平台/数据差异保留。
- 验证通过：C16.3 与共享 TabBar 定向 Vitest `12/12`、小程序 `tsc --noEmit`、限定路径 `git diff --check` 均通过。该批次尚待路径限定提交后继续下一页。

## 2026-08-18 C16.4 新版 Figma 复原

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`。新版稿确认 88px 粉色顶栏、44px 搜索栏、三行两列快速上手卡、FAQ 分组卡、支持卡和 70px 三栏底部导航。
- `pages/coach/help` 已将顶栏改为与新版稿一致的左对齐标题和返回间距；初始“全部”筛选不再显示未在新版稿出现的红色选中边框，选择具体真实分类时仍保留本地筛选反馈。搜索、分类、展开 FAQ 和返回行为不变。
- 真实 API 返回的分类、问题、文案和支持配置继续原样展示；当前运行态的“全部/出勤说明/训练规则/成长报告/账号设置/联系客服”等内容与在线稿示例不同，属于真实内容差异，未把 Figma FAQ 或联系渠道写进客户端。
- 在线稿截图：`C:\Users\ASUS\AppData\Local\Temp\c164-figma-current.png`；最终运行态截图：`C:\Users\ASUS\AppData\Local\Temp\c164-coach-runtime-after-6439cb84603e4eedafa1fa1f04971996.png`，sidecar 证实 `/pages/coach/help/index` 严格为 `375×812`；并排图：`C:\Users\ASUS\AppData\Local\Temp\c164-compare-after-ba93df7869ab4f658e108ef3461b51be.png`。
- 验证通过：C16.4 定向 Vitest `4/4`、小程序 `tsc --noEmit`、限定路径 `git diff --check` 均通过；该批次待路径限定提交。

## 2026-08-18 C16.1/C16.2 新版 Figma 刷新复原

- C16.1 在线节点 `93:1210` 已重新读取。权限页按新版稿收口为左对齐 18px 标题、16/22px 内容边距、五行 40×24px 只读开关和 52px“保存更改”视觉按钮；按钮不绑定伪保存逻辑，权限仍由真实 coach session capabilities 投影。
- C16.2 在线节点 `93:1238` 已重新读取。私教兴趣页按新版稿收口为说明卡、接单开关、7 列×4 行可用时段网格和费用说明；周列/时段格在 TypeScript view model 中预计算，WXML 没有 `.map()` 等方法调用。
- 真实运行态 MCP 截图均为严格 `375×812`：`c161-runtime-latest.png` / `c162-runtime-latest.png`；并排证据为 `c161-compare-latest.png` / `c162-compare-latest.png`。C16.1 当前会话未提供 Figma 样例中的前三项权限；C16.2 BFF 未提供接单/排期契约，因此保留真实待同步/不可用状态，不伪造绿色样例数据。
- 验证：C16.1 + C16.2 定向 Vitest `8/8`、小程序 `tsc --noEmit`、限定路径 `git diff --check` 通过。

## 2026-08-18 C5 在线稿刷新抽查

- 在线唯一基准 `zZ6wKyOHKcO4UYXDd9jGwv / 93:734` 的当前截图与仓库 2026-08-12 离线快照存在实质差异：底部确认区已明确包含“确认全部”和“发起更正”两项，并位于教练 TabBar 之上。
- 复核现有 `pages/coach/lesson` 运行态后确认代码已经符合当前在线稿：真实活动摘要、学员课时记录、确认按钮、更正链接和底部导航的几何均已对齐；不新增代码、不改变真实 workbench/lesson-confirmation API 契约。
- 已用当前在线截图刷新 `docs/design/reference/figma/c5-lesson-confirm.png`。真实 MCP 运行证据：`C:\Users\ASUS\AppData\Local\Temp\c5-runtime-latest-before.png`；并排图：`C:\Users\ASUS\AppData\Local\Temp\c5-runtime-compare-before.png`，均严格 `375×812`。样例五名学员与 `1.5课时` 和真实会话数据不同，继续按数据差异豁免。
- C5 定向回归仍通过；本批没有业务代码变更，仅提交设计参考快照与记录。

## 2026-08-18 C14 在线参考图尺寸修正

- 重新读取在线唯一基准 `zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview` 的 `get_design_context` 与 `get_screenshot`；在线稿为完整 `375×1258`。
- 发现仓库 `docs/design/reference/figma/c14-team-ability-overview.png` 历史上被错误保存为 `306×1024` 裁剪图；已用当前在线 PNG 替换为完整 `375×1258`，未修改 C14 业务代码、真实数据或接口契约。
- 证据：`C:\Users\ASUS\AppData\Local\Temp\c14-team-ability-overview-figma-current.png`；由于本批没有运行代码改动，不宣称新增运行态视觉通过。

## 2026-08-18 P5 新版几何校准（运行态家长会话待补）

- 重新读取在线唯一基准 `zZ6wKyOHKcO4UYXDd9jGwv / 93:278 / P5 Ability Radar`，并与仓库离线快照 `docs/design/reference/figma/p5-ability-radar.png` 做像素比对；两者均为 `375×812`，当前 `diffbbox=None`，无需刷新离线 PNG。
- 按在线稿修正 `pages/parent/radar`：返回区改为 `24×40px` 并使用共享 `chevron-left.svg`；标题、副标题回到 `18px/13px`；玩家选择区使用页面底色；内容区上边距为 `16px`；雷达 Hero 内部垂直间距为 `20px`；雷达 canvas 显式传入 `100% × 560rpx`，确保运行态为 `303×280px`，不再落回组件默认 `520rpx` 高度。
- 先红后绿：P5 页面/雷达组件定向 Vitest 从 `6/8`（新增契约预期未满足）到 `8/8`，小程序 TypeScript `tsc --noEmit` 与限定路径 `git diff --check` 通过。
- 证据：在线截图 `C:\Users\ASUS\AppData\Local\Temp\p5-ability-radar-figma-current.png`；由于当前微信开发者工具会话为 coach-only，无法合法进入 parent 路由，尚未取得家长端真实 `375×812` 运行截图；本批只宣称 Figma/静态/类型/测试通过，不宣称运行态视觉验收通过。

## 2026-08-18 新版双端门禁复核

- 重新读取新版 Figma 两个页面：`4:6 / 05 Parent Generated` 与 `4:7 / 06 Coach Generated`；当前唯一来源仍为 `zZ6wKyOHKcO4UYXDd9jGwv`。已确认当前任务识别的实质变化均已分别落在 C5、P5、C14 三个独立提交中。
- 全仓门禁：`npx --yes pnpm@10.33.0 run check` exit `0`；domain `19/19`、小程序 `340/340`、API `109/109`，三层 typecheck 均通过。
- 双端视觉剩余边界仍如实保留：P5 当前没有合法 parent 运行会话，历史 C1–C14 等页面的运行态证据按各自记录中的“真实截图/平台或数据豁免”处理；没有把全仓测试绿灯解释为所有页面的像素级视觉通过。

## 2026-08-19 P1/C1 周切换箭头与 C1 顶栏回归修复

- 在线唯一基准已重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home` 与 `zZ6wKyOHKcO4UYXDd9jGwv / 93:578 / C1 Coach Schedule Home`。两张画板均要求周日期条两侧持续显示上一周/下一周箭头；在线稿已同步新增 P1 节点 `456:177`–`456:179` 和 C1 节点 `456:185`–`456:186`。
- P1 `pages/parent/schedule` 复用既有 `changeWeek`，新增可点击的 `‹` / `›`；C1 `pages/coach/schedule` 同样显示既有周切换动作。两处都不在 WXML 内调用数组或字符串方法，日期继续由 TypeScript view model 生成。
- C1 根因是 `.c1-nav` 的 `176rpx` 内容高度与动态 `navInset` 叠加。已收口为在线稿要求的 `88rpx + box-sizing: content-box`，避免标题、头像和日期条整体下沉；真实 WeChatIDE 模拟器截图 `C:\Users\ASUS\AppData\Local\Temp\c1-current-after-week-arrows.png` 显示异常白区消失，箭头可见。
- 已刷新离线参考图：`docs/design/reference/figma/p1-schedule-home.png` 与 `docs/design/reference/figma/c1-coach-schedule-home.png`，均直接导自本次在线 Figma 截图（375×812）。
- P1 运行态截图尚不能标为通过：当时真实双角色会话的激活身份为 `coach`，家长页的 `requireRole("parent")` 会按真实身份守卫回跳。不得使用生产库直写/伪造会话脚本取证；后续应通过小程序现有“切换身份”界面或重新完成真实微信手机号登录后，以 `parent` 身份补拍。

## 2026-08-19 P5 能力雷达顶栏信息密度优化

- 用户反馈真实测试数据中的“学员名 · 球队名”在 P5 顶栏换行，与下方学员选择胶囊重复，造成首屏拥挤。已重新读取在线唯一基准 `zZ6wKyOHKcO4UYXDd9jGwv / 93:278 / P5 Ability Radar`，确认副标题节点原为 `196:735`。
- 现将学员识别与切换统一交给下方横向选择器：P5 顶栏仅保留“能力雷达”和“历史对比”。页面不再把 `activeChildName` / `activeChildTeam` 写进 view model，真实学员选择、雷达读取与历史对比路由均保持不变。
- 在线 Figma 已同步删除 `196:735`，并将 `196:733` 重命名为 `Title`；最新在线截图已刷新 `docs/design/reference/figma/p5-ability-radar.png`（严格 `375×812`）。
- 验证：新增 P5 顶栏重复信息回归用例先红后绿，定向 Vitest `6/6` 与小程序 `tsc --noEmit` 均通过；本批未伪造 parent session，未宣称新增运行态视觉验收。

## 2026-08-19 P5 历史对比按钮右侧定位修复

- 真实 375×812 模拟器截图显示“历史对比”被挤在标题旁。根因是 P5 把 `resolveMenuInset()` 的动态微信胶囊避让值写入顶栏 `padding-right`，但该页 WXSS 已按 Figma 固定预留 `200rpx`；两套避让规则叠加后，按钮被过度向左推移。
- P5 现仅注入顶部安全区 `navInset`，保留 Figma 的 `padding: 0 200rpx 0 32rpx`。在线 Figma `93:278` 当前 Header 仍为标题 `x=40`、历史对比按钮 `x=187`–`275`，设计稿无需另行改动。
- WeChatIDE MCP 已重新导航至 `/pages/parent/radar/index` 并取得真实 `375×812` 运行截图：`C:\Users\ASUS\AppData\Local\Temp\p5-radar-history-action-after-2026-08-19-final.png`；标题与按钮现保持清晰间距，右侧按钮不与微信胶囊重叠。
- 验证：新增定位回归用例先红后绿，P5 定向 Vitest `7/7`、小程序 `tsc --noEmit` 与 `git diff --check` 均通过。

## 2026-08-19 全端顶栏右侧操作审计

- 针对 P5 暴露的“标题与右侧操作过近”问题，重新读取在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 的 C1/C2/C3/C4/C11/C12/C14/C15/C16 节点，并用真实教练身份在 WeChatIDE MCP 取得路由核验的 `375×812` 截图。
- 教练端 C1 头像、C2 结束训练（真实数据为待开始，按钮未出现）、C3 保存、C4 提交、C7 分享、C11 新增、C12 提交、C14 导出、C15 保存草稿、C16 设置均与最新在线稿保持安全间距；C5/C5.1/C6/C6.1/C8/C9/C10/C10.1/C13/C16.1–C16.4 没有右侧文字动作，不属于同一挤压模式。
- 家长端已完成的 P2/P3/P4/P6/P7/P7.1/P8/场地/P8.2/P9/P9.1 截图审计也未发现同类碰撞。平台胶囊坐标为 `left=281px,width=87px`，`resolveMenuInset()` 为 `102px`，与在线稿固定 `100px` 右预留相容。
- 本轮没有继续改代码或在线 Figma：P5 是重复副标题与动态右预留叠加造成的页面特例，其他页面未发现需要跟随修改的真实缺陷。详细证据见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-19/coach-header-action-audit.md`。

## 2026-08-19 Kimi 交接文档更新

- 新增仓库根交接入口 `HANDOFF-KIMI-2026-08-19.md`，统一记录当前 `dev` 分支 HEAD `6b48372`、比 `origin/dev` 超前的两个提交、在线 Figma 根节点 `4:6/4:7`、真实 `375×812` WeChatIDE MCP 截图 SOP、生产 API 边界、七槽位双角色测试数据边界和未提交改动白名单。
- `docs/README.md` 已将该文件列为当前接手第一篇；旧 `HANDOFF.md`、`HANDOFF-2026-08-14.md`、`HANDOFF-NEXT.md` 保留为历史/增量材料，不再作为唯一当前事实源。
- `docs/current/figma-source-of-truth.md` 已更新为 2026-08-19，并补充 P5 顶栏及 C1/C2/C3/C4/C11/C12/C14/C15/C16 审计记录。
- 本批只更新交接和当前事实文档，没有修改业务代码、生产数据库或微信开发者工具状态；当前 Trellis 任务 `.trellis/tasks/08-19-online-figma-tabbar-reaudit` 仍为 `in_progress`，不能把本次文档整理写成该任务已归档。

## 2026-08-28 C5 销课流程新版 Figma 与小程序首批同步

- 在线唯一基准仍为 `zZ6wKyOHKcO4UYXDd9jGwv`。保留原 `93:734 / C5 Lesson Confirm`，新增三个设计状态：`537:2 / C5 Session Settlement — Pending`、`537:79 / C5 Session Settlement — History`、`537:156 / C5.1 Session Settlement — Detail`。
- 新版待处理稿将页面语义明确为“销课处理 / 待确认学员 / 人数待处理”；历史稿和详情稿补充了销课回溯、活动信息、场地和更正入口的目标结构。由于后端当前没有跨活动销课历史聚合接口，代码没有伪造历史列表。
- `pages/coach/lesson` 已同步新版待处理状态：共享顶栏改为“销课处理”，状态视图同步改名，列表标题改为“待确认学员”，人数改为“人待处理”；真实 workbench、lesson-confirmation 读取和确认提交逻辑不变。
- `pages/coach/lesson-correction` 保持独立全屏更正流程，继续使用真实双读、幂等 PATCH、重新读取和失败提示；没有新增伪造学员或课时数据。
- C5 定向测试 `17/17` 通过。小程序类型检查与最终限定路径 diff 检查待本批提交前完成；未进行生产部署或数据库写入。

## 2026-08-28 C7 战术板当前在线稿同步

- 当前在线唯一基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 233:2 / CODE / C7 Tactical Board MVP`。在线稿明确为 375px 画板：白色圆角顶栏、`MATCH TACTICS` 上下文、比赛标题与保存状态、阵型卡、351×430px 绿色球场、40px 红色球员圆点、86px 替补卡和两个 48px 操作按钮。
- `pages/coach/tactical-board` 已从旧的深色长球场/悬浮保存入口同步为上述结构：保留真实战术板 API、真实名单过滤、阵型切换、拖拽、选中换位、重置、保存、只读和失败保留 dirty 状态；显示字段继续由 TypeScript view model 预计算。
- 战术板是全屏工作页，本页移除会覆盖底部操作区的全局 `role-tabbar`，不引入第二套导航；页面配置同步移除不再使用的组件声明。未新增伪球员、伪 API、伪会话或前端假数据。
- 验证：C7 定向 Vitest `6/6`、小程序 TypeScript `tsc --noEmit`、限定路径 `git diff --check` 通过。本批按当前用户要求以在线 Figma 结构和静态/代码验证收口，未把静态通过表述为真实设备视觉验收。

## 2026-08-28 C14 团队能力总览当前在线稿同步

- 当前在线唯一基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`，已重新读取并下载完整 `375×1258` 在线截图核对。
- C14 顶栏按当前稿收口为粉色背景、24×32px 返回区、18px 左对齐标题和 52×29px 导出控件；动态 `navInset/menuInset` 安全区规则保留，避免微信胶囊覆盖右侧操作。
- 页面继续使用真实团队能力概览与团队信息 API，雷达、综合分、趋势、维度进度条、统计摘要、排名不可用状态和教练 TabBar 结构均保留。Figma 样例中的 2025 评估时间、示例球员姓名和排名没有写入客户端；后端未提供对应真实字段时继续展示明确的待同步状态。
- 验证：C14 定向 Vitest `5/5`、小程序 TypeScript `tsc --noEmit`、限定路径 `git diff --check` 通过；随后执行完整仓库门禁，结果记录在本批提交前的终端输出中。

## 2026-08-28 C10 训练内容选择在线稿几何校准

- 在线唯一基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:952 / C10 Training Content Select`。当前稿要求 22px 顶栏标题、22px 左侧内边距、12px 返回/标题间距、20px 搜索图标、13px 搜索占位文案，以及 32px 高分类胶囊。
- `pages/coach/content-select` 仅调整页面级 WXSS：顶栏标题/间距、搜索图标与文字、分类胶囊高度和内边距；真实训练内容读取、筛选、选择、保存回读和不可编辑状态不变。
- 当前教练会话在未携带真实 `eventId` 时显示“无法读取训练内容”，这是页面契约要求的安全空态；未将 Figma 示例训练项目写进客户端，也未新增伪训练数据。
- 验证：C10 定向 Vitest 先红后绿，最终 `9/9`；小程序 TypeScript 检查通过；随后全仓门禁通过（domain `19/19`、小程序 `368/368`、API `113/113`）。微信开发者工具当前空态截图为 `C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-28-c10-current.png`，不作为有数据页面的视觉通过证据。

## 2026-08-28 C11 悬浮新增按钮图标修复

- 在线唯一基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`。复核真实 `564×1220` 模拟器输出（按设备倍率归一前）发现悬浮新增按钮只有正红色圆形，原因是 `plus.svg` 的线条颜色与按钮背景相同。
- 将 `/assets/icons/plus.svg` 线条改为白色；不改变新增入口的导航、真实测评任务读取或任何 API 契约。
- C11 定向测试先红后绿，最终 `9/9`；修复后 MCP 复拍为严格 `375×812`：`C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-28-c11-after-fix.png`，白色加号已可见。日期、状态、进度仍按真实 API 展示；本批全仓门禁通过（domain `19/19`、小程序 `369/369`、API `113/113`）。

## 2026-08-28 C14 雷达画布尺寸复核

- 重新读取在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1106`。当前稿的雷达图外框为 `320×320px`，位于 `295×360px` 的 Plot 中并允许横向溢出；顶部、统计卡和底部 TabIconsOverlay 结构保持不变。
- `pages/coach/team-ability` 将雷达组件从 `620rpx × 600rpx` 调整为 `640rpx × 640rpx`，使小程序逻辑尺寸与在线稿一致；未修改真实团队能力接口、8 维数据、趋势或排名不可用状态。
- WeChatIDE MCP 真实截图：`C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-28-c14-after-radar-size.png`，返回严格 `375×812`；运行态可进入 C14，真实账号返回 8 个维度，因此与 Figma 6 维示例存在数据结构差异，记录为真实数据差异而非伪造修复项。
- 验证：C14 定向 Vitest `5/5`；小程序 `tsc --noEmit` 通过；限定路径 `git diff --check` 通过。在线 Figma 当前账号仍为 View seat，本批没有伪称完成 Figma 写回。

## 2026-08-28 P1 家长日程周历与空态复验

- 在线唯一基准重新读取为 `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home` 与 `269:479 / P1 Schedule Home — Empty`；当前稿仍是周一至周日周历，左右保留上一周/下一周箭头，不是月历。此前月历尝试已撤回。
- 运行态先发现微信开发者工具模块内存仍保留旧教练会话，导致家长路由被 `requireRole("parent")` 送回教练页；通过 MCP 关闭并重新打开项目窗口重建运行时后，`wx` 存储与内存会话均恢复为真实双角色家长会话，未结束微信开发者工具进程、未清理生产数据。
- 真实运行截图：`C:\\Users\\ASUS\\Desktop\\football-club-management-codex-windows-2026-08-02\\tmp\\goal-p1-parent-empty-after-fix.png`（2026-08-28 空态）和 `C:\\Users\\ASUS\\Desktop\\football-club-management-codex-windows-2026-08-02\\tmp\\goal-p1-parent-upcoming-after-fix.png`（2026-08-27 有活动态），均由 WeChatIDE MCP 返回严格 `375×812`。有活动态使用真实比赛数据；Figma 示例中的训练名称、人数和统计值不写入客户端。
- 空态按在线 `269:479` 修复为白色实心圆角卡片、浅灰圆形日历图标和居中文字；原虚线框/圆形占位符已移除。周历、箭头、Hero 固定高度、胶囊区和 TabBar 保持在线稿结构。
- 验证：P1 定向 Vitest `13/13`、小程序 `tsc --noEmit`、WXML/WXSS 编译和限定路径 `git diff --check` 通过；本批仍不把运行截图中的真实数据差异误报为设计缺陷。

## 2026-08-28 C7 战术板真实运行态复验

- 重新读取在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 233:2`，并用真实教练会话打开 `pages/coach/tactical-board/index?eventId=event-cq-talent-secure-test-1-scheduled-match`。
- 真实运行态确认：`state=ready`、真实活动“周末联赛排兵”、真实阵型 `4-3-3`、8 名首发球员；球场、红色圆形球员标记、替补席、重置/保存操作区均存在。真实名单数量与 Figma 示例不同，未补写伪替补或伪球员。
- WXML 编译返回成功，模拟器控制台未出现 `wx:else` 编译错误；滚动 500px 后底部“重置阵型/保存战术板”仍可见。截图证据：`tmp/goal-c7-coach-current.png`、`tmp/goal-c7-coach-bottom-current.png`。
- 验证：C7 定向 Vitest `6/6`、小程序 TypeScript、WXML 编译均通过；本轮没有新增业务代码或 Figma 写回。

## 2026-08-28 C1 教练端日程 Hero 对齐修复

- 重新读取在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:578`，并以真实教练会话在 `2026-08-27` 有数据态进行 375×812 对照。
- 发现真实运行态 Hero 中时间与活动标题纵向堆叠，和在线稿的同一行层级不一致；将 `.c1-hero__main` 调整为横向 flex、基线对齐并保留标题省略保护。未修改日期、接口、真实数据或活动卡契约。
- 真实复拍：`tmp/goal-c1-coach-upcoming-after-hero-fix.png`，确认 `08:00` 与“周末联赛排兵”同一行显示；真实数据和 Figma 示例不同的队伍、日期、活动数量不作伪造对齐。
- 验证：C1 定向 Vitest `13/13`、小程序 TypeScript 通过；本批仅修改 C1 WXSS/测试和当前进度，生成的微信开发者工具 `index.js` 未纳入提交。

## 2026-08-28 C2 教练端活动工作台顶栏修复与复验

- 重新读取在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:606`，对照真实比赛活动 `event-cq-talent-secure-test-1-scheduled-match` 的 375×812 运行截图。
- 发现 C2 顶栏仍使用 `176rpx` 高度，导致活动 Hero 和后续工作台内容整体下移；改为标准 `88rpx` 内容高度，保留 `navInset/menuInset` 安全区避让和原有真实工作台逻辑。
- 修复后截图：`tmp/goal-c2-coach-after-nav-fix.png`。运行态顶栏、深色活动 Hero、真实 8 人出勤摘要、流程状态、比赛录入/战术板等动作均可见；在线稿中的进行中训练计时和训练内容进度不属于当前比赛数据，未伪造填入。
- 验证：C2 定向 Vitest `11/11`、小程序 TypeScript、微信 WXML/控制台错误检查通过；本批没有修改 API、数据库或 Figma。

## 2026-08-28 C4.2 教练端出勤修改页结构同步

- 在线唯一基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:715 / C4.2 Attendance Failed/Correction`。重新读取的稿面结构为橙色出勤修改警示卡、学员列表、修改说明输入区、底部重新提交按钮和教练 TabBar。
- `pages/coach/attendance` 的 correction 状态补齐“修改说明”全屏卡片与 `textarea`，并为 correction 页面增加滚动底部安全留白，避免真实名单超过 2 行时被固定重新提交按钮遮挡。
- 修改说明沿用现有出勤参与人的 `note` 契约：已有学员备注优先，未填写备注的学员使用本次核实说明；没有新增家长异议、异常人数或其他伪 API 字段。当前真实活动返回 8 名 `pending` 学员，不能套用 Figma 示例的“共 2 条异常”和示例姓名。
- 真实 WeChatIDE MCP 截图（严格 `375×812`）：`tmp/goal-c4-2-coach-final-top.png` 与 `tmp/goal-c4-2-coach-final-bottom.png`。顶部警示/名单与滚动后的名单/修改说明/重新提交均已取证；真实数据差异按契约豁免，不误报为设计缺陷。
- 验证：C4 点名定向 Vitest `7/7`、小程序 `tsc --noEmit`、WXML/WXSS 编译和 `git diff --check` 通过；此前同批全仓门禁为 domain `19/19`、小程序 `372/372`、API `113/113`，本次仅追加 WXSS 留白规则，未改 API。

## 2026-08-28 C5 待处理销课页按新版在线稿同步

- 在线唯一基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 537:2 / C5 Session Settlement — Pending`；同时复核了 `537:79` 历史稿和 `537:156` 详情稿。历史/详情仍是目标设计状态，当前后端没有跨活动销课历史聚合契约，因此没有伪造历史列表或 Figma 示例学员数据。
- `pages/coach/lesson` 摘要主标题改为“待处理销课”，真实活动日期、时间、队伍和场地继续由 workbench 字段预计算；学员状态胶囊改为“待确认”。确认操作区由固定定位改为页面正常流，并保留教练 TabBar，避免底部遮挡。
- `pages/coach/lesson-correction` 未改动真实更正链路：继续使用 workbench 与 lesson-confirmation 双读、幂等 PATCH、重新读取和失败保留。
- 验证：C5/C5.1 定向测试 `18/18`，小程序 `tsc --noEmit` 通过，限定路径 `git diff --check` 通过；WXML/WXSS 编译通过。WeChatIDE MCP 返回严格 `375×812`，但当前真实教练会话访问固定种子活动 `event-training-1` 返回 `403 Event is not accessible for this coach membership`，截图仅证明错误态，未作为有数据视觉通过证据。

## 2026-08-28 C5 销课历史与详情真实闭环

- 在线唯一基准仍为 `zZ6wKyOHKcO4UYXDd9jGwv`：历史 `537:79`、详情 `537:156`、待处理 `537:2`。在已有 C5 待处理/更正流程基础上，新增两个独立全屏路由：`pages/coach/lesson-history` 与 `pages/coach/lesson-detail`。
- 历史页只读取最近 30 天真实教练首页活动，筛选已完成训练，并逐个读取现有 `lesson-confirmation`；只有确认参与学员存在 `app-client-lesson-${eventId}-${studentId}` 台账来源时才展示，未新增伪历史 API、伪学员或 Figma 示例数据。
- 详情页复用现有 workbench 与 lesson-confirmation，只展示两者 `studentId` 交集，展示真实活动日期、时间、队伍、场地、训练内容、出勤与课时，并通过现有更正页完成回溯修正。
- 修复小程序 API 归一化：后端 `ledgers` 的嵌套 `ledger.balance/entries` 现在展开为余额与 `sourceIds`，同时兼容旧扁平字段；因此页面不会因真实嵌套响应丢失课时余额或误判销课状态。
- C5 待处理页新增“查看历史销课”入口，`app.json` 已登记两个路由。生成的微信开发者工具 `index.js` 仍属于构建产物，未纳入本批提交。
- 验证：C5 相关 5 个测试文件 `39/39` 通过，小程序 TypeScript 检查、全仓门禁和限定路径 `git diff --check` 均通过；全仓结果为 domain `19/19`、小程序 `381/381`、API `113/113`。本批未进行生产部署，API 路由契约未改变。
- 提交边界：本批仅包含 C5 页面、前端 API 归一化、类型、回归测试、任务记录、当前进度和对应 API 规范；微信开发者工具生成的 `pages/coach/lesson/index.js` 及工作区其他在途文件不纳入提交。
- 视觉边界：已按在线 Figma `537:2 / 537:79 / 537:156` 对齐页面结构与文案，但本批没有新增可信有数据 `375×812` 微信开发者工具截图，不宣称运行态像素级视觉验收通过。

## 2026-08-28 比赛记录闭环：教练编辑与家长比赛事件

- 教练端新增全屏 `pages/coach/match-edit`，从 C2 工作台或 C6 比赛详情进入；编辑页先读取真实比赛，再提交对手、比赛类型、状态和比分，保存后重新读取详情确认一致后才返回。取消比赛禁止填写比分，已完成比赛要求完整非负整数比分。
- C6 比赛详情保留只读事件时间线，并提供“编辑比赛”与独立“添加事件”入口；“乌龙球”等事件类型继续由后端 capability 返回，未写入伪事件或伪名单。
- 家长 P2.1 比赛详情现在消费 `/events/:eventId` 返回的真实 `match` 与按绑定孩子过滤的 `matchEvents`，在 TypeScript 中预计算中文事件标签、分钟、球员名和状态色；没有 API 数据时显示明确空态。
- 修复持久化比赛更新边界：`PersistentApiStore` 按活动复用已有比赛 ID，避免 SQLite `UNIQUE (club_id,event_id)` 冲突；新增 API 回归证明编辑同一活动不会插入第二条比赛。
- 定向验证：小程序比赛编辑/家长详情 `8/8`；API 比赛保存/详情/事件 `8/8`；小程序 TypeScript `tsc --noEmit` 通过；domain 已重新 build。全仓门禁与本批 diff 检查在提交前执行。
- 视觉边界：本批未新增可信 375×812 Figma 对照截图；静态与 API 通过不等于视觉验收通过，真实截图仍需用户在微信开发者工具编译后复拍。

## 2026-08-28 训练计划与训练课关联持久化

- 根因确认：`session_plans` 已经落 SQLite，但 `TrainingSession` 仍只存在 `SeedBackedStore.data`；API 重启后活动会回到 seed 中的旧 `sessionPlanId/intensity`，导致教练保存的训练内容关联无法稳定演示。
- 新增 `apps/api/db/migrations/0016_training_sessions.sql` 与 `TrainingSessionRepository`。训练课按 `(club_id,event_id)` 唯一更新，保留已有稳定 session id；`session_plan_id`、训练类型、强度和审计时间均持久化。
- `PersistentApiStore` 现在在启动时合并持久化训练课，在保存时写入仓储；种子回放使用 `insertIfAbsent`，不会覆盖教练已保存的训练计划关联。
- 真实闭环验证：通过现有教练 `PUT .../coach/events/event-training-1/training-projects` 保存真实训练项目和 `high` 强度，关闭文件数据库并以新 seed 数据重开后，coach workbench 仍返回相同 `sessionPlanId`、强度、已选项目 ID 和训练项目详情。
- 定向验证：训练课重启回归、session plan 回归、迁移幂等共 `3/3`；训练内容 BFF 聚合用例 `1/1`；完整 API persistence `13/13`；API 类型检查通过。
- 视觉边界：本批没有修改小程序页面，也没有新增可信 `375×812` Figma/微信开发者工具截图；API/数据库通过不等于视觉验收通过。

## 2026-08-28 家长成长子页面当前学员一致性修复

- 在线 Figma 目标复核：P4.1 成长足迹 `zZ6wKyOHKcO4UYXDd9jGwv / 499:2`、P4.2 训练历程 `zZ6wKyOHKcO4UYXDd9jGwv / 499:18`；本批只修复数据选择逻辑，不改变现有画板结构。
- 根因：成长首页已经按会话 `currentStudentId` 解析当前学员，但 `pages/parent/milestones` 和 `pages/parent/training-history` 仍固定使用 `children[0]`，切换学员后会继续显示第一位学员的成长足迹或训练历程。
- 修复：两个页面的 `load()` 现在调用 `requireRole("parent")` 并使用 `children.find(child.id === session.currentStudentId) ?? children[0]`；页面首次加载和重试都读取持久会话中的当前学员，原有 API、空态、错误态和 Figma 全屏布局保持不变。
- 回归覆盖：新增两个页面测试，证明第二位绑定学员会被用于训练历程筛选和成长足迹统计；测试先按旧实现进入 RED，修复后 `2/2` 通过。
- 验证：家长定向测试 `2/2`；完整门禁 domain `20/20`、小程序 `388/388`、API `115/115` 全绿；`git diff --check` 通过。本批没有修改 API、生产数据库或 Figma，也没有宣称新增视觉验收证据。

## 2026-08-28 P1 家长日程月历 V2 同步

- 当前在线唯一基准已通过 Figma MCP 重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 521:339 / P1 Schedule Home — Month V2`，画板尺寸 `375×812`。该节点明确使用白色月历卡、周一至周日列、日期标记、选中日期、活动列表和家长 TabBar；此前进度中“月历尝试已撤回”的记录已被当前在线稿 supersede。
- `pages/parent/schedule` 已同步到月历数据模型：固定 42 格、周一开周、前后月日期、今天/选中状态、训练/比赛/多事件标记；月份范围请求、绑定学员过滤、选中日期卡片和真实 Hero/提醒/TabBar 均继续使用现有真实 API 与 view model。
- 在线稿当前可见的月份标题栏仅有右侧 `›`，因此 WXML 最终只保留右侧视觉控件；`changeMonth` 仍支持 `-1/1` 偏移，便于后续在 Figma 明确补齐上一月入口后启用。没有伪造月份数据、活动、统计或会话。
- 验证：P1 定向 Vitest `16/16`；小程序 TypeScript 通过；微信 WXML/WXSS 编译通过；完整门禁通过（domain `20/20`、小程序 `391/391`、API `115/115`）；`git diff --check` 通过。
- 视觉证据与顶栏修正（已补齐）：Figma 对照图保存为 `tmp/goal-p1-figma-521-339-rerun.png`；通过现有生产验证脚本建立真实 parent 会话，WeChatIDE MCP 打开 `pages/parent/schedule/index` 并保存最终截图 `tmp/goal-p1-parent-month-after-nav-fix.png`。返回原始 `563×1218`，与逻辑 `375×812` 等比例，截图确认月历、真实活动日期标记、提醒角标、空活动卡和家长 TabBar 均已渲染；同时确认顶栏安全区、18px 标题、32px Figma bell 资产和 Hero 起始位置已对齐。Figma 示例中的日期/活动/统计与真实 API 数据不同，按动态数据差异豁免；系统状态栏属于模拟器壳层，不计入业务页面偏移。P1 视觉验收证据已收口。

## 2026-08-28 C14 团队能力总览当前在线稿收口

- 在线 Figma MCP 已重新读取唯一文件 `zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`。当前稿的关键结构为 88px 软粉顶栏、24×32px 返回控件、左对齐标题、52×29px 导出控件、深色团队能力雷达卡、趋势胶囊、维度统计、TOP 3 排名区和教练 TabBar。
- 对照现有代码后确认 C14 业务实现已经完成：页面继续读取真实 `getCoachTeamAbilityOverview()` 与 `getCoachTeam()`，雷达/综合分/趋势/维度摘要均由 TypeScript view model 生成；评估时间、排名和导出能力在 API 未提供时保持明确不可用，不复制 Figma 样例。
- C14 任务材料已从 `TBD/_example` 补成可追溯的真实 PRD、上下文清单和验收记录。没有新增 API、数据库、伪统计或无关代码改动。
- 可信运行态证据：`tmp/goal-c14-runtime.png` 为 WeChatIDE MCP 模拟器原始截图，返回 `563×1218`，系统信息为 iPhone X 逻辑 `375×812`；Figma 对照图为 `tmp/goal-c14-figma.png`。真实账号显示 8 维能力和真实队伍信息，Figma 样例显示 6 维，属于数据契约差异，不能据此伪造或判定结构未完成。
- 同轮还复核 C7 战术板：当前 `index.wxml` 的 `wx:else` 已置于独立 `<block>`，微信开发者工具 WXML/WXSS 编译成功；刷新后模拟器控制台无 `wx:else` 或 `route is not defined`。旧报错来自刷新前缓存 bundle，重新编译/刷新后不再复现。
- 验证：C14 与 C7 定向 Vitest `11/11`；微信 WXML/WXSS 编译成功；后续全仓门禁与 `git diff --check` 见本批提交记录。

## 2026-08-28 C7 战术板当前在线稿复核与证据收口

- 在线唯一基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 233:2 / CODE / C7 Tactical Board MVP`。本次 Figma MCP 返回 `375×812`，结构仍为白色圆角顶栏、`MATCH TACTICS`、比赛标题/保存状态、阵型卡、绿色球场、红色球员圆点、替补席和重置/保存操作区；未发现需要重新施工的在线稿变化。
- WeChatIDE MCP 重新打开真实教练路由：`pages/coach/tactical-board/index?eventId=event-cq-talent-secure-test-1-scheduled-match`。页面读取真实比赛“周末联赛排兵”、真实 `4-3-3` 阵型和真实名单；截图 `tmp/goal-c7-coach-current-rerun.png` 返回 `563×1218` 原始像素，对应 iPhone X 逻辑视口 `375×812`。
- 本次 WXML 编译与 WXSS 编译均成功；模拟器控制台按 `error|exception|wx:else|route is not defined` 过滤无命中。此前 `wx:else`/`route` 报错不再复现，结论仍是旧缓存 bundle/旧运行态问题，不是当前 C7 源码错误。
- C7 页面保持真实 API 与交互闭环：名单过滤、阵型切换、拖拽、首发/替补换位、重置、保存、只读、加载、空态和错误态均未被证据复核改变；没有新增伪球员、伪数据、伪会话或 API。
- 文档收口：C7 `prd.md` 删除重复 `TBD` 模板段；`implement.jsonl` 改为真实设计上下文；`task.json` 补齐描述、范围、关联文件和运行证据。截图证据与当前任务记录同步保留，生成的微信开发者工具 `index.js` 不纳入提交。

## 2026-08-28 家长端学期报告与通知 Banner 任务启动

- 在线唯一 Figma 文件为 `zZ6wKyOHKcO4UYXDd9jGwv`，家长页根 `4:6`。本批设计已建立并由 Figma MCP 复核：P4.3 学期成长报告 `701:177`；P1 通知 Banner 变体 `714:185`；Banner 分组节点 `717:2`，画面基准为 375×812。
- 本批进入代码实现前，已把节点、数据边界、真实 API 契约和空态要求写入 `.trellis/tasks/08-29-parent-semester-report-notice-banner/`，并补齐 implement/check 上下文清单。
- 实施顺序固定为：报告页与“我的孩子”入口 → `content/articles` 的 `notice` 内容切片与日程 Banner → 定向测试、全仓门禁、可信模拟器截图、路径限定提交。未完成前不把 Figma 静态复核或接口存在误报为运行态验收。
- 代码已完成并验证：新增 `pages/parent/semester-report`，成长报告入口改为全屏页；`ContentArticle` 增加 `notice/publishedAt/expiresAt`，日程通过 `presentNoticeBanner()` 读取真实通知并预计算摘要。报告页运行截图为 `tmp/goal-p4-3-semester-report-runtime.png`（WeChatIDE 返回 564×1218 设备栅格）；当前线上服务尚未部署本批 API 种子，因此 `tmp/goal-p1-notice-banner-runtime.png` 只证明无通知空态，不能作为 Banner 有数据视觉通过证据。
- 定向检查：报告/入口 `10/10`、日程 Banner `15/15`、API `server.test.ts 55/55`；domain 20/20、小程序 401/401、API 115/115 全仓门禁通过；WXML/WXSS 编译通过。下一步必须路径限定提交并部署 API 后，重新采集有通知的 375×812 截图。

## 2026-08-28 家长端学期报告与通知 Banner 部署复验

- 提交 `87ab316` 已推送到 `origin/dev`。部署前在生产 SQLite 卷内创建受限一致性备份；使用提交归档上传到 `/opt/cq-talent-releases/87ab316`，构建并标记 `cq-talent-api:87ab316` 与 `cq-talent-api:latest`，保留旧镜像回滚标签。
- 通过 `sudo docker compose -f /opt/cq-talent-api/docker-compose.yml up -d --no-build --force-recreate api` 重建 API；启动初期的两次连接重置属于容器启动窗口，随后内部 `http://127.0.0.1:3000/health` 与公网 `https://cqtc.pomi.tech/health` 均返回 200。部署未执行生产数据清理或重置。
- WeChatIDE MCP 刷新并打开 `pages/parent/schedule/index`，实际返回 `375×812` PNG：`tmp/goal-p1-notice-banner-runtime-after-deploy.png`。截图中“秋季训练安排提醒” Banner 已出现，证明新通知内容经过生产 API → 小程序 BFF → TS view model → WXML 的真实链路；无通知空态证据仍保留在 `tmp/goal-p1-notice-banner-runtime.png`。
- 本批最终本地门禁：`npx --yes pnpm@10.33.0 run check` 使用任务专用临时 npm cache 后 exit `0`，domain `20/20`、小程序 `401/401`、API `115/115`；`git diff --check` exit `0`。第一次直接 npx 被 Windows npm cache 的 `EEXIST/EBADF` 拦截，未进入项目检查，已通过隔离 cache 复验。

## 2026-08-28 C5 销课历史与详情真实运行态补证

- 重新读取在线唯一 Figma 画板：`zZ6wKyOHKcO4UYXDd9jGwv / 537:2`（待处理）、`537:79`（历史）、`537:156`（详情）；三张画板均为 `375×812`。未发现需要更新离线结构参考的实质变化。
- 通过真实教练会话和 WeChatIDE MCP 打开 `pages/coach/lesson/index?id=event-cq-talent-secure-test-1-trn-0818`，读取真实 8 名学员；确认“确认全部”后，历史页出现真实销课记录，点击记录进入详情页，详情页滚动到底部可见训练内容空态和“更正本次销课”入口。
- 运行证据：`tmp/goal-c5-coach-current-live.png`、`tmp/goal-c5-history-after-confirm-live.png`、`tmp/goal-c5-detail-live.png`、`tmp/goal-c5-detail-live-bottom.png`，均由 WeChatIDE MCP 返回严格 `375×812`；模拟器 console 过滤 `error|exception|wx:else|route is not defined` 无命中。训练内容显示 `0 项` 是当前真实 API 数据，不以 Figma 示例内容替代。
- 本轮没有修改业务代码或 Figma；通过页面现有提交操作补齐了受控测试教练账号的一条真实销课台账。完整门禁重新通过：domain `20/20`、小程序 `401/401`、API `115/115`；`git diff --check` 通过。C5 运行态证据已补齐，继续总目标时优先审计仍缺有数据运行证据的其他页面。

## 2026-08-28 C15/C15.1 能力评估录入与提交态运行复验

- 在线唯一 Figma 基准重新读取：C15 `93:1132`（原图 `375×1002`）与 C15.1 `93:1163`（`375×812`）。C15 运行态已覆盖首屏与滚动到底部，C15.1 已覆盖提交成功页。
- WeChatIDE MCP 真实教练会话证据：`tmp/goal-c15-assessment-entry-live.png`、`tmp/goal-c15-assessment-entry-live-bottom.png`、`tmp/goal-c15-1-submit-live.png`，均返回严格 `375×812`；console 过滤 `error|exception|wx:else|route is not defined` 无命中。
- C15 的顶栏、保存草稿、能力分组、学员卡、指标滑杆、底部“保存所有”和教练 TabBar 已与在线稿结构核对；C15.1 的成功图标、摘要卡、按钮和 TabBar 已核对。在线稿示例的 3 组/6 项/分数与真实 API 当前返回的 1 组/1 项/空值是数据契约差异，未伪造补齐。
- 本轮没有业务代码或 Figma 写回；完整门禁已通过：domain `20/20`、小程序 `401/401`、API `115/115`，`git diff --check` 通过。下一步继续处理仍缺当前运行证据的教练端页面，并保持测试数据与真实 API 隔离。

## 2026-08-28 C10/C10.1 训练内容选择与覆盖预览运行复核

- 在线唯一 Figma 基准重新读取：C10 `zZ6wKyOHKcO4UYXDd9jGwv / 93:952`、C10.1 `zZ6wKyOHKcO4UYXDd9jGwv / 93:983`，两张画板均为 `375×812`。
- C10 真实教练会话截图为 `tmp/goal-c10-content-select-live-rerun.png`：顶栏、搜索、横向分类、训练项目卡、底部选择栏和训练管理 TabBar 结构存在；真实训练内容数量、分类和选择状态与 Figma 示例不同，按真实 API 展示。
- C10.1 真实教练会话截图为 `tmp/goal-c10-1-coverage-live.png`：覆盖预览、学员卡、能力进度条、底部确认栏和训练管理 TabBar 结构存在；真实接口返回 10 个维度和真实学员/进度，在线稿 3 个示例维度属于数据差异。
- 两页均通过 WXML 编译与模拟器 console 错误过滤；本轮没有修改业务代码、API、数据库或 Figma，仅补充规格和运行证据。当前 C10/C10.1 可按“结构复核通过、示例数据不替换”记录，继续检查仍缺当前运行证据的教练端页面。

## 2026-08-28 C12/C12.1 评分录入与本机自动保存运行复核

- 在线唯一 Figma 基准重新读取：C12 `zZ6wKyOHKcO4UYXDd9jGwv / 93:1030`（原图 `375×894`）、C12.1 `zZ6wKyOHKcO4UYXDd9jGwv / 93:1061`（`375×812`）。
- C12 真实教练会话截图为 `tmp/goal-c12-test-entry-live-final.png`：顶栏、任务摘要卡、待录入学员列表、固定保存区和训练管理 TabBar 均可见；真实任务返回 8 名学员、62 个中文指标和 `0 / 496` 进度，未替换为 Figma 示例数据。
- C12.1 使用真实活动/模板/学员/评分项 ID 仅在模拟器本机写入一条有效草稿后复现，截图为 `tmp/goal-c12-1-autosave-live.png`。自动保存遮罩、标题、按钮和 TabBar 与在线稿结构对应；时间显示本机真实时间，不伪造“1分钟前”。
- 两页均通过模拟器 console 错误过滤；本轮没有修改业务代码、API、生产数据库或 Figma。C12/C12.1 运行证据已补齐，继续检查仍缺当前运行证据的教练端页面。

## 2026-08-28 C6.1/C6.2 比赛事件与本机草稿运行复核

- 在线唯一 Figma 基准重新读取：C6.1 `zZ6wKyOHKcO4UYXDd9jGwv / 93:827`、C6.2 `zZ6wKyOHKcO4UYXDd9jGwv / 93:858`；在线截图保存为 `tmp/figma-c6-1-93-827-live.png` 与 `tmp/figma-c6-2-93-858-live.png`。
- 修复一个真实缓存根因：启动页调用 `/app-clients/resolve` 后，复用已有登录 session 时未刷新 session 内的客户端能力，导致 C6.1 错误进入“未配置事件类型”空态。现在会合并最新 club/client/capabilities；回归测试先红后绿，随后真实启动流程得到后端返回的 `进球/助攻/扑救/抢断` 四类事件。
- C6.1 真实截图为 `tmp/goal-c6-1-match-event-add-fixed.png`，严格 `375×812`；真实比赛详情 `200`，表单结构可用，控制台错误过滤无命中。Figma 示例中的 `黄牌/红牌/换人/其他` 未被当前客户端 capability 返回，页面保持能力驱动，不硬编码示例配置。
- C6.2 通过真实输入分钟 `54` 触发设备草稿，再打开比赛页复现遮罩；截图为 `tmp/goal-c6-2-match-current.png`，严格 `375×812`，`hasLocalDraftOverlay=true`。该状态仅保存在当前设备，文案明确说明本机范围，未误报为 API 持久化。
- 本轮小程序定向回归与 TypeScript 检查通过；WeChatIDE MCP 页面/截图通道已恢复。下一步继续检查尚缺当前运行证据的教练端页面。

## 2026-08-28 C9 队伍详情最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:924`，在线画板完整高度 `375×871`；截图保留为 `tmp/figma-c9-93-924-live.png`。
- 真实教练会话打开 `pages/coach/team/index` 并返回 `ready`：真实队伍摘要、在队人数 `8`、累计训练 `13`、出勤率 `88%`、8 名学员和 1 名教练均已进入 view model。运行截图为 `tmp/goal-c9-team-detail-top-live.png`，严格 `375×812`。
- 结构核对通过：软粉顶栏、深色摘要卡、三项统计、四列学员网格、横向教练卡与教练 TabBar 均存在；真实队名/赛季/姓名较 Figma 示例不同，按真实 API 数据差异处理。控制台错误过滤无命中。

## 2026-08-28 C11 测评任务列表最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1002`，截图为 `tmp/figma-c11-93-1002-live.png`。
- 真实教练会话打开 `pages/coach/test-tasks/index`，页面状态为 `ready`，返回 4 个真实任务；截图为 `tmp/goal-c11-test-tasks-live.png`，严格 `375×812`。首屏的顶栏、新增、筛选、任务卡、进度轨道、悬浮新增按钮和教练 TabBar 均已复核。
- 真实任务日期、标题、状态和进度与 Figma 示例不同，保持 API 数据；控制台错误过滤无命中。本轮无需业务代码或 API 改动。

## 2026-08-28 C4.2 出勤修改最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:715`；截图保存为 `tmp/figma-c4-2-93-715-live.png`，画板严格 `375×812`。
- WeChatIDE MCP 真实教练会话打开 `pages/coach/attendance/index?id=event-cq-talent-secure-test-1-trn-0818&correction=1`；首屏截图 `tmp/goal-c4-2-attendance-correction-live.png`，滚动到底部截图 `tmp/goal-c4-2-attendance-correction-live-bottom.png`，均严格 `375×812`。
- 真实 workbench 请求返回 `200`，页面 data 确认 `correctionMode=true`、8 名真实学员和真实出勤状态；首屏/底部均验证警示卡、学员列表、修改说明、固定“重新提交”和教练 TabBar，console 错误过滤无命中。
- Figma 的 2 条“家长异议”是画板示例数据，当前 API 没有家长异议字段且真实返回 8 人，不能伪造过滤或改名；本页按真实数据呈现，结论为结构与交互运行态复核通过，动态示例差异豁免。本轮没有业务代码、API、数据库或 Figma 写回。

## 2026-08-28 C5.1 课时更正最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:765`；截图保存为 `tmp/figma-c5-1-93-765-live.png`，画板严格 `375×812`。
- WeChatIDE MCP 真实教练会话打开 `pages/coach/lesson-correction/index?id=event-cq-talent-secure-test-1-trn-0818`；首屏截图 `tmp/goal-c5-1-lesson-correction-live.png`，滚动到底部截图 `tmp/goal-c5-1-lesson-correction-live-bottom.png`，均严格 `375×812`。
- 真实 workbench 与 `lesson-confirmation` 均返回 `200`，页面状态 `ready`，读取 8 名真实学员和课时余额；首屏/底部验证异常提示、学员更正卡、步进器、保存按钮和教练 TabBar，console 错误过滤无命中。
- Figma 的两名示例学员、系统差异标签和 `0.5` 初始值不属于当前 API 真实状态；页面保留真实学员、余额和 `±0` 初始选择，没有伪造数据。本轮没有业务代码、API、数据库或 Figma 写回。

## 2026-08-28 C3 活动变更最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:634`；在线画板原始高度 `903`，截图保存为 `tmp/figma-c3-93-634-live.png`。
- WeChatIDE MCP 真实教练会话打开 `pages/coach/event-change/index?id=event-cq-talent-secure-test-1-trn-0818`；首屏截图 `tmp/goal-c3-activity-change-live.png`，滚动底部截图 `tmp/goal-c3-activity-change-live-bottom.png`，均严格 `375×812`。
- workbench 与 venues 请求均返回 `200`，页面状态 `ready`；真实活动、3 个场地和 8 位受影响家长进入 view model。首屏/底部验证变更原因、时间、场地、说明、通知开关、保存入口和教练 TabBar，console 错误过滤无命中。
- Figma 预填的新时间、新场地、示例队名和 `20` 位家长不是当前真实状态；页面保持真实活动与空的新值，没有伪造变更申请。本轮没有业务代码、API、数据库或 Figma 写回。

## 2026-08-28 C4.1 出勤成功最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:696`；截图保存为 `tmp/figma-c4-1-93-696-live.png`。
- WeChatIDE MCP 真实教练会话打开 `pages/coach/attendance-success/index?eventId=event-cq-talent-secure-test-1-trn-0818`；截图保存为 `tmp/goal-c4-1-attendance-success-live-rerun.png`，页面返回 `ready`，截图为严格 `375×812` 逻辑视口对应的模拟器图。
- 真实页面读取活动“传接球配合训练”、日期“8月18日 周二”、时间“10:30–12:00”和 8 名学员，其中 6 名到场、2 名未到场；摘要由真实 workbench 计算为 `6/8人`，没有复制 Figma 示例的 18/20 和示例文案。
- 结构核对通过：软粉顶栏与返回键、成功圆、标题/副标题、四行摘要卡、单一“查看训练详情”主按钮和教练 TabBar 均存在；workbench 请求返回 `200`，console 过滤 `error|exception|wx:else|route is not defined` 无命中。
- 本批没有修改业务代码、API、生产数据库或 Figma；结论为 C4.1 真实运行态结构复核通过，动态数据差异按真实 API 契约豁免。

## 2026-08-28 C13 学员雷达最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1080`；在线截图保存为 `tmp/figma-c13-93-1080-live-20260828.png`。
- WeChatIDE MCP 首次截图捕获到加载态，已等待 `.radar-hero` 出现后重新取得稳定截图：`tmp/goal-c13-student-radar-live-ready-20260828.png`；滚动到底部截图为 `tmp/goal-c13-student-radar-live-bottom-20260828.png`，均严格 `375×812`。
- 真实页面返回 `state=ready`，当前学员为“测试球员第1组-1”，真实名单 8 人、8 个中文雷达维度、综合分 `75`、评估时间 `2026-08-13 评估`；雷达图、维度评分、评语空态和教练 TabBar 均已复核。
- 在线稿中的 5 名学员、6 个维度、示例分数 `76` 与教练评语不属于当前真实 API 数据，未伪造替换。console 过滤 `error|exception|wx:else|route is not defined` 无命中；本批没有业务代码、API、生产数据库或 Figma 写回。

## 2026-08-28 C16.1 权限范围最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1210`；在线截图保存为 `tmp/figma-c16-1-93-1210-live-20260828.png`。
- WeChatIDE MCP 打开真实教练路由 `pages/coach/permissions/index?source=goal`；稳定截图 `tmp/goal-c16-1-permissions-live-20260828.png`，严格 `375×812`。
- 页面返回 `state=ready`，真实 capabilities 映射出 5 项权限：修改活动关闭、批量出勤开启、能力评估开启、发起私教开启、查看财务关闭。动态开关状态与 Figma 示例不同，按真实 session 保留，未伪造。
- 顶栏、说明卡、五行权限卡、只读开关、保存更改视觉按钮和教练 TabBar 已核对；console 过滤 `error|exception|wx:else|route is not defined` 无命中。本批没有业务代码、API、生产数据库或 Figma 写回。

## 2026-08-28 C16.2 私教兴趣最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1238`；在线截图保存为 `tmp/figma-c16-2-93-1238-live-20260828.png`。
- WeChatIDE MCP 打开真实教练路由 `pages/coach/private-interest/index?source=goal`；截图保存为 `tmp/goal-c16-2-private-interest-live-20260828.png`，严格 `375×812`。
- 真实页面返回私教服务已开通、接受预约开启；真实偏好为周一至周五四个时段全选、周末四个时段未选，费用说明为“费用由俱乐部统一结算”。
- 顶栏、说明卡、预约开关、7 列×4 行网格、周末灰态、费用说明和教练 TabBar 已核对；console 过滤 `error|exception|wx:else|route is not defined` 无命中。本批没有业务代码、API、生产数据库或 Figma 写回。

## 2026-08-28 C16.3 教练账号最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1262`；在线截图保存为 `tmp/figma-c16-3-93-1262-live-20260828.png`。
- WeChatIDE MCP 打开真实教练路由 `pages/coach/account/index?source=goal`；截图保存为 `tmp/goal-c16-3-coach-account-live-20260828.png`，严格 `375×812`。
- 页面返回 `teamState=ready`，真实会话显示教练“Secure coach 1”、两支负责球队；手机号和微信绑定字段未由当前会话提供，页面保持“当前会话未提供/状态待同步”。
- 资料卡、联系方式卡、设置行、清除缓存和教练 TabBar 已对照在线稿复核；动态姓名、球队、手机号和绑定状态未用 Figma 示例伪造。console 过滤 `error|exception|wx:else|route is not defined` 无命中；本批没有业务代码、API、生产数据库或 Figma 写回。

## 2026-08-28 C16.4 教练帮助中心最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:1286`；在线截图保存为 `tmp/figma-c16-4-93-1286-live-20260828.png`。
- WeChatIDE MCP 打开真实教练路由 `pages/coach/help/index?source=goal`；首屏截图 `tmp/goal-c16-4-coach-help-live-20260828.png`，滚动底部截图 `tmp/goal-c16-4-coach-help-live-bottom-20260828.png`，均严格 `375×812`。
- 真实页面返回 `state=ready`、6 个中文分类、5 条 FAQ；搜索、快速上手卡、FAQ 列表、支持卡和教练 TabBar 均已复核，console 过滤 `error|exception|wx:else|route is not defined` 无命中。
- Figma 示例的分类文案、工作时间、在线咨询和公众号按钮不属于当前 API 契约，页面显示“支持方式待配置”，未伪造示例支持能力。本批没有业务代码、API、生产数据库或 Figma 写回。

## 2026-08-28 P5 家长能力雷达长标签换行修复与运行复验

- 根因：真实 P5 维度数据包含“整体战术”“小组配合”等四字中文标签，旧 `.dim-row__label { width: 96rpx; }` 在 28rpx 字号下不足以容纳整行，导致底部维度详情换行；这不是 Figma 结构变更，也不涉及数据伪造。
- 修复：`apps/miniprogram-cq-talent/pages/parent/radar/index.wxss` 将标签列调整为 `120rpx` 并增加 `white-space: nowrap`；新增 `index.test.mjs` 回归断言，确保较长中文维度标签保持单行。
- 运行证据：WeChatIDE MCP 真实家长会话重新打开 `pages/parent/radar/index`，取得严格 `375×812` 截图 `tmp/goal-p5-parent-radar-label-fix-20260828.png` 与 `tmp/goal-p5-parent-radar-label-fix-bottom-20260828.png`；底部截图确认“整体战术”“小组配合”单行显示。在线 Figma 基准仍为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:278`，对照图 `tmp/figma-p5-93-278-live-20260828.png`，本轮无需修改 Figma。
- 验证：P5 定向 Vitest `8/8`；全仓 `check` 通过（domain `20/20`、小程序 `403/403`、API `115/115`），小程序 TypeScript 与 P5 WXSS 编译均通过。

## 2026-08-28 C1 教练日程首页设计契约修正

- 在线唯一 Figma 基准在开工前重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:578`，画板为 `375×812`；确认当前稿为 88px 顶栏、64px 周日期条、内容宽度统计胶囊、180px Hero、96px 活动卡和 70px 教练 TabBar。
- 最小改动范围：`apps/miniprogram-cq-talent/pages/coach/schedule/index.ts`、`index.wxml`、`index.wxss` 与定向测试。Hero 统计从单一字符串改为预计算的值/标签/色调字段，第一项按在线稿使用正红主强调；统计胶囊改为内容宽度；Hero 时间调整到 54px 视觉尺寸；活动卡右侧改用已有 `assets/icons/chevron-right.svg`，不再使用文本字符箭头。
- 数据仍完全来自 `getCoachHome({ from, to })`；没有新增 Figma 示例日期、姓名、球队、场地、人数或状态。
- 验证：C1 定向 Vitest `15/15`；小程序 TypeScript `exit=0`；全仓 `check` `exit=0`（domain `20/20`、小程序 `405/405`、API `115/115`）；`git diff --check` 通过。
- 视觉验收暂未收口：WeChatIDE MCP 可返回 `simulator_open_page` 成功，但运行时随后仍读到家长端 `/pages/parent/schedule/index`；`simulator_screenshot` 超时，动态窗口兜底也未发现唯一可见 DevTools 模拟器窗口。故本批不能标记为“Figma 视觉通过”，待运行时恢复后需重新导航到教练会话、取得真实 `375×812` 截图并对照复验。

## 2026-08-28 C4 主出勤最新运行复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:665`；在线截图保存为 `tmp/figma-c4-93-665-live-20260828.png`。
- WeChatIDE MCP 真实教练会话打开 `pages/coach/attendance/index?id=event-cq-talent-secure-test-1-trn-0818`；首屏截图 `tmp/goal-c4-attendance-live-20260828.png`，滚动底部截图 `tmp/goal-c4-attendance-live-bottom-20260828.png`，均严格 `375×812`。
- 真实页面返回 `state=ready`，活动“传接球配合训练”读取 8 名学员，6 名到场、2 名未到场，实际状态包含到课、缺席、请假和迟到；操作区、状态选择、总人数和教练 TabBar 均已复核。
- 在线稿示例的 20 人名单、示例姓名和统计未被伪造；console 过滤 `error|exception|wx:else|route is not defined` 无命中。本批没有业务代码、API、生产数据库或 Figma 写回。

## 2026-08-28 C1 教练日程首页真实视觉验收

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:578`，原始画板严格 `375×812`；本次截图保存为 `C:\Users\ASUS\AppData\Local\Temp\cq-c1-figma-20260828.png`。
- 先复现并定位运行问题：`simulator_open_page` 虽返回成功，但已有小程序进程缓存了家长 session；直接写 `wx` 存储后，启动页仍会用内存中的旧 session 覆盖存储。因此通过家长账号设置页调用真实 `switchToCoach` → `/session/role` → `persistAuthenticatedSession` 链路恢复教练身份，没有伪造前端角色。
- 运行时随后验证为 `/pages/coach/schedule/index`，`systemInfo` 返回 iPhone X、逻辑视口 `375×812`、`pixelRatio=3`；真实教练数据日期切到 `2026-08-27` 以展示已有活动，MCP 截图保存为 `C:\Users\ASUS\AppData\Local\Temp\cq-c1-coach-20260828-data.png`，PNG 严格 `375×812`。
- 对照结论：顶栏、七日日期条及前后箭头、内容宽度统计胶囊、深色 Hero、活动卡、SVG 右箭头和教练 TabBar 的结构/层级均与在线稿一致。真实日期、教练/球队名称、数量、活动标题、状态及卡片数量属于 API 数据差异，未用 Figma 样例替换。
- 新增的运行时教训：切换截图角色时必须走应用真实双角色切换链路；仅通过 Automator `setStorage` 修改 `cqTalentSession` 不会清除当前 JS 进程的 `sessionState` 缓存，下一次启动会把旧角色写回。截图工具仍保持 fail-closed，不以桌面裁剪或固定旧端口替代 MCP 证据。

## 2026-08-28 家长端实时日期任务收口审计

- 复核 `.trellis/tasks/08-10-parent-schedule-live-date/`：共享 `resolveParentPageDate` 已默认使用设备本地日期，开发固定日期开关保持关闭；家长日程当前按在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 521:339` 的月历 V2 请求所选月份，不能再按旧周历标准回退。
- 最新 Figma MCP 截图 `C:\Users\ASUS\AppData\Local\Temp\cq-p1-month-figma-20260828.png` 严格为 `375×812`；确认当前画板只有右侧月份箭头，前一月处理器保留但未暴露为未批准视觉控件。
- API 日期边界定向回归 `12 files / 115 tests` 通过；小程序定向范围实际执行为当前全量 `66 files / 405 tests` 通过。覆盖 date-only `to` 全天包含、次日排除、非法/倒序/超长范围及家长数据权限。
- 本轮无业务代码修改；旧任务的“周一至周日初始请求/周切换”标准已记录为被 P1 Month V2 supersede，避免后续误把现行月历改回周历。

## 2026-08-28 P3 / C4.1 在线 Figma 修复复验

- 继续使用唯一在线 Figma 文件 `zZ6wKyOHKcO4UYXDd9jGwv`，分别复核 P3 `93:222` 与 C4.1 `93:696`。
- P3 修复提醒中心顶栏：移除在线稿不存在的“返回”文字，保留 24px 级别的左箭头槽位，并同步标题视觉尺寸；C4.1 用在线稿下载的白色描边勾选 SVG 替换文本 `✓`，图标尺寸为 40px。
- 两页均通过 WeChatIDE MCP 取得严格 `375×812` 修复后截图并完成对照；P3 的提醒内容、C4.1 的出勤统计继续使用真实 API 数据，未复制 Figma 示例。
- 定向回归 9/9 通过；独立缓存执行全仓 `check` 通过：domain 20/20、小程序 408/408、API 115/115；`git diff --check` 通过。
- 证据详见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/p3-c4-1-repair-2026-08-28.md`。本批已完成路径限定提交，继续检查剩余 role-tabbar 页面。

## 2026-08-29 C4.2 出勤修改页在线 Figma 修复复验

- 在线唯一 Figma 基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 93:715`。真实教练路由 `pages/coach/attendance/index?id=event-cq-talent-secure-test-1-trn-0818&correction=1` 已取得严格 `375×812` 首屏和底部视口截图。
- 修复两个真实视觉/文案差异：移除误用的 `large-title`，恢复在线稿 18px 顶栏标题；下载并使用 Figma 的 `alert-triangle` SVG（外圆 48px、内图标 24px），并补齐“家长对出勤记录提出异议，请核实后重新提交”说明。
- 真实接口返回 8 名学员而在线示例为 2 条异常，保留真实数据，不伪造 Figma 示例；底部视口确认修改说明、重新提交按钮和教练 TabBar 无遮挡。
- C4.2 定向测试 8/8 通过，WXML/WXSS 编译成功，当前路由确认正确，模拟器错误过滤无命中。证据详见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/c4-2-repair-2026-08-29.md`。

## 2026-08-29 C5 课时确认页在线 Figma 修复复验

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:734`；在线截图为 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c5-online.png`，画板严格 `375×812`。
- 真实教练路由 `pages/coach/lesson/index?id=event-cq-talent-secure-test-1-trn-0818` 的首屏和底部视口均由 WeChatIDE MCP 取得严格 `375×812` 截图。真实活动标题、8 名学员和“待确认”状态继续来自 API；Figma 的 5 名示例学员与 `1.5课时` 未被复制。
- 修复两个实际差异：恢复在线稿“课时确认 / 活动标题 / 学员课时记录 / 共 N 名学员”的层级和文案，活动元信息按在线稿区分主次透明度；根容器增加 `140rpx` 固定教练 TabBar 安全区，解决长名单底部确认按钮被遮挡。
- C5 定向 Vitest `11/11`，WXML 编译成功，控制台错误过滤无命中；全仓门禁本轮输出为 domain `20/20`、小程序 `410/410`、API `115/115`。证据详见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c5-lesson-confirm-comparison.md`。

## 2026-08-29 C5.1 课时更正页在线 Figma 修复复验

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:765`；在线截图保存为 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c5-1-online.png`，画板严格 `375×812`。
- 真实教练路由 `pages/coach/lesson-correction/index?id=event-cq-talent-secure-test-1-trn-0818` 首屏和底部视口均由 WeChatIDE MCP 重新取得严格 `375×812` 修复后截图；8 名学员的姓名、余额和 `±0` 调整状态继续来自真实 API，未复制 Figma 示例姓名或 `1.5课时`。
- 修复两个实际视觉差异：更正列表标签从“课时调整”改为在线稿“系统差异”，原值余额增加删除线；底部视口确认保存按钮没有被固定教练 TabBar 遮挡。
- C5.1 定向 Vitest `8/8`；WXML 编译成功；控制台过滤 `error|exception|fail|undefined|route is not defined|wx:else|appid missing` 无命中。证据详见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c5-1-lesson-correction-comparison.md`。

## 2026-08-29 C6 比赛记录页在线 Figma 修复复验

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:796`；在线截图保存为 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c6-online.png`，画板严格 `375×812`。
- 真实教练路由 `pages/coach/match/index?id=event-cq-talent-secure-test-1-completed-match` 首屏和底部视口均由 WeChatIDE MCP 重新取得严格 `375×812` 修复后截图；比赛标题、球队、最终比分、事件列表和球员姓名继续来自真实 API，未复制 Figma 示例数据。
- 修复两个实际视觉差异：Hero 胶囊从“比赛总览 / 事件记录”改为在线稿的“上半场 / 下半场”，因后端没有半场比分字段而显示“比分待同步”；事件卡移除在线稿不存在的“编辑比赛”额外按钮，编辑入口仍保留在活动工作台。
- C6 定向 Vitest `10/10`；WXML 编译成功；控制台过滤 `error|exception|fail|undefined|route is not defined|wx:else|appid missing` 无命中。证据详见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c6-match-comparison.md`。

## 2026-08-29 C7 战术板在线稿复核与安全区布局修复

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 233:2 / C7 Tactical Board MVP`；在线截图与真实运行截图均严格 `375×812`，证据详见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c7-tactical-board-comparison.md`。
- 修复 C7 顶栏 `box-sizing` 导致的安全区额外撑高、标题文案与页面配置不一致、旧球场圆形装饰、球员字号，以及阵型/替补区间距差异。当前保留在线稿要求的边界线与中线，未新增 Figma 示例球员。
- 真实教练路由读取 `event-cq-talent-secure-test-1-scheduled-match` 的真实比赛和 8 名真实球员；当前生产/测试数据未返回 11 名首发与 5 名替补，因此不伪造数据，数量差异按数据契约豁免。
- 验证：C7 定向 Vitest `6/6`；WXML/WXSS 编译成功；WeChatIDE MCP 模拟器截图 `c7-runtime-final.png` 严格 `375×812`；错误过滤无命中。下一步为路径限定提交本批 C7 页面、测试和验收文档。

## 2026-08-29 C6.1 添加比赛事件在线 Figma 复核

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:827`；在线截图保存为 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c6-1-online.png`，画板严格 `375×812`。
- 真实教练路由 `pages/coach/match-event-add/index?eventId=event-cq-talent-secure-test-1-completed-match` 由 WeChatIDE MCP 取得首屏和 `pageScrollTo` 后底部视口截图，均严格 `375×812`；共享顶栏、表单层级、红色提交按钮和教练 TabBar 几何一致。
- 运行时只显示真实客户端能力返回的 `进球 / 助攻 / 扑救 / 抢断`，未复制在线稿示例的 `黄牌 / 红牌 / 换人 / 其他`；真实球员、空表单和平台状态栏/胶囊同样属于数据或平台差异。单行事件标签导致表单整体上移，是预期差异，不是布局缺陷。
- 底部视口确认提交按钮未被固定 TabBar 遮挡；控制台错误过滤无命中。本页无业务代码修改、无回归测试新增，结论为 **通过（数据/平台差异豁免）**。证据详见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c6-1-match-event-add-comparison.md`。

## 2026-08-29 C6.2 保存态在线 Figma 修复复验

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 93:858`；在线截图保存为 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c6-2-online.png`，画板严格 `375×812`。
- 通过真实 C6.1 流程输入第 `54` 分钟并返回比赛页，复现兼容的本机草稿遮罩；没有注入页面 data、API 响应或 storage。修复前对照发现弹层宽度约 `327px`、成功圆容器 `52px`、手写 CSS 勾号和 `#d1fadf` 背景均与在线稿不一致。
- 最小修复：恢复 Figma `315×270px` 弹层的 border-box 几何和 `#ecfdf5` 成功容器，替换为 Figma 导出的 `c6-2-cloud-check.svg`，并保持本机草稿真实范围文案。修复后真实首屏与底部视口均严格 `375×812`，TabBar 未遮挡，控制台错误过滤无命中。
- C6 聚焦测试先红后绿 `10/10`；WXML/WXSS 编译成功。结论为 **修复后重新通过（真实数据/本机持久化范围差异豁免）**。证据详见 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/c6-2-match-save-state-comparison.md`。

## 2026-08-29 C16.3/C16.4 在线 Figma 复审收口

- C16.3 教练账号页在线节点 `93:1262` 已重新读取并取得在线 `375×812` 设计稿；真实路由 `/pages/coach/account/index` 由 WeChatIDE MCP 取得严格 `375×812` 运行截图并完成对照。顶栏、账号卡片、设置分组、教练 TabBar 一致；真实会话资料、未提供的账号字段和平台状态栏/胶囊按数据/平台差异豁免。定向测试 `5/5`、小程序 TypeScript 通过，证据见 `c163-coach-account-comparison.md`，提交 `9763a0d`。
- C16.4 教练帮助页在线节点 `93:1286` 已重新读取并取得在线设计稿；真实路由 `/pages/coach/help/index` 取得首屏及滚动底部严格 `375×812` 截图并完成对照。搜索、分类网格、FAQ、支持卡和教练 TabBar 结构一致；真实 FAQ/分类内容、支持方式待配置和平台状态栏/胶囊按数据/契约/平台差异豁免。定向测试 `4/4`、小程序 TypeScript 通过，证据见 `c164-coach-help-comparison.md`，提交 `eb593d3`。
- C16.3/C16.4 均未发现需要修改业务代码或回写 Figma 的新缺陷；当前线上 Figma 读稿与真实运行态证据已补齐。

## 2026-08-29 剩余 TabBar 消费者复审收口

- 本轮补齐四个此前遗漏的真实运行态消费者：`/pages/coach/lesson-history/index`、`/pages/coach/lesson-detail/index`、`/pages/coach/match-edit/index` 和 `/pages/parent/semester-report/index`。每个页面均取得 WeChatIDE MCP 路由核验后的 `375×812` PNG 与 sidecar；长页面另取底部视口，证据集中在 `.trellis/tasks/08-19-online-figma-tabbar-reaudit/research/live-2026-08-29/`。
- 三个教练页面没有独立在线画板，本轮按在线教练根节点 `4:7` 与共享 TabBar overlay `529:124` 复核。共享顶栏、返回控制、TabBar 顺序/激活态、固定底部安全区和底部内容不遮挡均通过；真实活动、球队、学员、比分和 FAQ 数据与设计示例不同，按真实 API/配置差异记录，不复制 Figma 示例数据。
- 家长学期报告在线节点为 `701:177`。成长 TabBar、顶栏和运行路由通过；但在线稿主体是阶段卡、深色学员卡、紧凑能力卡、三列汇总卡和教练评语卡，当前页面主体仍是另一套卡片结构。这是独立的 P4.3 页面主体复原缺口，不属于本轮 TabBar/top-navigation 范围，未修改业务代码。
- 本轮控制台错误过滤 `error|exception|fail|undefined|route is not defined|wx:else|appid missing` 无命中。新增长期规则：没有独立 Figma 画板时，只能对共享壳和固定行为作明确结论，不能把共享壳通过写成整页视觉通过；该规则已同步到 `.trellis/spec/guides/cross-layer-thinking-guide.md` 的 8.3。

## 2026-08-29 P4.3 学期报告主体复原

- 在线唯一 Figma 基准为 `zZ6wKyOHKcO4UYXDd9jGwv / 701:177`，最新在线截图与结构已保存到 `.trellis/tasks/08-29-parent-semester-report-body/research/live-2026-08-29/`。
- 将家长学期报告主体恢复为在线稿顺序：最近阶段卡、当前学员卡、能力表现标题与综合能力卡、三列训练/比赛/出勤汇总卡、教练评语卡；学员切换保留在当前学员卡点击后的原生选择菜单中。
- 发现并修复该页面缺少 `navigationStyle: custom` 导致原生导航栏额外占位、页面整体下移的问题；能力名称增加单行省略，能力卡按在线稿测量间距上移。
- 运行时使用真实家长会话和真实成长/日程数据，Figma 示例姓名、分数、次数和阶段名称均未写入；无阶段名时诚实显示“最近阶段”，无评语时显示“暂无教练评语”。
- P4.3 定向测试 `7/7`；小程序 TypeScript、WXML/WXSS 编译通过；全仓门禁通过：domain `20/20`、小程序 `415/415`、API `115/115`；真实截图严格 `375×812`，对照记录见 `p43-comparison.md`。

## 2026-08-29 C1 教练首页 Team Selector V2 复原

- 在线唯一 Figma 基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 529:7`（`C1 Coach Home — Team Selector V2`），并保存原尺寸 `375×812` 设计截图：`tmp/c1-coach-home-team-selector-v2-figma.png`。
- 根据新版画板调整 C1 页面层级：日期条后新增全宽“我的球队”选择模块，使用真实 `coach/home` 返回的球队名称和派生元信息；移除新版画板中已不存在的日期条下方独立统计胶囊，统计继续保留在 Hero 内。球队箭头进入现有教练队伍详情页，不提供前台新建球队入口。
- 修复选择器与 Hero 之间多出的约 12px 顶部空隙，保持 Figma 的日期条 → 球队选择器 → Hero → 活动卡 → 教练 TabBar 垂直关系；未修改 API、角色/session、生产数据或其他页面。
- WeChatIDE MCP 真实教练会话在 `/pages/coach/schedule/index` 取得严格 `375×812` 截图：有数据态为 `tmp/c1-coach-home-team-selector-v2-runtime-final-filled.png`（2026-08-15），当前日期无数据态为 `tmp/c1-coach-home-team-selector-v2-runtime-final.png`（2026-08-29）。真实活动标题较长导致活动卡标题省略，按 API 数据差异记录，未复制 Figma 示例。
- 验证：C1 定向 Vitest `16/16`；小程序 TypeScript `exit=0`；WXML/WXSS MCP 编译通过；模拟器错误过滤 `error|exception|fail|wx:else|undefined|route is not defined|appid missing` 无命中。

## 2026-08-29 七个双角色测试账号生产滚动数据刷新与复核

- 发现既有演示数据的最新活动仅到 `2026-08-27`，在 `2026-08-29` 已没有未来活动，无法稳定用于真机演示。本轮仅部署包含滚动中文演示数据刷新的最小 API 提交 `f34d6b8`，未连带部署当前工作区其他 API 改动。
- 生产执行前完成受限 SQLite 备份（含 WAL/SHM 处理）；安全导入先以脱敏 dry-run 校验 `7` 个账号槽位，再经确认导入返回 `refreshed`。仅重启 API 容器，随后外网 `https://cqtc.pomi.tech/health` 返回 `200`。
- 刷新后的只读结构审计：每个槽位均有 `8` 人教练名单、`2` 名家长绑定学员、`5` 个活动、`40` 条活动参与记录、`8` 份评估、`64` 条雷达记录、`2` 场比赛、`8` 条比赛事件及已保存的 `8` 人战术板。
- 刷新后的受控 BFF 回读：`7` 个家长会话合计只可见 `14` 名绑定学员；`7` 个教练会话合计读取 `56` 名队员；家长指标、教练雷达和已保存战术板均为 `7/7`。临时验证 session 在脚本结束时已删除。
- 日期覆盖按正确口径复核：七个槽位在当前周及前两周均有活动，且每个槽位均保留 `3` 个未来活动，最晚开始日期为 `2026-09-06`。本轮未把 BFF/数据库回读误写为真机微信授权、双角色切换或视觉验收；这些仍需持有对应手机号的操作者在真实设备完成。

## 2026-08-29 C5 销课处理当前在线稿收口

- 当前在线 Figma 唯一基准重新读取：`zZ6wKyOHKcO4UYXDd9jGwv / 537:2`（`C5 Session Settlement — Pending`）。该稿将待处理页命名为“销课处理”，并要求“待处理销课”摘要、“待确认学员”名单和 `N 人待处理` 状态。
- 最小修改仅限 `pages/coach/lesson/index.wxml`：同步顶栏和状态页标题，替换摘要与名单层级文案；保留真实活动时间/场地、真实学员列表、确认写入、历史回溯入口和课时更正链路，未引入 Figma 样例姓名、队伍、场地或课时值。
- WeChatIDE MCP 真实教练会话在 `/pages/coach/lesson/index?id=event-cq-talent-secure-test-1-trn-0818` 重编译后取得严格 `375×812` 截图 `C:\Users\ASUS\AppData\Local\Temp\wechatide-simulator-screenshot-1787984889950-kwee29.png`；路由正确，控制台错误过滤无命中。定向 Vitest `11/11`、小程序 TypeScript 与 WXML 编译均通过。

## 2026-08-29 C5 销课历史与详情在线稿复核、真实流水可见性修复

- 在线唯一 Figma 基准重新读取：销课历史 `zZ6wKyOHKcO4UYXDd9jGwv / 537:79`、销课详情 `zZ6wKyOHKcO4UYXDd9jGwv / 537:156`，两张在线稿均为 `375×812`。历史页恢复深色历史摘要、紧凑白色记录卡和“查看全部记录 / 按日期筛选”底部层级；详情页恢复深色活动摘要、绿色确认课时标签与“查看训练内容 / 更正本次销课”动作层级。
- 历史页原先只接受 `app-client-lesson-*` 形式的手工确认流水，错误隐藏了受控导入写入、但同样归属活动的真实扣课流水。现改为按活动 ID 识别两类受控 source ID；默认只展示同一真实 30 天窗口的前 5 条，"查看全部记录" 在该窗口内展开全部数据，不再发送 API 明确拒绝的一年范围请求。
- WeChatIDE MCP 实测连接 `https://cqtc.pomi.tech`，默认历史页从真实接口读到 2 条已完成销课记录；详情页读到 8 名真实队员及其账本状态。历史默认图与展开图均严格 `375×812`，控制台错误过滤无命中。定向 Vitest `9/9`、小程序 TypeScript、对应 WXML/WXSS 编译均通过。
- 当前生产数据的 30 天窗口内仅有 2 条符合“训练 + 已完成 + 已销课”条件的记录，低于在线稿示例的 5 条；这是生产演示数据密度缺口，未在客户端伪造记录。下一批应扩充受控导入器的近三周已完成训练/销课数据，完成受限 SQLite 备份、dry-run、confirmed import、API 重启与角色受限回读后再更新本条记录。

## 2026-08-29 七账号近三周销课数据本地扩充

- 受控导入器从每槽位 `1` 堂已完成训练、每名队员 `1` 条销课流水，扩充为最近三个自然周内 `5` 堂已完成训练；每堂均有 `8` 名参与者和每人一条真实 `lesson_credit_ledger` 扣课流水。账户仍为七个固定双角色槽位，所有日期由导入时 `now` 推导，所有展示文案保持中文。
- 新增 TDD 回归：以 `2026-08-29` 为锚点，断言五堂完成训练覆盖 `2026-08-10`、`2026-08-17`、`2026-08-24` 三周，并拥有 `40` 条关联参与记录和 `40` 条关联扣课流水；初始实现如预期仅有 `1` 堂完成训练而失败，扩充后定向测试 `17/17` 和 API TypeScript 均通过。
- 该记录仅说明本地实现与验证；生产库尚未写入本次新增历史记录。生产执行仍需受限 SQLite 备份、脱敏 dry-run、确认导入、仅 API 重启、health 与双角色受限 BFF 回读，且不得在客户端伪造 C5 历史。

## 2026-08-29 七账号近三周销课生产导入（进行中）

- 已将 C5 页面修复 `02c473a` 和滚动数据扩充 `ca7c8f0` 分别提交并推送至 `origin/dev`；发布使用精确 Git archive，不上传当前工作区其他在途文件。
- 生产预检、受限 SQLite 快照（含 WAL/SHM 状态）、脱敏 dry-run 与确认导入均已完成。确认导入仅回报 `accountCount: 7`，未输出手机号；仅 API 容器重启后内网和 HTTPS health 均恢复 `200`。
- 回读发现旧版受控导入留下的八条固定 `…-debit` 销课流水与新五堂训练流水重叠，造成最早训练的重复扣课；此时停止将该批称为验收通过。已新增回归并实现精确旧 ID 清理，待新补丁发布、再次受限备份/导入与 BFF 回读后再完成本条。

## 2026-08-29 七账号生产数据最终审计与验收工具修正

- 生产只读结构审计现按当前滚动契约通过 `7/7`：每槽 8 人教练名单、2 名家长绑定学员、5 个活动、40 条活动参与记录、8 份评估、64 条雷达记录、2 场比赛、8 条比赛事件和 8 人战术板；销课账本为每名学生 1 条开通课时加 5 条完成训练扣课，即每槽 48 条，其中 40 条为训练销课流水。
- 生产受控 BFF 回读通过 `7/7`：家长合计只见 14 名绑定学员，教练合计只见 56 名本队队员；家长指标、教练雷达和保存的战术板均逐槽存在。临时验证会话已精确删除，未写入手机号、token 或凭据。
- 修正 `tmp/prod-verify/audit-secure-seven-slots.py` 的旧账本断言：改为检查 `-debit-1..5` 五条滚动扣课流水，并让远端 Node 审计失败时向 Python 调用方返回非零退出码。修正后结构审计与 BFF 回读均为 `EXIT=0`。
- 本条证明的是生产数据库和 BFF 数据闭环，不替代真实微信手机号授权、首次角色选择、双角色切换或视觉验收。

## 2026-08-29 P1 周日历主视图／展开月历选择器改版

- 甲方澄清并确认：家长日程不是固定整页月历。默认保留原有周日历和上/下周箭头，用户点击日期区的展开提示后才以内嵌形式显示月历；选日后更新日程并收起回周日历。该流程先完成在线 Figma 再改小程序。
- 在线 Figma 在不修改历史 `269:250`、`269:479`、`521:339` 的前提下新增改版区块 `1008:185`，三态节点为折叠周条 `1008:186`、展开月历 `1008:436`、空态 `1008:348`；三张在线图均按 `375×812` 复核。
- 小程序 P1 已从固定月历改为条件式周条/月历，日期周数据预计算选中态；周切换、双向月切换、展开/收起与选日后收起均使用真实已有日程数据，没有改 API、账号、会话或数据库。
- 验证：先红后绿的 P1 定向 Vitest `18/18`、小程序 TypeScript、WeChatIDE MCP WXML/WXSS 编译均通过，`git diff --check` 通过。WeChatIDE MCP 截图通道本身返回严格 `375×812`，但当前真实会话是教练角色，访问家长 P1 被角色守卫留在教练日程；因此家长 P1 运行态视觉结论仍为“待真实家长会话补验”，不得写成已通过。

## 2026-08-29 C1 我的球队与 C1.1 全屏选队

- 先更新在线 Figma：保留历史 C1，新增 `1026:9` 首页选择器和 `1026:150` 全屏 C1.1 选择页；设计只表达后台同步的已分配队伍，没有前台队伍管理操作。
- 小程序 C1 读取真实 `coach/home` 的 `teams`，只在该真实列表中恢复本地选择；日程、Hero 随选择的真实队伍筛选。C1.1 仍用同一只读 API 读取队伍，选择后仅保存本地展示上下文并返回首页，不新增 API、数据库、伪造队伍或角色数据。
- 全屏页使用返回键、已有 SVG 勾选图标和右箭头图标，避免字体图标在不同设备发生偏移。测试覆盖无效历史选择回退、选择后返回、全屏无新建/编辑/删除和 WXML 预计算约束。
- 证据：定向 Vitest `21/21`、小程序 TypeScript、WeChatIDE MCP WXML/WXSS 编译通过；真实教练会话运行截图 `tmp/c1-team-selector-20260829-final-runtime.png` 为严格 `375×812`，控制台错误过滤无命中。该截图只证明真实教练会话和 C1.1 视觉/运行状态，不替代其他角色或页面验收。

## 2026-08-29 C7 全屏战术板第一批收口

- 先更新在线 Figma：新增 `1040:9` 客户改版画板，保留旧 `233:2`；新稿规定上球场、下圆形球员名单、全屏返回和无 TabBar。
- 小程序将旧高球场/替补席调整为首屏上半球场与下方“全部球员”网格；关键修复为无论球员是否已在场，真实 API roster 均保留在下方视图，不再被战术板已有位置过滤掉。
- 真实教练运行截图 `tmp/c7-fullscreen-runtime-rosterfix-20260829.png` 严格 `375×812`，已复核标题安全区、球场、完整圆形名单和底部操作区；定向 Vitest `6/6`、小程序 TypeScript、WXML/WXSS 编译通过。跨区拖拽上下场和“保存→重启 API→读取”仍未完成，继续留在同一 C7 任务。
## 2026-08-29 C7 全屏战术板双向拖拽收口

- 在线唯一 Figma 基准仍为 `zZ6wKyOHKcO4UYXDd9jGwv / 1040:9`；本批没有修改设计稿，按已确认的“上球场、下全部球员、拖拽上下场”实现。
- `pages/coach/tactical-board/` 现在用同一 `movable-area` 承载球场与名单：全部 roster 始终展示；首发拖到球场下方会转为替补，替补拖回球场会转为首发并保存归一化坐标；点选换位作为拖拽失败时的辅助操作仍保留。WXML 未新增 JS 方法调用。
- 验证：定向 Vitest `8/8`、小程序 `tsc --noEmit`、WXML/WXSS 编译和限定路径 `git diff --check` 通过；真实教练运行态保存后重新加载同一比赛，`dirty=false` 且 8 名球员状态读回；控制台错误过滤无命中。严格 `375×812` 截图：`tmp/c7-final-runtime-20260829.png`。截图证明页面几何与真实数据展示，不把自动化调用页面方法等同于人工触摸手势验收。

## 2026-08-29 C13/C14 微信开发者工具白屏恢复复验

- 复现过的错误为共享组件 `components/radar-canvas/index` 被运行时解析为 `wx://not-found`，导致 C13/C14 白屏；源码组件只有 TypeScript 是项目既定形态，不能手工补写或提交伪造的 `index.js`。通过 WeChatIDE MCP 重新执行“打开项目→打开精确路由→等待 `view` 挂载→原始 PNG 截图”后，C13 与 C14 均恢复正常渲染。
- 在线稿重新读取：C13 `93:1080`（`375×908`）与 C14 `93:1106`（`375×1258`），未发现需要回写 Figma 的新变化。运行证据：`tmp/goal-c13-after-refresh-20260829.png`、`tmp/goal-c14-after-refresh-20260829.png` 及对应 sidecar，均严格 `375×812`。
- C13/C14 真实请求均返回 `200`；控制台过滤 `error|exception|fail|undefined|wx:else|route is not defined|appid missing|not-found` 无命中。当前结果证明 MCP 强制重新编译能够恢复旧惰性编译依赖状态；未修改业务代码、API、角色会话或数据。
- C7 的隔离 SQLite 持久化回归 `persists the acceptance dual-role demo through SQLite restart and supports targeted rollback` 单测通过（`1 passed / 54 skipped`），覆盖战术板保存、关闭并重新创建 API/持久化层后的阵型与球员坐标读回；本轮没有写入生产库。

## 2026-08-29 家长/教练日历与家长 TabBar 第一批收口

- 家长端继续保留默认周日历，展开与收起箭头统一使用 `/assets/icons/chevron-right.svg`，以旋转控制方向，避免不同设备上的文字 glyph 偏移；教练端 C1 增加同样的周历→月历展开、前后月份切换、选日后回到日视图能力。
- 家长 TabBar 顺序已按在线稿更新为“日程 / 成长 / 发现 / 我的孩子”；教练 TabBar 未改变。
- 在线 Figma 复核节点：家长月历展开 `1008:436`、折叠 `1008:186`、TabBar `358:815`、教练 C1 `93:578`。家长三态和 TabBar 与在线稿一致；教练在线 C1 当前仍是周历历史稿，本批新增的月历行为尚未在 Figma 建立独立展开画板，代码实现按家长在线月历结构复用并标记为待设计补图。
- 验证：定向 Vitest `30/30`；全仓 `npx --yes pnpm@10.33.0 run check` 使用任务专用 npm 缓存后通过（domain `20/20`、小程序 `429/429`、API `117/117`）；四个目标 WXML/WXSS 均通过 WeChatIDE MCP 编译；教练日历真实模拟器截图严格 `375×812`，月历展开可见，当前会话为真实教练数据空态，不将动态数据空态误报为设计失败。

## 2026-08-29 教练训练工作台简化出勤交互

- 按甲方要求移除工作台中的流程状态、销课和查看详情入口；出勤直接留在训练工作台，头像点击在“已到 / 未到”之间切换，绿色表示已到、灰色表示未到，姓名展示在头像下方。
- 状态变更继续调用既有 `saveCoachAttendance`，保存失败会恢复上一版名单状态并显示错误，不新增 API、伪造 session 或本地假数据。
- WeChatIDE MCP 使用当前教练真实可访问活动 `event-cq-talent-secure-test-1-trn-0818` 取得 `375×812` 截图 `tmp/coach-workbench-attendance-current.png`；页面真实返回 8 名学员、6 名已到、2 名未到，截图确认点击提示、绿/灰状态和头像下姓名区域均已渲染。
- 截图同时暴露生产演示数据姓名为“测试球员第1组-1”一类长占位名，在四列布局中会被截断。该问题归因于受控测试数据生成器的 `playerNames`，下一批单独改为真实中文四字内姓名并执行受限生产导入与回读；不在前端硬截或替换姓名。
- 验证：小程序定向工作台测试随包测试 `431/431`、小程序 TypeScript `exit=0`、目标文件 `git diff --check` 通过；目标工作台 WXML/WXSS 需在本批提交前再次由 WeChatIDE MCP 编译确认。

## 2026-08-29 七账号演示学员姓名可读性修复（代码已完成，生产待导入）

- 受控导入器 `apps/api/src/ops/secure-cq-talent-test-accounts.ts` 不再生成“测试球员第1组-1”一类长占位姓名，改为 8 个唯一的中文 2–4 字姓名；studentId、家长绑定、教练名单、评估、雷达、比赛和战术板关联均保持不变。
- 在隔离 SQLite 中验证导入后的 8 个学员姓名全部为唯一中文 2–4 字，适配教练工作台四列头像布局；本次验证先红后绿完成，未修改交接约束中的既有 API 测试文件。
- 本批尚未写生产库。待本地全仓门禁通过后，按既有安全流程做受限 SQLite 备份、脱敏 dry-run、确认导入、仅重启 API，再用教练工作台和家长孩子列表回读确认姓名。
## 2026-08-29 双端月历下拉箭头几何修复

- 在线 Figma 复核：家长端月历折叠/展开节点 `zZ6wKyOHKcO4UYXDd9jGwv / 1008:186`、`1008:436`；教练端当前权威 C1 日程节点为 `93:578`。在线稿明确下拉控件应位于日期条内部并保持垂直居中。
- 根因是家长端和教练端折叠入口使用 `bottom: -14rpx`，控件落在日期条下方；家长端旧组合选择器还给图标叠加了边框/旋转规则。现改为显式 `top: 50%`、`bottom: auto`、`transform: translateY(-50%)`，并为教练入口补齐独立 `c1-dates__expand-icon` 尺寸规则；内层点击使用 `catchtap` 避免与日期容器重复冒泡。
- 家长端原有“周日历→展开月历→前后月份→选日收起”和教练端同等流程均保留；没有改 API、角色会话或测试数据，家长 TabBar 顺序仍为“日程 / 成长 / 发现 / 我的孩子”。
- 先红后绿：家长月历与教练日程定向 Vitest `22/22`；目标 WXML/WXSS 均通过 WeChatIDE MCP 编译，`git diff --check` 通过。
- 真实教练运行态截图：`tmp/goal-c1-calendar-arrow-fixed.png`（折叠态）与 `tmp/goal-c1-calendar-arrow-fixed-expanded.png`（展开态），WeChatIDE MCP 返回严格 `375×812`。本批未新增教练端在线月历画板；代码复用家长在线月历结构，后续若要把教练月历单独纳入 Figma，需新增 C1 月历变体后再做像素复验。
## 2026-08-29 教练比赛事件能力策略补齐（C6/C6.1）

- C6/C6.1 已支持“犯规”事件，domain、API schema、路由校验、小程序类型/标签/草稿和家长端比赛事件展示已同步；旧数据中的 `interception` 读取时兼容归一为“抢断”。
- 线上只读能力仍返回旧四项（进球、助攻、扑救、抢断），根因是生产 `match_event_types` 策略没有开放新增类型，不是页面入口缺失。新增受控运行时变量 `CQ_TALENT_MATCH_EVENT_TYPES`，用于在不改测试 seed 契约的前提下追加已支持事件；变量值只放服务器私有环境，不入库。
- 本地验证：API typecheck 通过；API 全量 `117/117` 通过；开启受控事件变量后能力读回包含犯规、黄牌、红牌、乌龙；`git diff --check` 通过。WeChatIDE MCP 已取得 C6 与 C6.1 严格 `375×812` 运行截图 `tmp/goal-c6-after-foul-code.png`、`tmp/goal-c6-1-after-foul-code.png`。
- 仍待生产闭环：备份后部署代码、私有配置并重启 API；用真实教练会话确认 C6.1 显示“犯规”，再保存一条犯规并经 C6/API 重启回读。C7 战术板和双端日历/出勤等改版不与本批混提。

## 2026-08-29 双端月历箭头、家长 TabBar 与教练工作台出勤收口

- 家长端与教练端周日历的展开/收起控件统一使用独立品牌红下箭头资源，控件垂直居中在日期条内部；展开后仍支持月份切换和选日回到周视图。
- 家长 TabBar 顺序统一为“日程 / 成长 / 我的孩子 / 发现”；教练端 TabBar 不变。
- 教练活动工作台出勤简化为头像点击切换：绿色圆形勾选表示已到，灰色圆形首字母表示未到，姓名固定展示在头像下方；写入仍走真实 attendance API，失败会回滚视图状态。
- 验证：双端相关 Vitest `44/44`、小程序 TypeScript `exit=0`、WeChatIDE MCP 真实教练截图 `tmp/goal-c1-calendar-arrow-current.png` 与 `tmp/goal-c2-attendance-current-3.png` 均为严格 `375×812`；截图显示当前生产演示库仍含长占位姓名，待受控测试数据批次导入后复验。

## 2026-08-29 双端月历下拉控件与家长 TabBar 顺序第二次复核

- 针对最新在线 Figma `269:250`、`93:578` 重新读取并对照实际模拟器；家长和教练周条的下拉控件均固定在日期条内部，预留独立尾部槽位，不再覆盖周日或选中日期。教练端周条改为“左右箭头 + 圆角日期容器”，展开后使用与家长端一致的圆角月历卡片。
- 家长 TabBar 按用户最新要求调整为“日程 / 成长 / 发现 / 我的孩子”，仅交换展示顺序，路径和 active key 不变；教练 TabBar 不变。
- 真实 WeChatIDE MCP 复核截图：`tmp/coach-calendar-fixed-2.png`（折叠态）和 `tmp/coach-month-fixed-2.png`（展开态），均由当前模拟器返回严格 `375×812`；当前为真实教练会话的空态/测试数据态，不把数据缺失误报为业务视觉通过。
- 验证：家长日历、教练日历、TabBar 定向 Vitest `45/45`，小程序 `tsc --noEmit` 退出 0，两个目标 WXML 编译成功，`git diff --check` 通过。首次测试启动遇到 npm cache `EEXIST`，改用仓库已安装的 pnpm 10.33.0 后完成验证，未清理缓存。

## 2026-08-30 双端月历控件几何与家长 TabBar 顺序复验

- 在线稿复核节点：家长月历折叠 `1008:186`、展开 `1008:436`；教练月历折叠 `1293:8`、展开 `1293:34`。家长折叠月历入口调整为约 `30×16px` 并右侧预留空间；教练折叠箭头调整为 `16×16px`，展开月历卡按约 `343×420px`、日期圆形约 `40×40px` 对齐。
- 家长 TabBar 顺序已固定为“日程 / 成长 / 发现 / 我的孩子”；路径和 active key 不变。教练端保留“日程 / 训练管理 / 我的”。
- 目标源码为 `components/role-tabbar/index.ts`、家长/教练 `schedule/index.wxss`；同步更新定向断言，未改 API、会话、数据库或其他业务路径。
- 验证：定向 Vitest `31/31`；家长/教练目标 WXML 与 WXSS 均经 WeChatIDE MCP 编译成功；教练折叠与展开截图 `tmp/goal-coach-calendar-collapsed-after.png`、`tmp/goal-coach-calendar-expanded-after.png` 均严格 `375×812`。当前真实会话为教练身份，访问家长路由返回 `403 Session active role is not permitted for this operation`，因此家长运行态视觉仍待真实家长会话补验。

## 2026-08-30 当前在线稿 TabBar 顺序纠偏

- 重新读取在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 358:815` 后确认家长 TabBar 的权威顺序是“日程 / 成长 / 我的孩子 / 发现”；此前历史记录中的“发现 / 我的孩子”描述已过时。
- 已将 `components/role-tabbar/index.ts` 的家长项目顺序改为 `schedule → growth → child → discover`，路径和 active key 不变；定向断言同步改为验证 `child` 位于 `discover` 之前。教练 TabBar 未改动。
- 验证：`components/role-tabbar/index.test.mjs` 为 `8/8`；当前会话仍是教练角色，家长运行态截图暂待真实家长会话补验。

## 2026-08-30 C6/C6.1 比赛事件真实闭环复验

- 使用真实教练会话读取生产比赛 `event-cq-talent-secure-test-1-completed-match`，向真实 API 写入 1 条 `foul` 事件；同一幂等键重复提交返回同一事件 ID，保存前后及 API 重启后均通过 GET 读回，临时会话已清理。
- 生产能力策略当前返回进球、助攻、扑救、抢断、犯规、黄牌、红牌、乌龙球；C6 时间线已显示中文事件标签，C6.1 全屏页面已显示可选事件类型和真实名单。
- WeChatIDE MCP 真实模拟器截图：`tmp/goal-c6-match-live-20260830.png`、`tmp/goal-c6-1-event-add-live-20260830.png`，均严格 `375×812`；网络读写返回 `200`，控制台错误过滤无命中。
- 首次闭环误报 `401` 的根因是验证脚本读取了过期 `.coach-session.env`，不是业务 API；刷新临时会话后闭环通过。后续运行验证前必须先生成并写入当前临时会话。

## 2026-08-30 Goal：教练月历稿复核与家长 TabBar 顺序

- 重新读取当前在线 Figma：教练折叠日程 `1293:8`、展开月历 `1293:34`，确认折叠态是左箭头、周一至周六和日期条内下拉胶囊；周日列只出现在展开月历，不能按旧测试臆测为折叠态七天或补右侧周箭头。
- 教练端已有的周历展开月历、月份前后切换、选日后回到日视图逻辑保持不变；同步把相关回归断言改回当前在线稿的六日折叠结构，避免后续误改布局。
- 按用户最新要求，家长 TabBar 顺序固定为“日程 / 成长 / 我的孩子 / 发现”，只调整 `components/role-tabbar/index.ts` 的展示数组顺序，路径、active key 和图标资源不变。
- 验证：教练日程与角色 TabBar 定向 Vitest `28/28`；小程序 TypeScript `exit=0`；WeChatIDE MCP 的目标 WXML/WXSS 编译均成功；本批不改 API、会话、数据库或生产数据。
- 当前在线 Figma TabBar 画板截图仍是旧顺序“发现 / 我的孩子”，本批不直接覆盖在线稿；如要让设计文件也反映最新产品要求，应由用户先在 Figma 调整后，再以新节点截图作为下一轮唯一视觉基准。

## 2026-08-30 Goal：教练训练工作台简化出勤

- 按最新产品要求，训练工作台只保留头像点击切换出勤：绿色圆形勾表示已到，灰色圆形首字表示未到，姓名固定展示在头像下方；保存仍调用真实 `saveCoachAttendance`，失败会回滚。
- 移除工作台顶部“结束训练”入口、倒计时状态和 `finishCoachEvent` 调用，避免把工作台继续当成销课流程；独立的出勤历史/纠正页面未删除，历史能力仍可从专门页面进入。
- 工作台训练内容进度和比赛/评测/战术板入口保持真实 API 数据驱动，没有添加伪造状态或前端替换姓名。
- 验证：`pages/coach/event/index.test.mjs` `14/14`；小程序 TypeScript `exit=0`；目标 WXML/WXSS 经 WeChatIDE MCP 编译成功；真实模拟器路由调用返回成功，但当前本地会话未保持教练角色，截图落在登录/空白状态，因此本批不把该截图当作视觉通过证据，需重新建立临时教练会话后复验。

## 2026-08-30 Goal：双端月历下拉控件复核与教练折叠条修复

- 在线 Figma 重新读取：家长折叠/展开 `1008:186`、`1008:436`，教练折叠/展开 `1293:8`、`1293:34`。家长折叠稿是七日周条；教练折叠稿只显示周一至周六，右侧月历下拉胶囊独立占位，周日仅在月历网格中显示。
- 根因：教练端仍用七日 `dayStrip` 渲染，周日被右侧下拉胶囊覆盖，日期落在周日时会直接压住选中圆形。现在在 TypeScript 预计算 `collapsedDayStrip`，WXML 只消费六日视图；完整七日数据仍保留给周范围、翻周和展开月历，模板未调用数组方法。
- 家长端不误改成六日：保留七日周条，将下拉胶囊右侧留白收敛进唯一的 `84rpx` 基础规则，删除容易被忽略的后置覆盖，防止未来样式修改又令周日与胶囊相撞。
- 验证：家长日程 Vitest `15/15`、教练日程 Vitest `20/20`、小程序 TypeScript `exit=0`、教练 WXML 与家长 WXSS 均经 WeChatIDE MCP 编译成功、限定路径 `git diff --check` 通过。真实教练严格 `375×812` 截图 `.tmp-c1-coach-six-day-final.png` 已确认下拉胶囊不再覆盖日期；家长运行态仍需在真实家长会话下复验。

## 2026-08-30 Goal：C7 战术板在线稿同步与首屏收口

- 用户明确授权覆盖在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 233:2`；该节点当前采用“上半球场、下半全部球员”的客户版结构，包含圆角标题卡、比赛名/保存状态、整行阵型选择、8 人头像名单和无弹窗的重置/保存动作。
- 小程序 C7 改用真实 `eventTitle` 与真实保存状态，场上和名单均为圆形头像；所有 roster 成员固定显示在下方 4×2 网格，拖入/拖回仍使用既有真实战术板 API。没有写入 Figma 示例姓名、伪会话或伪 API。
- 通过压缩工作面垂直几何，让 375×812 首屏同时露出球场、完整名单和完整底部按钮。WXML/WXSS 编译成功，定向 Vitest `9/9`、小程序 TypeScript `exit=0`、`git diff --check` 通过。
- 真实教练会话严格 375×812 复验截图：`.tmp-c7-runtime-fit-final.png`。开发者工具的“刷新当前页”会回到日程，因此后续 C7 截图固定使用“精确路由 → 等待资源 → 立即截图”，不能以刷新后错误路由的截图判定页面回归。

## 2026-08-30 Goal：C2 训练工作台出勤点按版

- 先写入在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:606`：画板现名为 `C2 训练工作台 · 出勤点按版`。根因修复记录：原画板带垂直自动布局；直接向其中插入绝对坐标图层会在插入时重排位置。处理方式是在清空并重建图层前把画板设为 `layoutMode = NONE`，回读截图确认没有重叠或错位。
- 小程序 `pages/coach/event` 删除按时钟推导的训练内容进度及“进行中”状态胶囊；保留真实课程/出勤数据与可编辑训练内容摘要。训练卡排在快捷入口前，匹配新版 Figma 层级。
- 出勤继续通过真实 `saveCoachAttendance` 保存，绿勾/灰首字头像可直接点按；页面展示字段 `displayName` 在 TypeScript 中预计算并限制四字，WXML 不调用数组或字符串方法。
- 验证：定向 Vitest `14/14`、小程序 TypeScript `exit=0`、限定文件 `git diff --check` 通过；WeChatIDE MCP 精确打开 `pages/coach/event?id=event-cq-talent-secure-test-1-trn-0818` 并取得严格 `375×812` 截图 `C:\Users\ASUS\AppData\Local\Temp\cqtc-c2-runtime-final-20260830.png`。离线参考图 `docs/design/reference/figma/c2-activity-workbench.png` 已按新版在线稿覆盖。

## 2026-08-30 Goal：比赛录入与事件链路复核

- 在线 Figma C6.1 `93:827` 中的“换人”示例改为“乌龙球”，与当前真实 API 支持的 `own_goal` 对齐；离线参考图 `docs/design/reference/figma/c6-1-add-match-event.png` 已重新导出。
- 真实教练会话复核了三条全屏路由：C6 比赛记录 `pages/coach/match?id=event-cq-talent-secure-test-1-completed-match`、C6.1 事件录入 `pages/coach/match-event-add?eventId=…`、编辑比赛 `pages/coach/match-edit?eventId=…`。C6 显示中文比赛时间线；C6.1 显示进球、助攻、扑救、抢断、犯规、黄牌、红牌、乌龙球和真实名单选择；编辑页显示对手、类型、状态和双方比分。
- 本批把本机草稿提醒从遮罩弹窗收口为 C6 页内提示卡，符合“所有子页面全屏、不要弹窗”的产品要求；草稿仍只保留在当前设备，提示文案未把它误报为服务器保存。
- 验证：C6/C6.1 定向 Vitest `18/18`、小程序 TypeScript `exit=0`、限定 `git diff --check` 通过；C6/C6.1/编辑比赛真实截图均严格 `375×812`，控制台错误筛选无命中。

## 2026-08-30 Goal：教练日程训练/比赛视觉区分补强

- 按当前在线 C1 赛事卡设计，教练日程为 `match` 事件预计算独立 `cardTone`，比赛卡不再复用训练白卡加蓝色标签的弱区分方式；比赛卡采用深海军蓝底、浅蓝时间、白标题、深蓝教练标签及浅蓝比赛类型标签。训练卡和其他卡保持原有样式。
- 视图字段均在 TypeScript 内预计算，WXML 仅绑定 `cardTone`，未使用 `.map()`、`.filter()`、`.slice()` 或 `.indexOf()` 等模板方法。
- 同步修正一条落后于当前布局的家长月历测试：断言改为检查日期周条为下拉控件预留右侧空间的布局契约，而非误要求一个已不存在的单属性写法。
- 验证：教练日程与家长月历定向 Vitest `23/23`、小程序 TypeScript `tsc --noEmit` 退出 0、限定路径 `git diff --check` 通过。当前生产演示日程尚未提供可截图的近期比赛活动，因此本批仅完成代码/编译与定向测试验证；待受控导入近三周比赛数据后，用真实教练会话补做 `375×812` 赛事卡视觉复验。

## 2026-08-30 Goal：七账号滚动演示数据生产审计

- 按受控测试账号流程，先对生产 SQLite 执行只读 dry-run，返回 `already_present`（7 个账号）；随后完成受限备份、确认导入与 API 重启。确认导入同样返回 `already_present`，因此没有重复写入或覆盖已有规范数据。
- 重启瞬间反向代理早于 API 容器恢复，首次健康检查短暂返回 `502`；等待容器启动后，Docker 状态为 `Up`，`https://cqtc.pomi.tech/health` 返回 `200`。该短暂状态已记录，不作为部署失败或数据导入失败。
- 生产只读审计逐槽位通过：7 个账号均为 active 的 parent+coach 双角色；每个账号包含 8 人教练名单、2 个家长可见孩子、5 个日程、40 条参训记录、8 份能力评估、64 条指标/雷达记录、2 场比赛、8 条比赛事件与 8 人战术板名单。测试账号的运行时手机号和服务器凭据未写入本文件。
- 后续验收仍须从真实角色会话读取这些数据验证各页面呈现；数据库行数通过不等于双端视觉与交互验收通过。

## 2026-08-30 Goal：教练真实会话与战术板保存重读验收

- 使用微信开发者工具 MCP（不再依赖失效的旧 automator `9420` 端口）写入服务器中真实创建的临时教练会话；会话身份为受控第一槽位，所有页面请求仍走 `https://cqtc.pomi.tech`，没有 mock API 或伪造响应。
- MCP 截图已在严格 `375×812` 下取得：教练日程 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cqtc-coach-schedule-live-20260830-v2.png`、比赛记录 `cqtc-c6-match-live-20260830-v2.png`、战术板 `cqtc-c7-board-live-20260830-v2.png`。日程与比赛页均读取中文生产数据。
- C7 真实交互闭环：将 `student-cq-talent-secure-test-1-1` 从场上移至下方名单，页面由“未保存”切到“已保存”；重新打开同一 `scheduled-match` 后，该队员仍以可拖动下方球员呈现。保存和重读均使用真实战术板 API，模拟器控制台错误筛选为空。复验截图：`C:\\Users\\ASUS\\AppData\\Local\\Temp\\cqtc-c7-board-persisted-20260830.png`。
- 当前测试板保留一名下场球员，便于在演示时直观看到“下半全部球员 → 拖入球场上场”的交互入口；需要恢复默认阵型时可在 C7 选择“重置阵型”后保存。

## 2026-08-30 Goal：双端月历、比赛预览与工作台真实回读

- 先重新读取在线 Figma：家长 P1 折叠/展开 `1008:186`、`1008:436`，教练 C1 折叠/展开 `1293:8`、`1293:34`。以当前在线稿而非旧离线规格对照小程序；真实月份可能有六周，保留完整日期网格，不为了静态示意稿压缩并截断月末日期。
- 真实双角色会话验证：从教练“我的”切换至家长，再从“我的孩子”切回教练，均通过真实角色切换 API 成功。家长 P1 严格 `375×812` 截图为 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cqtc-parent-schedule-live-20260830-v2.png`；TabBar 顺序为“日程 / 成长 / 我的孩子 / 发现”。
- P1 展开月历截图 `cqtc-parent-month-expanded-live-20260830.png`：显示 `2026年8月`，点击 `2026-08-29` 后月历收起、周条选中日期变为 29、事件区显示“暂无活动”，证明展开、选日和空态链路均由真实家长日程 API 驱动。
- C1 展开月历截图 `cqtc-coach-month-expanded-live-20260830.png`：显示 `2026年8月` 及训练/比赛日期标记。后续从月历选择 `2026-09-07`，真实 C1 截图 `cqtc-coach-schedule-match-live-20260830.png` 显示深色赛事卡；赛事卡使用浅蓝时间/白标题/蓝色类型标签，与白底红色训练卡明确区分。
- C6.1 真实截图 `cqtc-c6-event-add-live-20260830-v2.png`：新增页可见中文事件类型“进球、助攻、扑救、抢断、犯规、黄牌、红牌、乌龙球”，并读取中文球员名单。C2 真实截图 `cqtc-c2-attendance-live-20260830-v2.png`：出勤卡为绿色勾选/灰色未到、头像下显示中文姓名，页面没有销课或查看详情流程。

## 2026-08-30 Goal：在线稿月历控件与家长 TabBar 最终几何校正

- 重新从唯一在线 Figma 文件 `zZ6wKyOHKcO4UYXDd9jGwv` 获取严格 `375×812` 画板：家长折叠日程 `1008:186`、教练折叠日程 `1293:8`。以截图而非较早的进度记录为准：家长端 TabBar 顺序为“日程 / 成长 / 发现 / 我的孩子”。
- 家长 TabBar 仅交换 `discover` 和 `child` 的展示顺序，保留已有页面路径、active key 与图标资源；避免把用户的“位置交换”错误扩展为路由或身份逻辑变更。
- 教练折叠周条的左右翻周按钮统一为 `48rpx × 48rpx`、同一垂直基线；日期区使用周一至周六加独立的月历下拉槽位，消除原先右箭头较小且偏下、下拉控件挤压日期列的问题。展开月历及日期选择逻辑未改变。
- 本批只涉及家长导航显示与教练日程样式/定向测试；不改 API、会话、数据库或生产测试数据。后续批次继续审计 C2 出勤、C6/C6.1 比赛事件和 C7 战术板。

## 2026-08-30 Goal：比赛录入入口在线稿收口与现有实现审计

- 重新读取在线 C2 `93:606`、C6 `93:796`、C6.1 `93:827`、C7 `233:2`。C2 已与最新产品要求一致：训练工作台只显示头像点按式出勤（绿色勾/灰色未到、姓名在下），不显示销课或“查看详情”流程。
- 发现 C6 在线稿有“+ 添加事件”，但缺少当前小程序已实现的“编辑比赛”显式入口，容易使人误以为没有比分录入页面。已在 C6 深色比赛卡右上加入白色描边胶囊“编辑比赛”（Figma 节点 `1334:7` / 文本 `1334:8`），指向小程序已有的全屏 `pages/coach/match-edit` 路由语义；重新截图确认按钮不再被自动布局挤到比分区或时间轴。
- C6/C6.1 已有真实的中文事件链路：进球、助攻、扑救、抢断、犯规、黄牌、红牌、乌龙球；C7 已有全屏球场、下方完整名单、拖拽上下场、阵型、重置和真实保存/重读实现。本轮重新运行 C2/C6/C6.1/C7 定向 Vitest `41/41`、小程序 TypeScript、以及七账号近三周中文演示数据 API 回归 `18/18`，均通过。
- 开发者工具当前刷新后停在空白壳页，因此本轮不把该壳页截图当作运行态视觉验收；待恢复可用教练会话后，需要直接打开 C2/C6/C6.1/C7 路由复核实际 375×812 页面和交互。

## 2026-08-30 Goal：日历控件回归与中文比赛演示数据收口

- 重新读取在线 Figma 家长 P1 `1008:186` 与教练 C1 `1293:8`。两端均为“周条默认 + 月历下拉”的结构；教练折叠条保留左右翻周箭头、六个日期和独立的右侧下拉槽位。
- 修正教练日期条左右翻周箭头的定位：从依赖固定 `top: 40rpx` 改为相对容器 `top: 50%` 加 `translateY(-50%)`，确保箭头在不同基础库/设备渲染下始终与月历下拉槽位保持同一垂直基线。定向日程测试 `20/20`、小程序 TypeScript 均通过，提交 `8a6be06`。
- 家长 TabBar 源码当前顺序已经是“日程 / 成长 / 发现 / 我的孩子”；不改页面路径、active key 或双角色逻辑。若开发者工具仍显示旧顺序，应以重新编译后的 bundle 为准，不能通过反向改源码来迁就旧 bundle。
- 受控七账号导入器的 8 条比赛事件改为各自不同的中文赛况备注，并把“旧泛化备注”纳入 stale 检测，确保重新导入会刷新已有数据而非误报最新。C6 比赛详情在活动仅提供 `primaryTeamId` 时也会回读后台球队名称。
- 验证：API 定向 Vitest `21/21`、API TypeScript `exit=0`、限定 `git diff --check` 通过。生产导入、部署和真实会话截图仍必须使用受控脚本单独执行；本条不把本地回归结果误报为生产部署完成。

## 2026-08-30 C7 最新在线稿收口与生产演示数据复验

- 重新读取在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 1040:9` 后，C7 保留真实名单、拖拽上/下场、阵型切换与保存重读，只调整工作面结构：去掉圆角标题卡和副标题，改为左侧返回标题、“本场比赛阵型”与右侧阵型选择；球场、全员名单和操作区整体上移。名单首行坐标与两行行距按 `375×812` 运行截图回调，底部“重置阵型／保存战术板”回到设计安全区。
- 验证：C7 定向 Vitest `9/9`、小程序 TypeScript `exit=0`、WXML/WXSS 编译成功、限定 `git diff --check` 通过；真实教练会话最终截图为 `tmp-runtime-c7-figma-revision-actions.png`（严格 `375×812`）。数据文字、原生微信胶囊和设备状态栏按运行时豁免。
- 发布：远端 `dev` 已推送至 `5e79fa4`；生产 API 镜像切换到同一发布标识，受控七账号导入后 HTTPS `/health` 返回 `200`。重启初始的单次 `502` 经容器、内部 `/health`、HTTPS 和日志复查确认为服务启动窗口，随后均恢复 `200`。只读审计确认七个双角色槽位均有队员、日程、测评、雷达、比赛事件和战术板数据；真实比赛页复拍已显示中文进球、助攻、犯规、黄牌、扑救和抢断事件备注。

## 2026-08-30 C7 战术板号码与名单状态复验

- 再次读取唯一在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 1040:9`。当前 C7 画板以红色号码圆点表达场上球员、以红框候补态和灰色已上场态表达下方名单；没有为设计示例人员或头像补造前端数据。
- 小程序 C7 继续只消费真实战术板 roster/board：TypeScript 为每个真实 roster 成员预计算稳定号码、`已上场/候补上场` 文案和视觉类名，WXML 不调用数组或字符串方法。球场提示、球员圆点、4 列名单坐标、名单圆点尺寸和安全区位置与当前在线稿同步。
- 真实教练会话在严格 `375×812` 中复验首屏：`tmp-c7-restored-final.png`。当前受控比赛的真实名单为 8 名且均为首发，因而下方显示 8 个灰色“已上场”成员；未伪造在线稿中的候补人员。
- 真实保存链路复验：先将阵型改为 `4-4-2` 并保存，生产 API 重启后重新进入同一 C7，阵型和 8 名场上队员均读回；随后将该受控比赛恢复为原先 `4-3-3` 和原始站位并再次读回，页面为已保存状态。
- 验证：C7 定向 Vitest `10/10`、小程序 TypeScript `exit=0`、目标 WXML/WXSS 编译成功、限定路径 `git diff --check` 通过。微信开发者工具“刷新”会回到教练日程默认路由，C7 截图应使用精确路由重新打开，不能把默认路由瞬间白壳误判为 C7 渲染故障。
- 家长端最终 TabBar 顺序以用户 2026-08-30 最新确认的“日程 / 成长 / 发现 / 我的孩子”为准；早于本条且记录相反顺序的历史日志不再作为实现依据。

## 2026-08-30 七账号滚动窗口与中文展示复审

- 强化只读生产审计器：除固定账号、名单、绑定、评测、雷达、比赛事件与战术板数量外，额外检查每个槽位当前周及前两周均有活动、至少五堂完成训练、至少两条未来预览，以及队员/活动/对手/比赛事件的展示文案不存在三字以上英文测试占位。输出只保留槽位与聚合指标。
- 生产审计 `EXIT=0`：七个双角色槽位均满足三周窗口和中文展示约束；各槽总活动为 23–36 条、已完成训练为 13–18 条、未来预览为 2 条。受控基线仍为每槽 8 人教练名单、2 名家长绑定学员、8 份评估、64 条雷达记录、2 场比赛、8 条比赛事件和 8 人战术板。
- 本轮为只读核验，没有导入、删除或覆盖生产演示数据，也没有输出手机号、会话、凭据或数据库绝对路径。由于真实教练后续操作会累积额外历史记录，审计对活动总数采用下限和滚动日期窗口而非脆弱的固定总数断言。

## 2026-08-30 C7 十九人战术板演示数据源收口

- 受控七账号导入源由每队 8 人扩展为每队 19 人：前 11 人为首发，后 8 人为候补；家长可见范围仍严格限制为前 2 名绑定学员。比赛事件保持 8 条中文关键事件，避免为所有候补生成无意义的比赛记录。
- 回滚白名单不再复制名单长度，而是复用导入源生成的受控 manifest，防止未来扩充名单时导入与回滚契约漂移。教练球队接口按数字自然顺序返回成员；C7 前端优先按已保存战术板顺序展示，再追加仅在 roster 中出现的成员，避免字符串排序使 10 号排在 2 号之前。
- 本地回归：受控账号 API 定向 Vitest `19/19`，C7 战术板定向 Vitest `11/11`。随后执行了受控生产发布与数据刷新，详情见下一条。

## 2026-08-30 C7 十九人生产发布与七账号审计

- 已从提交 `904c3bb` 构建并发布 API；在写入前建立了受限 SQLite 快照（含 WAL/SHM），发布后运行容器标签、内部 `/health` 与 HTTPS `/health` 均为正常状态。
- 发布脚本首次用无间隔轮询过早判定健康检查失败；只读诊断确认 API 仅处于启动窗口，容器运行正常。该次失败发生在导入之前；恢复流程重新完成备份、dry-run、confirmed import、API 重启与健康复查。
- 更新后的只读七槽位审计全部通过：每槽 19 名教练名单、2 名家长绑定学员、5 场受检活动 95 条参与记录、19 份评估、152 条雷达记录、2 场比赛、8 条中文比赛事件，以及保存的 19 人战术板（11 首发、8 候补）。所有槽位同时满足近三周活动、至少两条未来预览和中文展示文案约束；记录只保留槽位与聚合数量。

## 2026-08-30 C7 十九人名单工作区与保存重读闭环


- 家长端 TabBar 的产品基线再次确认且锁定为“日程 / 成长 / 发现 / 我的孩子”；仅家长端采用这四项顺序，教练端导航保持独立配置。较早进度条目中相反的“我的孩子 / 发现”顺序已过时，不得据此回改源码。
- C7 在真实 19 人名单下暴露了工作区高度固定的布局缺陷：下方第五行成员理论坐标超过 `movable-area` 边界，而 `out-of-bounds=false` 会将其夹在同一边界位置，造成重叠。页面现按 TypeScript 中预计算的名单行数设置 `workspaceHeight`；19 人时为 `787px`，各行坐标保持独立。WXML 不新增数组方法调用。
- 验证：C7 定向 Vitest `12/12`、小程序 TypeScript `exit=0`、C7 WXML/WXSS 均由 WeChatIDE MCP 编译成功、限定 diff 检查通过。真实模拟器截图 `tmp/c7-before-save-2026-08-30.png` 与 `tmp/c7-after-restart-readback-2026-08-30.png` 均严格 `375×812`。
- 生产写入遵循受限备份 → 保存 → API 重启 → 重开读回：保存了一次最小的真实球员位置变更，API 健康检查恢复 `200` 后，重开同一比赛战术板读到完全相同的保存位置；页面为未脏状态，名单仍为 19 人、11 首发、8 候补，模拟器错误筛选无命中。

## 2026-08-30 双端关键演示流程运行态复验

- 重新读取在线 Figma：教练 C1 `1293:8`、C2 `93:606`、C6 `93:796`、C7 `1040:9`；家长导航基线固定为“日程 / 成长 / 发现 / 我的孩子”。真实家长会话严格 `375×812` 截图确认 P1 底部依次显示这四项，并确认周条可展开为月历、月历可收起。
- 真实教练会话严格 `375×812` 复验：C1 月历可展开、翻月、选日后收起；C2 为十九人四列头像网格，绿色勾/灰色未到和四字以内中文姓名均可见；C6 显示中文比分与事件时间线；C6 编辑页可录入比分；C6.1 可选进球、助攻、扑救、抢断、犯规、黄牌、红牌和乌龙球；C7 保持上方球场、下方全员名单的真实拖拽结构。
- C2 完成一次受控写入复验：将一个已到头像点为未到，重开工作台确认 API 读回，再恢复为已到并再次重开确认，最终演示基线未改变。
- 运行态曾出现 C2/C6“读取失败”，网络日志证实是使用了不属于当前受控教练范围的历史示例活动 ID，API 正确返回 `403 Event is not accessible for this coach membership`。改为当前教练日程授权的活动后页面正常；这是访问边界，不是页面或服务器故障，不得通过放宽权限修复。
- 只读七账号生产审计 `EXIT=0`：各槽位均有最近连续三周的中文训练/比赛/出勤/评测/战术板数据、19 人教练名单、2 名家长可见学员、2 场比赛、8 条比赛事件和 11 首发/8 候补战术板；本轮未导入、删除或覆盖演示数据。
- 质量门禁：目标定向 Vitest `77/77`，日历/TabBar 定向 Vitest `46/46`，全仓 `pnpm run check` 中 domain `21/21`、小程序 `441/441` 已通过，目标 14 个 WXML/WXSS 编译均成功，`git diff --check` 通过。

## 2026-08-30 七账号历史活动场地补齐

- 家长端 TabBar 产品基线再次确认：`日程 / 成长 / 发现 / 我的孩子`。本批没有交换“发现”和“我的孩子”，也没有改动家长端路由。
- 根因：标准滚动导入活动已有场地，但早期同一安全测试账号下的补充历史活动可能保留 `location_id = NULL`，BFF 因而无法映射中文 `venue`，前端显示“地点待确认”。
- 导入器现把“安全测试活动命名空间 + 当前槽位俱乐部/队伍严格匹配 + 缺场地”视为 stale，并仅回填已有场地：训练为重庆体育学院训练馆、比赛为九龙坡足球公园。早期活动可缺失 `owner_coach_id`；非测试队伍或已有场地的活动不被修改。
- 本地验证：新增回归测试覆盖“目标历史活动回填、无关队伍不变”；受控账号 API 定向 Vitest `119/119`、API TypeScript、全仓 `pnpm run check`（domain `21/21`、小程序 `441/441`、API `119/119`）和 `git diff --check` 均通过。
- 生产只读审计器额外输出聚合字段 `allActivitiesHaveVenue` 与 `venueNamesChinese`，不输出账号、会话、凭据或数据库路径。生产刷新仍需遵循备份 → confirmed import → API 重启 → 只读审计 → 小程序读回。

## 2026-08-30 历史场地兼容发布与七账号生产读回

- 兼容补丁 `03c6a0e` 已推送并发布。生产流程完整执行：受限 SQLite 快照、镜像构建、API 容器重建、HTTPS 健康检查、受控 dry-run、confirmed import、API 重启及再次 HTTPS 健康检查，全部成功。
- 发布后的第一次只读审计把同一 ID 前缀但属于另一支队伍的三条旧记录计入了第一个安全槽位，因而错误报告“缺少场地”。只读分组诊断证明当前槽位的精确队伍记录均已有可识别场地；导入器未修改这些跨队伍历史数据，符合其严格边界。
- 审计器已改为以 `club_id + primary_team_id + 受控 ID 命名空间` 读取每个槽位活动，防止前缀碰撞产生假阳性。重新审计 `EXIT=0`：七个槽位均满足最近三周活动、中文展示、已知中文场地、19 名教练名单、2 名家长绑定学员、19 份评估、152 条雷达记录、2 场比赛、8 条比赛事件和 11 首发/8 候补战术板。
- 家长端底部导航最终产品基线再次锁定为 `日程 / 成长 / 发现 / 我的孩子`；源码中已是此顺序。当前微信开发者工具会话为教练身份，直接导航家长路由会被角色守卫留在教练日程，不可将这种正确的权限结果误判为家长 TabBar 失效。

## 2026-08-31 P1/C1 日程固定顶栏与跨设备安全区收口

- 用户确认：家长端底部导航固定为 `日程 / 成长 / 发现 / 我的孩子`，不交换“发现”和“我的孩子”；本批未改动该组件或路由。
- P1 家长日程与 C1 教练日程的自定义顶栏改为固定在屏幕顶部，正文通过紧随其后的流式占位区从顶栏下方开始。根因修正为共享的 `resolveTopBarHeight()`：将 Figma 的 `88rpx` 按真实 `windowWidth` 换算后再叠加状态栏高度，消除旧 `resolveNavInset() + 44` 在非 375px 宽设备上的错位。
- 真实 WeChatIDE MCP 运行态验收：iPhone X `375×812`、状态栏 `44px` 时 P1/C1 的 `topBarHeight` 均读回 `88px`；家长通过真实“双角色切换”入口进入教练 C1，未伪造会话或角色。P1 展开月历后正文可在固定顶栏下滚动；P1 首屏截图仍显示家长 TabBar 的既定四项顺序。
- 验证：P1/C1/共享 presentation 定向 Vitest `43/43`，小程序全量 Vitest `446/446`，小程序 TypeScript 通过，四份 P1/C1 WXML/WXSS 均由 WeChatIDE MCP 编译成功，限定路径 `git diff --check` 通过。
- 全仓门禁的 API 部分另有独立失败：`apps/api/test/app-client-match-event-create.test.ts` 的“retains the created event and metric record after reopening SQLite”在默认 `10s` 超时而失败；同文件其余 `4/5` 场景通过。该失败与本批纯前端顶栏改动无关，未在本批掩盖或修改。
## 2026-08-30 全端页面顶栏固定规则

- 根据最新产品要求，带页面级导航的家长端、教练端和登录页统一采用顶部锁定规则：滚动内容时顶栏保持在窗口顶部，且保留原有安全区与页面流布局。
- P1/C1 日程继续使用已验收的 `position: fixed` + 顶栏占位；其余自定义页面级顶栏保留 `sticky; top: 0; z-index: 100` 的可见性契约。共享 `components/app-header` 已升级为“外层 88px 正常流占位 + 内层 fixed surface”：比赛、销课、账户等所有复用页面无需逐页加补偿，滚动时也不会失去顶栏或遮住首段内容。
- 覆盖范围包括共享 `app-header`、家长端全屏子页、教练端全屏子页、C7 战术板和 C16 我的页；局部卡片标题、月历内部标题、名单标题不纳入页面级顶栏规则。
- `apps/miniprogram-cq-talent/utils/topbar-sticky-check.cjs` 现额外锁定共享组件的“固定可见层 + 正常流占位”结构；组件定向 Vitest `2/2`、该 Node 回归检查 `2/2`、小程序 TypeScript、共享 WXML/WXSS 微信开发者工具 MCP 编译均通过。真实 `375×812` 比赛页截图：`C:\Users\ASUS\AppData\Local\Temp\cqtc-app-header-fixed-match.png`。

## 2026-08-31 C2 出勤完整名单写入防回归

- C2 的头像点按交互使用真实“完整名单”出勤写入契约。发现旧实现会把未点击的灰色成员统一重写为 `absent`；同时小程序 API 适配层把后端合法 RSVP 状态 `confirmed`/`invited` 降为展示用 `pending`，但保存层又拒绝 `pending`，造成完整名单保存不可靠。
- 已修复为保留后端语义状态：仅被点击成员在 `present/absent` 之间切换；其余成员按原始 `confirmed`、`invited`、`late` 等状态回传。视觉仍符合产品要求：到场/迟到为绿色，其他均为灰色，不恢复流程状态、销课或查看详情入口。
- 验证：先执行 API 适配层回归测试并确认两个预期失败，再以最小改动转绿；C2 页面与 API 适配层定向 Vitest `31/31`、小程序 TypeScript、C2 WXML/WXSS 微信开发者工具 MCP 编译和限定 `git diff --check` 均通过。真实 `375×812` 教练会话点击一名绿色头像后，读回结果仅多一名未到，11 名未点击 RSVP 成员仍保持确认；演示数据随后通过受控备份、恢复、API 重启和只读回查恢复为 19 人基线（6 到场、2 迟到、11 已确认）。

## 2026-08-31 C7 首发／替补 Figma 首屏收口

- 重新读取在线 Figma C7 `1040:9` 并与真实比赛运行态对照，发现旧视图把 11 名首发再次放入下半区“全部球员”，在十九人名单时将操作栏挤出 `375×812` 首屏；这与画板的“球场首发 + 下半区候补”构图不一致。
- C7 现把真实名单拆成两个互补视图：首发仅在足球场内显示，八名候补在四列下半区显示；拖拽、换人、阵型、保存和 API payload 保持原有真实数据契约。这样 19 名真实球员仍完整可见，但不重复占用下半区。
- 验证：先将 C7 回归测试改为“11 首发 + 8 候补 + `520px` 工作区”并确认红灯，再以最小实现转绿；C7 定向 Vitest `12/12`、小程序 TypeScript、C7 WXML/WXSS 微信开发者工具 MCP 编译和限定 `git diff --check` 均通过。真实已结束比赛的 `375×812` 截图 `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cqtc-runtime-c7-split-roster.png` 中，八名候补和底部“重置阵型／保存战术板”均回到首屏。

## 2026-08-30 双端改版目标当前态审计

- 在线 Figma 当轮重新读取：P1 `1008:186`、C1 `1293:8`、C6 `93:796`。当前基准仍包含顶栏、周条/月历切换、训练/比赛区分、家长 `日程 / 成长 / 发现 / 我的孩子` 底部顺序，以及比赛全屏编辑结构。
- 定向小程序验证 `99/99`：双端月历与日期翻页、TabBar、C2 头像直点的绿/灰出勤、训练/比赛区分、C6 比分与事件（进球/助攻/犯规/乌龙球）写入页面、C7 真实名单拖拽与保存契约全部通过。C1 的真实 `375×812` 运行态验证显示月历可展开，收起后下一周从 `2026-08-31` 前进至 `2026-09-07`。
- 生产七账号仅做只读聚合审计，结果 `EXIT=0`：每个受控双角色槽位都有三周连续中文训练/比赛、已知中文场地、十九人名单、两名家长可见学员、十九份评估与 152 条雷达记录、两场比赛/八条事件、11 首发/8 候补；未检测到需要导入的数据缺口，也未进行生产写入。
- 全仓门禁当轮通过：domain `21/21`、小程序 `448/448`、API `119/119`，各包 TypeScript 均通过。共享页面顶栏批次已提交并推送 `0a5b890`；未上传微信体验版，因用户尚未明确要求上传。

## 2026-08-31 截图产物隔离与新目标启动

- 当前双端验收 goal 已重新建立并保持 active：在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 是唯一视觉基准，可信运行证据统一使用微信开发者工具 MCP 的真实 `375×812` 模拟器截图。
- 截图脚本在省略输出路径时统一写入 `%TEMP%\\cq-talent-visual-evidence`；本轮将 `%TEMP%` 根目录已确认属于旧 MCP 的 20 张 `wechatide-simulator-screenshot-*.png` 可恢复移动到其 `raw` 子目录，没有删除历史资料。
- 桌面根目录未发现截图文件，仅有原有的 `头.jpg`、`cqai_logo_transparent_cropped.png` 和 `logo.jpg`。项目下 `.trellis/tasks/**/research`、`docs/design/reference/figma` 等图片是历史设计/验收证据，不批量清理或改路径，避免破坏交接文档引用。
- 截图路径回归 `10/10`；教练 C1 日程在线稿 `1293:8` 与真实 MCP 模拟器截图已重新对照，结构一致，状态栏、TabBar、真实日期和真实数据属于运行时差异，不作为代码缺陷。

## 2026-08-31 C2 快捷入口 glyph 与在线稿同步

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:606` 的三个快捷入口使用正红色 `✦ / ◎ / ↻`；运行态此前误用了列表、绿色方框和橙色警告 SVG。
- C2 视图模型现对训练内容、评测录入、变更活动预计算对应 glyph；其他入口保留原有图标回退，不改路由、API 或真实数据契约。
- 验证：C2 定向 Vitest `16/16`、小程序 TypeScript、目标 WXML/WXSS MCP 编译通过；真实教练会话复拍严格 `375×812`，三个入口与当前在线稿颜色、字形和垂直层级一致。

## 2026-08-31 C4 出勤管理首屏复核

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:665` 与真实教练路由 `pages/coach/attendance/index?id=event-cq-talent-secure-test-1-trn-0818` 已重新读取；运行截图严格 `375×812`，输出到 `%TEMP%\\cq-talent-visual-evidence`。
- 顶栏、提交动作、深色课程信息卡、出勤/缺勤/待确认统计、全员到场/清空按钮、头像行和绿色确认状态的结构与在线稿一致；运行态真实活动名称、日期、名单和 TabBar 属于数据/设备壳层差异。
- 在线示例显示“前锋/中场/后卫”等位置副标签，但当前真实 workbench API 的学生资料没有位置字段，只有姓名、基础组别和出勤状态；本轮不伪造位置文本，记录为真实数据能力边界而非视觉代码缺陷。
- 微信开发者工具 console 仍会报告 `webapi_getwxaasyncsecinfo:fail appid missing`（`err_code=41002`），这是 DevTools SDK 环境日志；C4 API 请求实际返回 `200`，不影响页面编译、加载或截图。

## 2026-08-31 C6 比赛详情在线稿复核

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:796` 已重新读取，返回严格 `375×812`；与 2026-08-29 保存的 C6 在线稿逐像素比较 `same_pixels=True`，当前设计没有实质变化。
- 当前 C6 源码没有新的已跟踪改动，继续保留既有“编辑比赛”、上半场/下半场胶囊、`+ 添加事件` 和教练 TabBar 结构；不因 Figma 未变化而重复修改代码。
- 本轮机器未检测到微信开发者工具进程，因此没有生成新的运行态截图；既有运行截图仍作为历史证据保留，本条不宣称 2026-08-31 的新运行态视觉验收。

## 2026-08-31 C6.1 比赛事件录入在线稿复核

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:827` 已重新读取，返回严格 `375×812`；与 2026-08-29 保存的 C6.1 在线稿逐像素比较 `same_pixels=True`，当前设计没有实质变化。
- C6.1 继续以真实能力类型、真实比赛和真实球员名单为数据来源，不复制画板示例数据；本轮未因设计未变化而重复修改页面代码。
- 微信开发者工具当前仍未运行，因此本轮没有新增 C6.1 运行态截图，不宣称新的运行时视觉验收。

## 2026-08-31 C7 战术板在线稿复核

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 1040:9` 已重新读取，返回严格 `375×812`；与 2026-08-29 保存的 C7 在线稿逐像素比较 `same_pixels=True`，当前设计没有实质变化。
- 当前稿继续要求左侧返回、`比赛战术板` 标题、`MATCH TACTICS`、球队阵型选择、绿色全尺寸球场、红色场上号码圆点、下方候补球员和底部“重置阵型／保存战术板”双按钮；现有代码沿用真实战术板 roster、拖拽和保存读取契约，不复制示例球员。
- 微信开发者工具当前未运行，本轮未生成新的 C7 运行态截图；不把历史运行图升级为 2026-08-31 的新视觉验收证据。

## 2026-08-31 C8 训练管理在线稿复核

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:896` 已重新读取，返回严格 `375×812`；与 2026-08-29 保存的 C8 在线稿逐像素比较 `same_pixels=True`，当前设计没有实质变化。
- 当前稿继续要求训练管理标题、四项统计卡、训练计划/能力评估/学员管理/测评任务分段导航、训练卡片和教练底部 TabBar；本轮未因设计未变化而重复修改页面代码。
- 微信开发者工具当前未运行，本轮没有新增 C8 运行态截图，不宣称新的运行时视觉验收。

## 2026-08-31 C6/C6.1/C7 真实 MCP 运行态复验

- 微信开发者工具恢复后，使用 WeChatIDE MCP 重新打开并采集 C6 `/pages/coach/match/index`、C6.1 `/pages/coach/match-event-add/index`、C7 `/pages/coach/tactical-board/index`，三张截图及 sidecar 均严格 `375×812`，采集方式均为 `wechatide-mcp simulator_screenshot`，证据位于 `%TEMP%\cq-talent-visual-evidence`。
- C6 真实运行态的比赛标题、球队、比分、事件时间线和半场比分待同步文案均来自当前教练可访问活动；C6.1 显示真实能力类型和球员名单；C7 显示真实战术板号码、候补名单和拖拽工作区，未复制 Figma 示例业务数据。
- 三页的顶栏、内容卡片、球场/名单结构、操作层级和教练 TabBar 与当前在线稿一致。C7 保存按钮在未产生变更的真实状态下呈禁用色，记录为状态差异，不通过伪造拖拽修改来强行匹配画板示例。

## 2026-08-31 C8 真实 MCP 运行态复验

- 通过 WeChatIDE MCP 采集真实教练路由 `/pages/coach/training/index`，截图和 sidecar 均严格 `375×812`，证据位于 `%TEMP%\cq-talent-visual-evidence`。
- 四项统计卡、训练计划/能力评估/学员管理/测评任务分段导航、训练卡片和教练 TabBar 与在线 Figma `93:896` 结构一致；统计数字、训练名称、日期和人数均来自当前真实接口数据。
- 训练时间胶囊在长日期数据下按现有防溢出规则显示省略号，未出现横向撑破或遮挡；本轮不改代码。

## 2026-08-31 C11 真实 MCP 运行态复验

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1002` 已重新读取并与真实教练路由 `/pages/coach/test-tasks/index` 对照；截图和 sidecar 均严格 `375×812`，证据位于 `%TEMP%\cq-talent-visual-evidence`。
- 顶栏“新增”、全部/未完成/已完成筛选胶囊、任务卡、状态标签、进度条、右箭头、悬浮新增按钮和教练 TabBar 结构一致；任务名称、日期、完成数量和状态来自真实接口数据，未复制 Figma 示例值。

## 2026-08-31 C12/C12.1 真实 MCP 运行态复核

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1030` 与 `93:1061` 已重新读取；C12 画板为高 `894px` 的项目评分录入页，C12.1 为自动保存提示态。
- 真实活动 `event-cq-talent-secure-test-1` 当前存在设备本机评分草稿，因此 MCP 截图进入 C12.1 自动保存态；遮罩、成功图标、文案层级、继续/退出按钮和教练 TabBar 与 `93:1061` 一致。截图和 sidecar 均严格 `375×812`，证据位于 `%TEMP%\cq-talent-visual-evidence`。
- 另一个历史活动 `event-cq-talent-demo-training-upcoming` 返回真实“评分项目读取失败”错误态，不能作为普通 C12 成功态证据；本轮不清理本机草稿、不注入评分数据，也不宣称普通 C12 录入态已通过。

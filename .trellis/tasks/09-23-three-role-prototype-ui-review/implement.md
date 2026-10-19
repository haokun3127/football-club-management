# 执行计划：三端升级与完整体验部署

## 当前授权
用户已授权开发、服务器体验部署和小程序体验版上传/切换；不授权生产数据变更或正式发布。旧设计评审包保留，当前任务继续推进，不创建竞争任务。

## 执行顺序与证据
1. [x] Figma MCP 连接、代码/设计差距、SSH 只读服务器基线；development-baseline.json 保留原工作区状态。
2. [ ] 青训 App 图片研究与重点页面视觉定稿；统一红色主题、字阶、留白、列表、操作和状态。
3. [ ] 数据与权限：环境保护、独立测试身份；训练有效记录与财务分离；测评确认/修订/课程时间；跨天任务；球探和服务权限。
4. [ ] 小程序页面与后台真实前端/BFF；逐条对照 requirements-design-map.md、bff-data-flow-review.md。
5. [ ] 完整 check/build、环境拒绝矩阵、真实持久化重启、三角色 UI 关键路径、官方包体校验。
6. [ ] 创建可重复构建包/清单，部署独立 trial/develop API 与后台；服务器 Nginx 校验后加载新非生产入口。
7. [ ] 非生产模拟数据与既有测试身份按用户选择接入，实际登录及跨端读写验收。
8. [ ] 微信官方工具上传新版本并验证平台体验版选择；禁止提审/正式发布。
9. [ ] 回读部署、保留回滚材料和未完成项；Trellis check/update-spec/finish-work。

## 验证边界
Figma 原型与词法按钮清单不是运行验收。生产容器、镜像、数据卷不被替换、迁移或导入；测试数据仅进入非生产独立卷。浏览器超时或平台权限不足时明确记录阻塞，不虚构验收结果。

## 2026-09-24 阶段证据
- 核心训练记录增量通过全量 check（23 domain / 506 mini / 163 API，1 skipped）和 build；后续工作台入口修正通过针对性回归及 mini 类型检查。
- 平台规则测试 3/3；本地三个运行入口与显式初始化验证通过；46 篇官方留档刷新完成。
- 阶段 6 中的独立 API+Nginx 已提前完成，不代表后台管理前端或完整体验已交付。线上 11 项探测及生产基线对比通过。源镜像/清单见 api-candidate-manifest.json 和 deployment-verification.json。
- 真实微信登录、测试身份接入和官方上传待用户必要输入；后台管理前端、其余业务闭环与全部页面视觉仍待开发，不勾选整体完成。

## 2026-09-28 环境通道修复计划
用户要求检查并打通 Codex → 本地 → develop → trial → 正式发布前检查。
- [x] 修复双 IDE 安装选择；恢复本地基础库/域名校验与团队一致。
- [x] 增加受环境/数据库归属保护的最小客户端登记：仅 club/app-client，重复执行不覆盖现有配置，release 禁止。
- [x] 对 develop/trial 执行最小登记并回读；生产无业务数据访问或迁移。
- [x] 增加可重复 HTTPS 就绪检查与本地/CI门禁；缺凭据/身份/微信平台验收必须显示未完成。
- [x] 记录一致制品、逐环境推进、回滚和发布前停止点；验证本地及实际微信启动。
用户已确认继续使用现有小程序 AppID；用户现已明确授权将服务器现有匹配 AppID 的微信凭据用于非生产，私有配置与服务重建已完成，测试身份已按用户提供的运行时手机号在 develop/trial 分别配置为本人单账号三角色。此次凭据操作依据用户单独明确授权；不把工具权限变化或 AppID 选择视为此类授权。

本轮证据见 `channel-checkpoint-20260928.md`。上述勾选仅代表通道修复范围完成；真实登录、远端 CI 和完整体验交付仍未完成。

身份配置阶段：备份路径 `/opt/cq-talent-nonproduction/backups/identity-20260928T012412120471Z/`；两服务已重启并回读，三角色配置为 true，唯一配置缺口为 AppSecret。全量交付门禁与线上 10 项检查通过；身份连接器模拟测试不能代替真实微信登录。

后续凭据配置已完成：两环境 configurationReady=true、blockers=[]；真实 wx.login code 兑换通过。手机号授权/实际用户会话、后台与新体验包验收仍未完成。证据 `channel-evidence-20260928/credentials-runtime.jsonl`、`credentials-https.json`、`wechat-code-exchange.json`。

## 2026-09-28 用户要求：全部已规划开发与本地体验

交付优先级更新：先完成评审后已确认的功能，再在本地微信开发者工具展示可体验版本。本轮不上传/切换体验版，不操作正式发布。授权覆盖现有任务的开发，不再次询问开始许可。C 条目及 09-22 后续确认作为范围；P/O/E 不擅自变成已确认功能或正式参数。

按依赖推进（各项独立保留测试和渲染证据，整体未完成前不归档）：
- [ ] 自由战术板：移除固定阵型/人数，拖入/移动/拖回、独立滚动名单、姓名、撤销、清空、自动保存与失败恢复。
- [ ] 教练工作流：多队授权范围与跨日待办、课程内容/模板/复制、单课工作台/变更、学员评价历史与真实教学统计。
- [ ] 测评与成长：行级课程/发生时间、协同权限、逐人确认/修订、两段评分映射、版本与缺测展示。
- [ ] 人员与服务：球探统一身份、临时活动参与、家长咨询与教练/后台跟进。
- [ ] 后台：四模块真实页面、维护/导入导出/历史、布局、内容/标准配置、BI 与鉴权；不把通用占位页作为已完成。
- [ ] 家长页面：多孩首页/日程、事实更正、成长与培养标准、预制分享和快捷入口；无真实规则时明确未配置。
- [ ] 微信规范/完整测试/关键链路、隔离的开发数据与本地开发工具体验，按清单记录剩余业务输入。

当前实施从已完全确认且可独立验证的 C26 自由战术板开始，同时保留全部后续范围。

课程模板/复制增量约束：复用既有 session_plan/training_session，模板保存可复用内容快照；公开模板仅管理员可建，教练可建个人模板。来源与目标分别授权，预览具体目标、已有内容与排除项，明确跳过/替换；源版本或目标安排/内容改变则拒绝旧预览。每个目标原子写入，逐目标返回处理结果。友谊赛按内容能力标记整项排除，不靠名称判断，不复制相关比分或状态；仅剩友谊赛时阻止空复制。此增量不改变排课、计次及正式发布状态。


## 2026-09-28 工程统筹纠偏（最新执行顺序）

2026-09-30 增补：当前先执行 Figma 原生 AI 体育活力视觉升级并锁定按钮布局和功能；候选确认、逐控件几何/原型核对后，再按以下 B0–B5 继续工程。记录 sports-visual-review-20260930.md，业务代码候选保持不变。

用户要求以既有 Figma 与此前评审成果统筹工程，暂停不经设计对照的新增界面。以 [engineering-baseline-20260928.md](engineering-baseline-20260928.md) 的 B0–B5 依赖顺序与分层验收为准，替代按页面零散补功能的执行方式；不删除原计划和历史证据。实时回读 8 页 238 画板 ID 与原清单完全一致；首批 C03/C06/C11/C15 已发现明确偏差，先收敛再扩张。此盘点不代表全部设计或功能已验收。

### 2026-09-30 V2 覆盖前述视觉执行限制

用户否定 V1 的视觉，要求 Figma 学习真实足球俱乐部后自主设计。当前先进行 V2 风格板和三个代表页面；保留品牌、已评审功能与操作布局逻辑，解除总控额外施加的逐像素及装饰参数限制。无需继续以 V1 的逐控件几何一致作为 V2 风格验收条件。V2 用户确认前不批量实现，业务 B0–B5 依赖保持。具体记录 club-style-v2-20260930.md。

## 2026-10-03 当前执行授权与顺序

用户已确认浅色明快视觉风格，并明确要求先完成所有页面设计，然后开发至线上体验版。本条替代之前“仅本地体验/本轮不上传”的阶段限制；生产数据和正式发布仍禁止变更。

- [x] 浅色视觉方向获用户确认：#FAFAF7 / #FFFFFF / #A80F1B，源风格 421:2367、421:2454、421:2540、421:2735。
- [ ] Figma 原生 AI 将统一风格覆盖 8 个评审页 238 个主/状态画板，保留原始基线、业务内容、操作逻辑和有效连线；逐批截图核查及范围清点，不以批量改色代替检查。
- [ ] 按 B0–B5 完成代码收敛、功能/BFF/持久化/权限；保留现有候选实现并检查复用。
- [ ] 微信规范、本地三角色、全量交付检查与真实端到端验证。
- [ ] 构建同一不可变制品，独立 develop 后 trial；部署后台，微信上传并选择体验版，回读版本与环境归属。

正式标准与真实照片未提供的部分采用明确测试数据或未配置状态，不能冒充正式标准。需要真实微信用户扫码/手机号授权时在操作点请求配合。整体任务保持 in_progress，禁止把任何阶段完成当作整体交付。

### 2026-10-03 执行检查点（设计处理中）

- 用户已在 Figma 桌面替总控发送全页扩展提示；原生 Agents 界面确认已启动，分批处理家长端。未重复提交。仅任务进度不是完成证据，后续必须回读截图和内容/连线。
- 全页 ID 清点与内容/连线摘要见 `all-screen-baseline-20261003.json`、`all-screen-coverage-20261003.json`、`all-screen-integrity-start-20261003.json`。摘要是在用户发送提示后采集，不伪称严格修改前快照。238 个历史画板均在；云端评测页额外返回 231:3468（需核对与桌面目录差异），X16-LOADING 266:22 的动作节点由历史 0 变为 1，其他历史画板动作节点数一致；数量相同不证明目标正确。
- `node scripts/verify-environment-readiness.mjs` 于 2026-10-03T07:56Z 完成：10 项只读路由/注册/拒绝检查通过；真实登录未重验，无远端写操作。
- 官方 46 篇规范刷新成功，45 篇规范化正文不变；`product-ops-spec` 5.14 更新官方身份/品牌混淆规则。差异见 `wechat-doc-refresh-diff-20261003.json`，后续检查登录/手机号授权前置页及素材。刷新前留档备份在系统临时目录。
- Node 24 下重新运行 `pnpm check:delivery`，类型检查通过，API 171/175 通过，4 项旧测评接口测试失败：任务示例截止 2026-09-30，当前旧 POST coach/assessments 仍按今天大于 dueOn 拒绝。日志 `/tmp/cq-delivery-baseline-20261003.log`。后续开发需按已确认的晚录/确认发布合同收敛，不简单把示例日期延后掩盖问题。门禁在测试阶段停止，构建和后置通道检查不能标记通过。

### 2026-10-03 设计质量阻断与恢复（当前状态）

- 原生 AI 本轮运行 18m27s，独立读回发现 P01–10、P21–30 及多张状态画板重建子节点，连线变为 0；P01 仍沿用旧深色足球横幅和旧视觉结构，未准确采用已确认 V2。总控已停止本轮生成，未接受完成。
- 已尝试两次原生 Undo；最新核对家长仅剩 77 个、教练 172 个反应节点（基线分别 220、268），尚未恢复完成。其余六页内容/连线摘要与开始快照一致。差异名单见 `all-screen-ai-recovery-20261003.json`。
- 打开版本恢复入口时 macOS 已锁屏，自动解锁失败；已请求用户解锁。云端只读确认四个已批准 V2 样例均存在、尺寸正确、暖白底仍保留。
- 下一步必须先恢复本次生成改动并验证 238 个基线画板内容/连线，再让原生 AI 小批量原位更新；不在损坏的原型上继续扩张，不以总控脚本重新设计替代原生 AI。业务代码未改、未上传/切换体验版、无远端业务写入或生产变更。

### 2026-10-03 解锁后恢复完成

- 已在 Figma 版本历史预览并恢复 `2404917248958920351`（Sep 30, 3:15 PM），预览确认四张已批准浅色 V2 样例保留。恢复产生单独 Restored version，可追溯。
- 云端逐页比对 238 个历史画板（另有原存云端 231:3468），所有文本 ID/内容和原型反应 ID/负载摘要均与本轮开始快照一致，无缺失。家长 220、教练 268，八页合计 1066 个反应节点；详见 `all-screen-restoration-20261003.json`。这证明恢复，不能当成新视觉全量完成。
- 返回可编辑画布准备提交小批次时 Mac 再次锁屏；已请求在 Figma 操作期间保持解锁。下一步只处理 P01/P02/P08 的原位视觉更新，先验证内层交互节点保留，再扩展；不重复全量无检查生成。

### 2026-10-04 native Figma pilot resumed
- User unlocked desktop; submitted saved three-page prompt to existing 探索新视觉风格 conversation. Native UI confirmed Agent task started.
- Scope P01 213:348, P02 213:395, P08 213:526; edit existing children, preserve interactions and reviewed content; audit before expanding.

- Pilot completed natively in Figma, 3 text/reaction hashes unchanged (11/7/8 reactions). Visual fixes requested for hero photography/readability and blue tag semantics.
- Parent full batch returned 53 screens; independent MCP read-back confirms all 53 text/reaction hashes unchanged and 220 reaction nodes. Six representative screenshots saved. Audit caught generic container borders and red fill incorrectly applied to growth empty statistics; targeted correction is running. No code or deployment changes in this batch.

- Parent targeted corrections read back successfully through cloud after desktop locked again: month grid no longer has row capsules; empty growth has consistent red numerals on white cards, no full-page card border. Final all-53 integrity comparison has zero text/reaction drift, 220 reaction nodes. Representative screenshots pass these checks; not an assertion that all scroll/interaction states are visually accepted.
- Next native AI batch is coach page 214:2143, 83 screens; desktop manual unlock needed to send prompt. Production data/release untouched. All-page design remains incomplete; implementation/deploy not advanced past this gate.

- User unlocked again; native Figma UI confirmed coach 83-screen prompt started. Parent prior correction run explicitly reported completion in 1m7s.

- Coach 83 screens and data-management 40 screens completed native AI runs in 2m4s and 1m47s respectively. Independent all-frame hashes unchanged: coach 268 reactions, data 252. Desktop MCP screenshots show remaining corrections: D01 old dark hero; DAT01-EDIT cancel same primary-red as save; C26 dark player labels. Correction prompt is in native Agents composer but not yet confirmed started (send and Return showed no state change after connection error).

- Native UI eventually confirmed the correction prompt had started and completed in 1m9s; earlier no-change was delayed UI state, not evidence of submission failure. Desktop MCP confirms D01 bright youth-football hero with light text backing, neutral cancel vs red save, and readable white player names on dark-green tags. These three visual corrections pass. Cloud screenshot download gave TLS failures/empty response; desktop screenshot tool is reliable and will be preferred for remaining inspection.

- Final post-correction coach/data integrity audit: zero changed text/reaction hashes across 83 + 40 screens. Together with parent, 176 historical screens and 740 reaction nodes preserved. Final D01, DAT01-EDIT, and C26 screenshots saved as data-dashboard-fixed/data-edit-fixed/coach-tactics-fixed-20261004.png.
- Agents UI showed connection/saving failure and lagged native actions. Reopened conversation and attempted the model/BI prompt, but composer remained empty and no new user message or task-start was observed; do not treat model/BI as dispatched. Latest CUA explicitly returned Mac locked. Next prompt is saved locally; check existing chat for accidental late arrival before sending again.
- Remaining design: historical model16, BI9, service12, settings5, common20 (62), plus preexisting cloud model frame231:3468. No business code changes, deployments, production data/release mutations this turn.
- B0 follow-up preparation: confirmed REQ/DEC-12 and ACC-17 late entry requirement; assessment-publication spec scopes new managed workflow. Do not simply weaken legacy publication guards or extend fixture due dates. Investigate four dated legacy-route tests and migrate/guard intended workflow separately. Existing task roster filter excludes absent/leave/excused on creation, still a confirmed P0 gap.

- Resumed after unlock: previous model/BI prompt was absent from chat. Submitted saved scope once; UI explicitly confirmed Agent task started.

## 2026-10-04 全页原生 AI 设计完成与 B0 合同修复

- Figma 原生 Agents 已完成 8 个评审页的全部既有画板视觉更新；最后一批为专业服务 12、设置 5、通用状态 20。随后原生 AI 修复家长更正成功第二按钮裁切、教练月历滚动、后台布局/模块库/历史滚动及模型长节点编辑滚动。
- 独立回读 239 个既有画板（238 历史页面 + 231:3468 既有模型说明），1,066 个 reaction 节点；全部原文案 ID/内容和 reaction 哈希与恢复后的基线一致。详见 native-ai-all-screen-final-audit-20261004.json。代表截图已保存到 club-style-light-evidence；直接子节点纵向裁切扫描无遗留结果。此结论不等于逐页全部滚动/运行交互验收。
- B0：C15 创建选项与 POST 使用球队有效授权名单和课程名单交集，取消按 absent/leave_requested/excused 自动排除任务对象。GET 同步排除已失效球队成员；实际成绩课程参与校验保持严格。3 种状态参数化回归覆盖显式/默认名单、未完成进度、无效课程录入无写入、创建后转队不缩名单；另覆盖无效成员与家长越权。
- 先运行新测试确认原缺陷（4 个新增失败），再改最小路由逻辑；14 项测评工作流测试通过。全 API 测试同时确认原 4 项失败来自 2026-09 固定任务在 10 月运行，已只给这 4 个旧合同测试固定 Date 并沿用 afterEach 恢复；没有改宽旧路由规则。
- Node 24：API typecheck 通过；API 26 文件、179 测试全部通过，日志 /tmp/cq-api-b0-20261004.log。生产/远端/发布均无变更。本地界面尚未随设计更新完成。
- 继续：按 B0–B5 逐批对齐前端和数据闭环；下一步读取 C15 及选择状态的实时高保真上下文，修复来源课程锁定、长表单/选择交互与固定操作区，并验证微信运行时。后台前端、全三角色体验、develop/trial 新代码部署及微信体验上传仍未完成。

### 2026-10-04 C15 界面及运行验证增量

- 高保真来源：214:2497、234:1857、234:1918。回读确认原稿缺少“可修改任务名称”的已评审要求入口，Figma 原生 Agents 新增 495:358 设置摘要、495:363 继续/复测说明及 495:366 设置状态。原 83 个教练画板排除新增 495:* 文案后，原文本/交互哈希全部保留。新增设置画板静态已完成，native AI 报告尚无 prototype reaction；尝试发起连线指令时 Mac 再次锁屏，未确认指令发出，待解锁完成。
- 代码按四状态组织 C15：摘要、课程选择、项目学员选择、任务设置；保留当前页面路由，不新增分包页面。已预选课程可更换；失败不提交旧名单；异步过期响应不覆盖最新选择；搜索不丢隐藏选择；取消恢复原值；匹配任务默认继续，显式独立复测才创建。
- BFF 提供授权名单内的出勤状态与课程时段，白名单不含请假备注；UI 不编造演示出勤或学期。创建失败重试复用同一 payload 的幂等 key，沿用现有 30 分钟 HTTP 回放，不声称无限期/并发原子保证。接口必须返回 201 和有效 task ID 才提示成功跳转。
- 微信开发工具第一次自动发现 9428 实为其他 AppID，仅只读核验，没有导航/写入；随后显式打开本项目 9432 并确认 AppID=wx4c588cd106e520e0、develop。自动发现脚本未校验 AppID 的工具缺口记录在此，后续验证必须先比对，不能信端口文件里的 projectPath。
- 真实小程序渲染四状态并点击切换、取消和选中，检查通过。使用 mock request 返回 JSON 解析的临时合成数据，finally 恢复 request 与此前 session/context/devRole；没有访问远端业务接口。证据 c15-runtime-*-20261004.png；可重复脚本 verify-c15-design.cjs。修复微信 style v2 默认按钮更高优先级造成的居中和禁用按钮几乎不可见问题，修后截图已复查。
- 最终 Node 24 `pnpm check:delivery` exit 0：domain 26、mini 520（另 1 skipped）、API 180 全通过，类型检查/构建及本地启动环境隔离 smoke 均通过；日志 /tmp/cq-delivery-c15-final-20261004.log。`git diff --check` 通过。政策报告仅原始包体 1.57 MiB 预算预警，官方包体尚未测。
- 边界：当前只是 B0/C15 一批代码和合成运行验收；不是 B1–B5 全部完成，不是完整本地真实账号验收，更未部署/上传体验包。未操作生产数据或正式发布，未对 209 项混合改动整体提交。
- 下一步：解锁后补 Figma 新增设置入口/取消/保存返回连线并读回；继续 C03、C06、C11 已评审偏差，随后后台与其余数据闭环。真实登录、真机、远端 CI、新迁移非生产部署与体验上传仍需完成。


### 2026-10-04 解锁后 C15 原型闭环、C06 全栈增量

- Figma 原生 AI 明确表示目前不能建立 prototype，非审批拒绝。按用户已有设计/功能授权，用 MCP 只补机械导航：495:360→495:366，495:370/403/405→214:2497；读回通过，未更改视觉。证据 c15-prototype-links-20261004.json。
- 实时读取 C03/C06 高保真上下文与截图；原生 AI 将 C03 两行 100px 空白收敛为20/52px，新增 C06-TARGETS 504:359、空态504:394，入口文案504:358。随后对照新状态同步代码的计数、左侧勾选、取消/应用和空态。排课数据说明使用实际产品文案，不把 AI 的“不能猜测”工程说明展示给用户。
- 独立原型检查发现历史误连：C03“变更本次训练”226:1000与C06“核对后复制”234:3837均指向C01。已分别修正为C09 214:2344和C03 214:2203；新增选择/取消/应用/空态返回导航。旧83个教练画板在排除明确新增节点、将两条修复仅在比较数据中还原后，原文案/交互哈希全部一致。证据 c03-c06-audit-20261004.json；不把新增原型跳转等同于可持久化的 Figma 表单。
- 新增原生微信路由 `pages/coach/content-copy/index`，工作台已有复制按钮按 `canEditTraining` 跳转且携带编码的eventId。独立页按C06展示来源、目标已有内容、合并/替换、处理后预览及固定操作；目标默认未选择，最多20堂；取消恢复、卸载不回写、失败/冲突必须重读预览再操作。
- API preview新增每目标outcomes.merge/replace，由服务端同一merge函数生成；apply支持merge。按drillId防止新增重复，保留目标已存内容、顺序、时长和备注（已有重复不删除）；来源友谊赛整项排除，目标已存友谊赛保留。复用每目标事务和版本校验，不写排课/成绩/出勤/财务。来源revision覆盖引用目录定义，避免目录变更后仍套用旧预览。
- API测试两模式预览与持久化一致、重复内容目标值保留、父角色拒绝、目录改动409、陈旧目标conflict、注入SQLite失败回滚。小程序覆盖选择、取消、两种预览、版本payload、按课冲突、异常/伪成功响应、卸载、20堂上限、旧服务端缺outcomes及空态。
- Node24完整 `pnpm check:delivery` exit0：domain26、mini531 +1skipped、API182；构建/类型/启动隔离smoke通过，日志 /tmp/cq-delivery-c06-20261004.log。之后按原生AI新增选择状态调整前端，mini typecheck与两页30个定向测试通过（/tmp/cq-c06-final-targeted-20261004.log），服务端未再改；没有无理由重复全量门禁。
- 重复验证脚本 verify-c06-design.cjs：先读真实AppID wx4c588cd106e520e0/develop，临时请求mock与session，真实点选/取消/应用/切换/模拟提交反馈/空态返回均通过，finally恢复；5张 c06-runtime-*-20261004.png 已目视核对。无远端业务请求或写入，不能称真实账号E2E或已上线。
- 政策报告仍仅MP-PKG-002原始1.59MiB预算预警（412文件）；官方上传包体待测。git diff --check通过。新增路由未引入隐私能力，已更新平台差距与training-templates可执行合同。
- 当前整体仍in_progress。C03代码仍是旧布局（本次仅Figma留白/连线修复与复制入口接通），C11、临时球员/训练记录整合、后台及B1–B5其余工作、真实三角色登录、非生产部署、CI/真机/官方上传未完成。未操作生产数据或正式发布，也未归档任务或整体提交混合工作区。
- 下一批从C03真实训练事实/出勤名单/历史/临时参与/本课测评按既有节点逐步贯通，随后C11。C03的C07/C08是训练记录及更正历史，不能继续把自动计次当实测到课；既有attendance与lesson两路需按评审合同收敛后再宣称工作台完成。C04模板入口和C06的完整真实回流一起核验。


## 2026-10-04 C03/C07/C08 训练事实与运行验证

- 按09-22教练PRD C03-01纠正自动记录时点：课程结束瞬间（包含相等）即生效，替代先前未经确认的次日UTC+8假设。授权教练可用expectedRevision=0提前明确更正；家长仍只更正已有事实。自动任务不覆盖人工，取消课程会立即取消已计结果并留历史。
- Workbench增加同课程trainingRecords；C03从该事实画勾并使用单学员PATCH，禁止整班覆盖。匹配event/student/revision/count后才更新UI；冲突或未知结果阻止盲重试，刷新核对。C07一次读取名单并支持筛选/尚未生成记录；C08表单保留失败输入、显式刷新，历史显示操作者/时间/修改前后。新历史保存认证姓名和previousCounted。
- 已实时读取Figma 214:2203、214:2308、214:2325并实施明亮V2；课程信息收紧、全班名单/历史入口、本课实际任务入口、固定变更按钮。旧比赛点名仍保留；训练点名入口转统一记录页面。课堂记录、模板和复制功能保留可用。临时球员入口尚依赖B1主档能力，C03不能据此宣称整体完工。
- `verify-c03-records.cjs`仅本地合成请求：核验真实AppID wx4c588cd106e520e0+develop后，实际点按快捷勾选→名单读回→筛选→修正保存→历史前后状态，3张截图已检视。finally恢复会话/请求并回登录。首轮模拟共享对象误改前值已修成JSON边界复制；不是后端真实账户验收。
- 全量`pnpm check:delivery`通过：domain26、mini536+1skipped、API183（日志/tmp/cq-delivery-records-20261004.log）。新增教练档案按有效训练事实统计，单项回归另通过；全量检查后该小修改未重跑全量。
- 全量检查发现测试验收回滚遗漏training_records依赖；仅修代码及本地测试，按既有固定club/event集合先清其训练记录再清participants，未执行任何服务器回滚。
- 补充修正了家长训练历史文案、现行需求与spec中的结束时点口径。小程序policy仍只有原始包预算warning；不代表官方打包体积通过。
- 下一模块：C11教学档案，已读取214:2381及300:328；发现档案出勤/模块统计仍读旧participant，已改最终事实并回归。O-08多队评价归属已通过异步问题请用户明确，等待回答，不阻塞其他模块。C11视觉还未修改，评价服务尚未实现。
- 远端develop/trial未更新；未上传体验版；未改生产数据或正式发布。任务保持in_progress，不整体提交混合工作区。


## 2026-10-05 C31、C11 摘要及 C04 增量

- C31 已实现：GET coach/students/:studentId/radar 增加 confirmedResults，只读取授权队伍下已确认的原始成绩；同任务修订仅保留当前确认版本，编辑中的草稿不替换旧确认版。无可判定队伍/课程归属的旧结果保留在库中，不伪造关联展示。没有迁移或后端写入。任务/项目版本与单位分开；缺版本不画比较图；原始0和小数保留；完整历史列表保留年份，图表展示最近三次。切换同队学员采用分页原生选择器。
- C31 来源214:2887已实时回读；verify-c31-design.cjs运行与两个截图已验证。新增页面四件套/路由，未加隐私API。初次WXML编译失败因wx:else与wx:for在同一节点，已拆block修复；必须等官方CLI auto完成，不能只靠TS测试判断原生模板可用。
- C11按214:2381的红色身份区＋三张摘要落地，训练下钻按300:328实施，现有资料/能力明细保留。通过section查询参数复用路由并用原生导航栈返回，始终携带studentId/teamId。摘要只用真实档案统计；确认次数按taskId（旧结果回退assessmentId）去重，读取不到与0区分。依R12，不恢复“返回”作为红色主操作。C12/C13评价仍未实现，O-08仍待用户回应，不能把教学档案整组标为完成。
- verify-c11-design.cjs 实际点击摘要→训练/更正历史→原生返回→能力→确认成绩空态通过；3张截图已查。首轮500ms等待早于跳转完成，后续SDK超时遗留连接影响复测；仅清理本任务遗留node进程、等待官方重编译后单会话复测通过。未将工具超时认定为平台审批拒绝。
- C03快捷更正不再使正在加载的本课测评请求过期；新增异步交错回归。后端档案统计及测评课程资格都读取同一最终训练事实，手动更正不会被旧participant状态覆盖；任务对象范围仍不变。
- C04发现明确设计冲突：214:2226写“仅训练内容可选／友谊赛已排除”，但09-22 PRD C03-05与R03明确允许友谊赛选入本课，仅模板/复制整项排除，并要求编辑页沿用线上层级交互。保留该已确认交互，仅沿用浅色规范与保存按钮；没有按误文案禁用友谊赛或拆掉后台层级。Figma此误文案尚待原生AI修正。
- C04修复层级卡片与选择集合勾选不同步、无明确canEditTraining时错误开放编辑、离页后异步回写/误返回。未知保存结果保持选择，阻止盲重试，显式重新读取并核对；搜索/筛选不能抹掉该错误门禁。verify-c04-design.cjs合成请求实际点选/搜索保留隐藏选择/保存读回/返回通过，2图已查。未声称解决旧training-projects PUT并发版本及跨plan/session事务问题，后续仍需补齐该服务合同。
- 最后完整交付检查：/tmp/cq-delivery-c31-20261004.log通过，domain26、mini540+1skip、API184，构建及环境隔离启动通过。之后仅mini增量：/tmp/cq-mini-final-20261005.log为76文件546通过+1skip，typecheck与git diff --check通过。原始文件预算1.61MiB仍为warning，非官方上传包体结论。
- 所有运行验证均先核对真实AppID wx4c588cd106e520e0/develop，再临时mock请求与会话，最后恢复并回登录。不是真实账号/服务器业务E2E；远端develop/trial镜像未更新，未上传/选择体验版，未动生产数据或正式发布。
- 已读取后台登录X16 214:6845高保真（账号/密码）。后台前端及网页登录服务仍缺失；当前Bearer会话只接受app-client路径、环境守卫拒绝浏览器Referer，不能直接做个后台页面就宣称通道已贯通。后续B3需完整登录/会话/环境隔离设计与回归，禁止开放X-User-Id绕过。
- 下一顺序：C04写入版本/事务 → C12/C13（O-08）及SC01已确认正常流程/待决边界 → 对应后台登录与B1/B2管理 → 服务/BI与家长收口 → 三角色真实验收 → 审阅提交/CI/同制品develop与trial晋级 → 官方包体验证与上传选择。任务保持in_progress；222项混合工作区不整体提交或归档。


### 同批继续：C04版本与事务闭环

随后完成前述C04服务缺口：workbench返回trainingContentRevision，前端带读到的版本保存；服务端缺版本428、旧版本409，无静默覆盖。复用copy已有SQLite事务，以内部operation=edit保留直接编辑非取消课程的既有范围；copy默认仍仅未来排定课程。SQL注入失败测试证实计划、课程和内存投影一起回滚，500不泄漏数据库细节。旧客户端缺版本将不能写新版接口，必须API/新客户端同批晋级develop/trial；生产未部署，未来正式兼容方案必须另行处理。

最终完整 `pnpm check:delivery` /tmp/cq-delivery-final-20261005.log exit0：domain26、mini546+1skip、API185，类型/构建/9工具回归/三环境本地隔离启动均通过。C04新版本合成运行复验见/tmp/cq-c04-versioned-runtime-20261005.log。当前混合工作区不批量提交；未更新服务器或微信版本。下一项为评价及人员模块和对应后台，仍保留O-08未决。

## 2026-10-05 O-08 confirmed; C12/C13 and parent evaluation integration

User confirmed one evaluation per team/student and authorized completing remaining development and integration. DEC-10/REQ-EVA-001/ACC-13 updated; no further O-08 approval needed.

- Added migration 0027, atomic versioned evaluation repository, active-role/team/guardian BFF, strict input schema and OpenAPI. Snapshot authors are server resolved; historical wording retained; no-op saves create no history. Other-team edits, parent writes and revoked assignments are rejected. No score/financial mutation or legacy comment migration.
- Read current Figma context+screenshots: C12 214:2418, C13 214:2452, parent 308:489 and P08 213:526. New shared native page implements the approved cards, optional note, save, current evaluation and actual change history. Per-team selector follows newly confirmed scope. Shared R12 removes redundant bottom red “return”; native top back remains. Existing theme/assets reused.
- Wired C11 personal detail, parent current evaluation summary and growth timeline. Added explicit `evaluation` kind rather than labeling text changes as score improvements. Full P08 layout remains a later visual reconciliation; this increment only adds its existing evaluation card.
- Actual controller → real environment-aware request code → active authenticated BFF → SQLite → parent controller integration passes through a local transport adapter. This is not a real phone/network acceptance claim. Synthetic native screenshots separately verify edit/save/history/parent readonly.
- SQLite file restart, SQL failure, optimistic conflict, team separation, revocation, guardian filtering and unchanged financial/score records covered. No server migration, production access or trial upload in this increment.
- Phrase catalog currently uses the three approved C12 built-in choices; administrative phrase maintenance remains in B3. Backend authentication/frontend, SC01, remaining B1–B5 and remote real-user integration are still open. Do not mark whole task complete or deploy this increment as complete delivery.

Evaluation integration follow-up: parent growth training totals/monthly counts now read shared reconciled facts; ended-course attendance denominator stays explicit. Formed facts appear in the timeline without requiring an old completed flag; planned content is labeled 编排 rather than fabricated completion. Regression compares correction endpoint, parent statistics and the same event's timeline. Native verification additionally opens evaluation from an empty-radar growth page and from the evaluation timeline row, preserving student/team IDs. Both paths pass; no measurement prerequisite is imposed on communication history.

Final evaluation batch evidence: Node 24 `pnpm check:delivery` passed (domain 26, mini 553 + 1 skipped, API 188; 9 tooling checks and three local environment startup checks); `/tmp/cq-delivery-evaluation-final-20261005.log`. Additional HTTP SQL-failure regression passed after this run (test-only assertions). `git diff --check` passed. Policy reports only MP-PKG-002: 421 runtime files, 1.64 MiB raw budget; official compressed package remains unmeasured. Native log `/tmp/cq-evaluation-runtime-20261005.log`, four inspected screenshots under `club-style-light-evidence/`, repeatable script `verify-evaluation-design.cjs`; mocks/session restored and IDE returned to login. Whole task remains in_progress; no commit, remote deployment or WeChat upload made by this increment.


## 2026-10-05 Continued after premature module-level stop: SC01 identity/library

User challenged the premature stop. A module checkpoint does not complete the authorized full delivery task. Continued inline, retaining current Trellis task and mixed workspace.

- Implemented migration 0028 and atomic encrypted identity registration: keyed deduplication, global person / club student separation, fail-closed legacy conflict handling, unchanged team/guardian/financial facts. Active/historical server keyring is required for writes; no keys generated or configured remotely in this increment.
- Added authenticated coach list/create/detail BFF and OpenAPI; no generic idempotency replay before reauthorization. Same natural identity retry returns existing profile. Detail filters activities by current coach scope, labels roster membership separately from attendance. No exposed internal cross-club person ID or raw document.
- Read live Figma SC01 library 258:308, new 259:309 and detail 260:310. Added native shared-mode library route and C10 auxiliary entry, search/paging/create/detail, stable retry/input retention and clear-on-exit. R12 omits redundant bottom return. Observations remain an honest empty display pending authorized service-record integration, not invented sample content.
- Native verify-scout-library.cjs verifies real AppID/develop before local request fixtures; creation/readback/back and document clearing passed, three screenshots inspected, storage/request restored and returned to login. This is not real server/phone acceptance.
- Scoped API identity/route/persistence tests: 19 passed; mini controller: 5 passed. Complete delivery log /tmp/cq-delivery-scout-20261005.log. Pending async decision remains head-only vs collaborator roster editing, late-add participation confirmation, explicit temporary assessment selection; normal already-reviewed paths can proceed independently.
- Remaining SC01 work includes temporary roster add/remove/history, match/tactical coupling, explicit measurement scope, formal enrollment and shared backoffice identity resolution. B3 web auth/frontend, remaining B1–B5, real-user nonproduction integration, CI/artifact promotion and official trial upload also remain. No remote deployment, production data mutation or WeChat release change in this increment.

SC01 library verification completion: full check:delivery exit0, domain26 / mini558+1skip / API192, build/types and local runtime isolation checks passed. Then added actual scout controller + real mini request + loopback HTTP environment guard + Bearer BFF + SQLite integration: create, clear input, reopen list and duplicate create resolve same student; focused test passed. This adds one API test after the full run, no feature change. Roster mutation is not implemented or advertised complete; requested product boundary decision remains pending.


## 2026-10-05 SC01 pending decision resolved by user delegation
User explicitly delegated the rule choice using simple operation, records and fewer approvals. Adopted event-authorized collaborators (including assistants) without a second approval; explicit yes/no participation for after-end additions; explicit temporary-player assessment selection without automatic task roster drift; automatic actor/time/before-after history, optional notes. Existing facts must be corrected, not deleted. Full contract is in design.md and synced to REQ-ORG-003 / DEC-18 / ACC-03 / permission matrix. This closes the three pending questions; do not ask for the same permission again or mark O-06's unrelated issues closed. Implementation is still pending: next work is atomic temporary event roster/history, after-end training correction, match roster/tactical coupling, explicit task selection and corresponding native UI/real request regression. This decision-only increment changes no executable code or environment and makes no new runtime verification claim.


## 2026-10-09 本轮推进：临时名单与后台真实登录

最新用户要求：核对小程序/后台是否全部开发上线，未完成则继续推进。沿用现有授权和任务，不再次询问开工，不归档整体任务。

### 已实现并验证
- SC01 临时活动名单：0029、认证 BFF、单活动版本控制、当前版本重复不新增历史、批量原子回滚、软移除/原身份重新加入。活动授权的主教练/助教/协作教练可直接操作，无第二审批；自动记录操作者/时间/变化，备注可选。
- 课后补加明确选择参加/未参加，同事务保存名单和训练更正，系统重算保留人工事实；事实存在时拒绝删除并提示走更正。比赛临时人进入候选名单，不虚构上场/分钟。正式队伍/监护/账本不变。
- 小程序 C03、比赛名单接入带 eventId 的 SC01；建档与加名单部分失败明确区分，未知结果先刷新，离页回调忽略。临时成员在新建测评时单独显式选择，默认不加入必测范围，既有测评对象不自动变化。名单历史使用 UTC+8 共用时间格式。
- 本地原生 `verify-temporary-roster.cjs` 真实按钮执行与3张截图已查；结束恢复存储、请求和登录页。新增 controller/request→loopback HTTP认证BFF→SQLite回归。它们不是远端/真机验收。
- B3 新增独立后台密码登录/会话：0030，scrypt摘要、只存随机令牌哈希、环境路径限定HttpOnly cookie、八小时有效期、持久化尝试限制、每请求有效管理身份复核、退出/改密撤销。浏览器环境分支限定/backoffice，不放宽小程序Referer或允许X-User-Id登录；浏览器响应无缓存/ETag/通用幂等重放，存储错误不泄露细节。
- 新增后台真实登录页及五类只读列表（学员/球探/队伍/教练/课程活动），搜索/分页/刷新连接受权BFF。只暴露明确字段，球探与正式学员分开，无生造照片/指标或未接通操作。该页面不是完整四模块或D01工作台完成。
- 新增非生产后台账号配置CLI：仅既有备份数据库、有效管理成员、stdin私密输入；默认不覆盖旧密码，--rotate明确轮换；拒绝release，不迁移/播种/创建用户/提升权限。远端未执行，未生成真实密码。
- Playwright隔离Chromium实际登录→列表→刷新保留会话→搜索空态→退出→再次刷新回登录通过；两张截图已检视。只用临时合成数据库和本地固定前缀代理，浏览器及临时服务已清理。

### 验证证据与限度
- Node24 `pnpm check:delivery` /tmp/cq-delivery-backoffice-20261009.log exit0：domain26、mini563+1skip、API203；类型、构建、9工具检查和本地三环境启动门禁通过。其后仅新增账号配置CLI回归：/tmp/cq-backoffice-provision-test.log，1项通过（拒绝生产/缺备份/非管理员/静默覆盖，成功配置与显式轮换，无密码输出）；未将这项追加测试算入前面的203。
- 本轮先前SC01完整门禁 /tmp/cq-delivery-temporary-20261009.log通过；后来后台错误处理出现TS unknown类型错误，已显式FastifyError修复并完成上述全量复跑。CLI测试首次被macOS临时目录链接保护拒绝，改测试为realpath，没有放宽生产代码保护。
- `node --check apps/api/backoffice/app.js`、`git diff --check`通过。微信规则报告只有MP-PKG-002原始文件预算warning：426文件、1.66MiB，不是官方压缩包体通过。
- 截图 `club-style-light-evidence/sc01-event-*-runtime-20261009.png` 与 `output/playwright/backoffice-{login,data}-20261009.png`。后台登录沿用已读取X16/归档截图和浅色红主题；当前Figma云端transport失败，本地MCP get_design_context返回资源无法访问，不能声称本轮最新版全页视觉复核通过。此前原生AI设计成果保留，没有重画Figma。
- 线上只读核验 /tmp/cq-live-readiness-20261009.log：2026-10-09T08:19Z 10项路由/登记/拒绝检查通过，realWechatLoginVerified=false。SSH仅docker ps元数据：develop/trial仍cq-talent-api:trial-1224e07bf5f4，生产cq-talent-api:b050391；没有读取生产业务数据或修改远端。
- 本轮无提交、服务器迁移/重建、小程序上传/体验版切换、提审或正式发布。现有混合工作区保留，不从工作区直接宣称已发布。

### 继续顺序（没有待确认的SC01操作规则）
1. B1收口：正式/临时标识与统计口径、已有任务显式范围修改留痕、转正式与后台统一身份核对/更正。当前新建任务支持显式选择，不等于已有任务编辑已完成。
2. B3：在新认证边界下接后台业务详情/编辑/版本冲突/历史、各实体导入导出、工作台模块布局、公共内容及标准配置。当前只有五类只读目录，不能勾选DAT全功能。
3. B2/B4/B5剩余模型/标准、BI、专业服务跟进/交付和家长页面收口；复用现有事实，缺真实标准保持未配置。
4. 审阅完整依赖提交与CI、干净同SHA制品；配置非生产SCOUT_IDENTITY_KEYRING、BACKOFFICE_PUBLIC_URL及既有账号密码后，develop集成→相同制品trial→官方包体/上传/选择体验版→三角色真机验收。生产仍禁止变更。

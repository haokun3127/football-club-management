# 重庆天才小程序实现差距审计

## 1. 审计口径

审计基线：

- `docs/miniprogram-product-design-cq-talent.md`
- `docs/miniprogram-page-spec-cq-talent.md`
- `docs/miniprogram-page-blueprints-cq-talent.md`
- `docs/miniprogram-bff-gap-cq-talent.md`
- `apps/miniprogram-cq-talent`

状态定义：

| 状态 | 含义 |
| --- | --- |
| `done` | 页面、卡片、数据链路和状态基本满足蓝图。 |
| `partial` | 有页面和部分真实数据，但卡片、跳转、状态或写入不完整。 |
| `shell-only` | 只有结构或 pending 文案，不能完成主要任务。 |
| `missing` | 没有独立页面或主入口。 |
| `blocked-by-bff` | 产品已明确，但缺少必要 BFF 或生产 connector。 |

## 2. 页面覆盖矩阵

### 2.1 全局与家长端

| 蓝图页面 | 当前文件 | 状态 | 主要差距 |
| --- | --- | --- | --- |
| 启动页 | `pages/launch/index` | `partial` | 已 resolve 和 dev session；生产微信手机号绑定仍是 pending，隐藏开发切换仍存在。 |
| 登录绑定页 | `pages/launch/index` 内 pending | `blocked-by-bff` | 没有独立手机号授权交互；缺少 `wechat-login` 真实 connector 和 session refresh。 |
| 家长日程首页 | `pages/parent/schedule/index` | `partial` | 当前按单孩子 `parent/students/:id/schedule`；未用家庭聚合日历；无 Banner、日历标记、提醒入口详情。 |
| 日期活动列表 | `pages/parent/schedule/index` 内列表 | `partial` | 无类型/状态筛选，无多孩子聚合视图，无日期切换组件。 |
| 训练详情 | `pages/parent/event/index` | `partial` | 通用详情页可读事件，但训练内容、关联能力、考勤扣课和课后摘要仍是粗粒度字段。 |
| 比赛详情 | `pages/parent/event/index` | `partial` | 无比分卡、比赛事件时间线、孩子表现卡。 |
| 其他活动详情 | `pages/parent/event/index` | `partial` | 基础信息可展示；参与状态、通知卡、长说明展开未实现。 |
| 提醒中心 | 无 | `missing` | 只有“提醒待接入”标签；无列表页、已读、跳转。 |
| 成长首页 | `pages/parent/growth/index` | `partial` | 有雷达、指标、成长足迹和训练历程结构；里程碑和训练历程仍来自 pending 聚合。 |
| 能力雷达图 | `pages/parent/growth/index` | `partial` | 有 Canvas；无雷达视图选择、样本说明和点位高亮细节。 |
| 指标详情/下钻 | `pages/parent/metric/index` | `shell-only` | 只有 pending 状态；无趋势、来源记录、相关训练项目。 |
| 我的孩子/孩子档案 | `pages/parent/child/index` | `partial` | 孩子档案和状态摘要可读；服务入口均在单页内展示，缺少独立详情。 |
| 课时与保险 | `pages/parent/child/index` 内卡片 | `partial` | 无独立详情页、最近变动、保单脱敏和局部刷新。 |
| 俱乐部信息/球场/帮助/教练团队 | `pages/parent/child/index` 内 pending | `shell-only` | 内容中心 BFF 和页面均未实现。 |
| 私教意向 | `pages/parent/child/index` 内按钮 | `shell-only` | 当前 `showToast` pending；无表单、孩子选择、联系方式确认和提交状态。 |
| 账号绑定 | `pages/parent/child/index` 内文案 | `shell-only` | 无绑定状态详情、手机号脱敏、最近登录和异常处理页。 |

### 2.2 教练端

| 蓝图页面 | 当前文件 | 状态 | 主要差距 |
| --- | --- | --- | --- |
| 教练日程首页 | `pages/coach/schedule/index` | `partial` | 有活动列表和工作台入口；无周视图、待办筛选、新建入口和记录完善度筛选。 |
| 活动工作台 | `pages/coach/event/index` | `partial` | 有活动信息、名单、动作区；缺少按 workflow 禁用、训练内容入口、战术板入口和学员能力跳转。 |
| 新建/编辑/取消/恢复活动 | 无 | `missing` | 没有页面或 pending 入口；相关 BFF 也未定义。 |
| 点名 | `pages/coach/attendance/index` | `partial` | 能保存名单，但无法切换单人状态、批量到课、备注、免扣或本地草稿。 |
| 销课确认/纠正 | `pages/coach/lesson/index` | `partial` | 能确认和返还/补扣；确认前不能点掉不销课学员，缺少例外原因和余额预览。 |
| 比赛录入 | `pages/coach/match/index` | `partial` | 只录比赛摘要和比分；没有出场名单、进球、助攻、关键事件、球员点评。 |
| 战术板入口 | 无 | `missing` | 无 PoC 状态页或入口；可作为 P2。 |
| 训练管理首页/我的球队 | `pages/coach/training/index` | `shell-only` | 有页面壳；训练项目树 BFF 已补齐但前端未接，当前仍显示 P0 待接入。 |
| 球队详情 | 无 | `missing` | 无队伍信息、学员列表、近期活动和能力概览页。 |
| 训练内容选择与能力覆盖 | `pages/coach/training/index` 内 pending | `shell-only` | 未调用 `training-project-tree` 和保存接口；能力覆盖预览 BFF 未接。 |
| 测试任务/按项目录入 | `pages/coach/test-entry/index` | `partial` | 支持按模板手动提交；无测试任务列表、缺测、单格自动保存。 |
| 学员雷达/全队能力概览 | `pages/coach/training/index` 内占位 | `shell-only` | 当前用 0 值占位雷达，存在误导性展示风险；缺少 BFF。 |
| 评测录入 | `pages/coach/test-entry/index` | `partial` | 原子项手动提交可用；computed 项只读、草稿、异常值、缺测和任务模型未完成。 |
| 教练我的 | `pages/coach/me/index` | `partial` | 身份、球队、权限为基础展示；私教意向、操作帮助、账号绑定均为文案占位。 |

## 3. 卡片与交互矩阵

| 页面/区域 | 已实现卡片 | 缺失或不完整卡片 | 交互风险 |
| --- | --- | --- | --- |
| 启动/登录 | 品牌状态、错误重试、dev session | 手机号授权、身份异常处理、session refresh | 生产登录仍不可用；dev 切换必须保持隐藏且不可进生产。 |
| 家长日程 | 孩子切换、活动列表、状态视图 | Banner、家庭日历、类型筛选、提醒入口详情、同步状态 | 只能看单孩子，不满足家庭聚合叙事。 |
| 家长活动详情 | 基本信息、通用 section、pending | 训练内容、比赛事件、孩子表现、通知、地点导航 | 训练/比赛/其他没有差异化详情结构。 |
| 家长成长 | 孩子切换、雷达、指标列表、足迹、训练历程 | 雷达视图选择、来源跳转、样本说明、趋势 | 指标详情是 shell，无法形成成长闭环。 |
| 我的孩子 | 档案、课时保险、服务、私教、账号文案 | 课时保险详情、内容中心、私教表单、账号绑定详情 | 私教主操作是 toast-only。 |
| 教练日程 | 负责范围、活动卡、进入工作台 | 周视图、待办筛选、新建活动、记录完善度跳转 | 日程还不是训练现场工作队列。 |
| 活动工作台 | 活动信息、记录完善度、操作区、名单、pending | 按权限禁用、训练内容、战术板、学员能力跳转 | 操作入口固定展示，未完全按 workflow/capabilities 裁剪。 |
| 点名 | 名单、保存按钮、提交中 | 单人状态切换、批量到课、备注、草稿、失败保留 | 保存当前名单可能没有实际修改能力。 |
| 销课 | 默认全员确认、返还/补扣纠正 | 确认前例外、不销课原因、余额预览、超期状态 | “点掉不销课学员”核心流程未实现。 |
| 比赛录入 | 比赛类型、状态、对手、比分 | 名单、进球、助攻、关键事件、球员点评 | 不能记录用户明确要求的进球/助攻。 |
| 训练管理 | 我的球队、当前活动、pending 雷达、测试入口 | 训练项目树、已选项目、保存、覆盖预览、应用未来课程 | BFF 已有但前端未接；0 值雷达会误导。 |
| 评测录入 | 模板、学员、输入表、提交 | 测试任务列表、缺测、自动保存、草稿、computed 只读区 | 手动提交可用，但现场录入效率不足。 |
| 教练我的 | 身份、球队、权限、私教和账号占位 | 私教提醒列表、帮助、绑定详情 | 只读信息页尚不完整。 |

## 4. BFF 对接矩阵

| 能力 | 当前前端使用 | BFF 状态 | 审计结论 |
| --- | --- | --- | --- |
| resolve/capabilities | `resolveClient` | 已有 | 可用；主题、roleEntrypoints 还未充分驱动 UI。 |
| 微信真实登录 | launch pending | P0 缺 connector | 阻塞生产；审计不要求本轮实现。 |
| 家长孩子列表 | `getParentChildren` | 已有 | 可用。 |
| 家庭聚合日程 | 未使用 | 已补齐 | 前端仍用单孩子 schedule，应改为 parent calendar。 |
| 家长活动详情 | `getParentActivityDetail` | 已有 | 可读，但字段粒度不足以支撑蓝图所有卡片。 |
| 成长摘要 | `getParentGrowth` | 已有 | 可用；里程碑、训练历程仍需独立聚合。 |
| 指标详情 | metric shell | P1 缺口 | 必须补 BFF 后才能实现下钻闭环。 |
| 内容中心 | child pending | P1 缺口 | Banner、帮助、球场、教练团队共用内容 BFF。 |
| 私教意向 | `pendingWrite` | P2 缺口 | 当前 toast-only，不能算实现。 |
| 教练 home/workbench | 已使用 | 已有 | 可用；权限上下文仍不细。 |
| 训练项目树/保存 | 未使用 | 已补齐 | 前端过期，仍显示 P0 待接入，应进入 P0/P1 开发队列。 |
| 能力覆盖预览/应用未来课程 | 未使用 | P1 缺口 | 不阻塞保存训练内容，但阻塞完整训练管理体验。 |
| 点名写入 | 已使用 | 已有 | 写入可用；前端缺少可编辑状态。 |
| 销课确认/纠正 | 已使用 | 已有 | 写入可用；前端缺少确认前例外选择。 |
| 比赛摘要 | 已使用 | 已有 | 最小可用；进球/助攻/事件缺 BFF 或字段扩展。 |
| 评测表单/提交 | 已使用 | 已有 | 手动提交可用；缺任务、缺测、自动保存。 |
| 教练我的/权限上下文 | 未使用 | P1 缺口 | 当前只用 coach home 拼出我的页。 |

## 5. 缺失独立页面清单

这些页面不应长期用 toast、单页卡片或普通 pending 文案替代：

| 页面 | 当前替代 | 优先级 | 验收条件 |
| --- | --- | --- | --- |
| 提醒中心 | 家长日程 “提醒待接入” 标签 | P1 | 有列表、分类、未读、跳转和 pending 状态。 |
| 课时与保险详情 | 我的孩子内嵌卡片 | P1 | 展示余额、变动、保险状态、同步说明；无支付投保入口。 |
| 俱乐部内容中心 | 我的孩子内 pending 文案 | P1 | 可进入俱乐部信息、球场、帮助、教练团队。 |
| 私教意向表单 | `showToast` | P2 | 有孩子选择、期望内容、联系方式确认、提交状态。 |
| 账号绑定详情 | 我的孩子/教练我的文案 | P1 | 展示绑定、手机号脱敏、最近登录、异常说明。 |
| 新建/编辑/取消/恢复活动 | 无 | P1 | 无接口时也要有权限说明页或入口隐藏规则。 |
| 球队详情 | 无 | P1 | 展示队伍、学员、近期活动、能力概览、待办。 |
| 训练内容选择 | 训练管理内 pending | P0 | 使用训练项目树、已选项目、保存到活动。 |
| 战术板入口 | 无 | P2 | 至少有 PoC 状态卡，不阻塞比赛录入。 |
| 测试任务列表 | 直接进入模板录入 | P1 | 有任务、进度、截止时间和项目录入入口。 |

## 6. 开发任务队列

### 6.1 P0

| 任务 | 入口 | 依赖 | 验收条件 |
| --- | --- | --- | --- |
| P0-1 家长日程改为家庭聚合 | `pages/parent/schedule`、`utils/api` | `parent/calendar` 已补齐 | 多孩子同日活动可见；日期/类型筛选可用；不再提示家庭聚合 BFF 待补齐。 |
| P0-2 教练点名可编辑 | `pages/coach/attendance` | attendance BFF 已有 | 支持批量到课、单人到课/迟到/缺席/请假/免扣、备注、提交中和失败保留。 |
| P0-3 销课确认前例外选择 | `pages/coach/lesson` | lesson-confirmation BFF 已有 | 默认全员销课；可点掉不销课学员并填写原因；余额未知时标 pending。 |
| P0-4 训练内容树接入 | `pages/coach/training` 或新增训练内容页 | training-project-tree、PUT training-projects 已补齐 | 可浏览能力树、选择项目、查看已选、保存到活动；移除 P0 待接入误导文案。 |
| P0-5 比赛进球/助攻事件录入方案落地 | `pages/coach/match`、BFF gap | match event BFF/字段扩展 | 至少支持进球、助攻、关键事件、学员选择和分钟；若 BFF 未补，则页面保留结构并明确 blocked。 |
| P0-6 清理误导性假雷达 | `pages/coach/training` | 无 | 不再用 0 值雷达模拟能力覆盖；缺数据时用 pending/empty 状态。 |

### 6.2 P1

| 任务 | 入口 | 依赖 | 验收条件 |
| --- | --- | --- | --- |
| P1-1 活动详情按类型拆卡 | `pages/parent/event` | event detail 字段扩展 | 训练、比赛、其他展示不同卡片；无字段显示待同步，不混成通用摘要。 |
| P1-2 指标详情下钻 | `pages/parent/metric` | ability-metrics BFF | 趋势、来源记录、相关训练项目可见；不展示公式权重。 |
| P1-3 内容中心与账号详情 | 新增 parent/coach 内容页 | content、me/session BFF | 俱乐部信息、球场、帮助、教练团队、账号绑定可独立进入。 |
| P1-4 教练日程工作队列 | `pages/coach/schedule` | coach home/workbench | 有周视图、待办筛选、记录完善度入口。 |
| P1-5 训练覆盖预览与应用未来课程 | 训练内容页 | preview/apply-forward BFF | 后端返回覆盖结果；应用未来课程需二次确认。 |
| P1-6 测试任务与缺测/自动保存 | `pages/coach/test-entry` | assessment-task BFF | 有任务列表、缺测、单格保存、失败重试和本地草稿。 |
| P1-7 教练我的真实 BFF | `pages/coach/me` | coach/me、permission-context | 不再用 coach home 拼身份；权限范围来自后端。 |

### 6.3 P2

| 任务 | 入口 | 依赖 | 验收条件 |
| --- | --- | --- | --- |
| P2-1 私教意向完整表单 | parent child 或独立页 | private-lesson-interests BFF | 表单提交成功后有状态，不生成订单或排课。 |
| P2-2 战术板 PoC 入口 | coach event/match | tactical-board BFF | 有 PoC 状态、阵型模板和不可用说明。 |
| P2-3 提醒中心高级能力 | parent notifications | notifications BFF | 分类筛选、已读、跳转和公众号提醒状态。 |
| P2-4 Figma 动效对齐 | 全局组件 | Figma handoff | 卡片按压、Tab 切换、雷达绘制和提交反馈符合设计。 |

## 7. 审计结论

当前小程序已经具备可运行 MVP 骨架：启动、家长三 Tab、教练三 Tab、活动详情、点名、销课、比赛摘要、评测手动提交均有基础实现，并且请求封装已走 app-client BFF 和幂等头。

但它还没有 100% 满足产品文档：核心差距集中在家庭聚合日程、教练现场操作效率、训练内容树、比赛进球/助攻事件、指标下钻、内容中心和若干独立详情页。后续开发必须先按 P0 队列补齐主流程，再做视觉细节和 P2 体验增强。

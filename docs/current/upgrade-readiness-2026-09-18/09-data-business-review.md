# 数据架构与业务流程评审（第一轮）

> 2026-09-20：本文件保留当时取证/设计状态；当前业务目标以产品需求 v1.2 及 [16号修订规格](16-confirmed-rules-and-engineering-spec.md) 为准。三层区间映射、前台余额隐藏及自由拖放战术尚未改入 Figma，不得将旧画板当成新需求已验收。

日期：2026-09-18。评审对象：产品需求 v1.1、此次全栈准备文档、Figma 首版和当前代码的关键复用路径。代码基线：`cccd8d57e16c985c8cb1063c1d94e84849b7781f`，工作区原有未提交变更保留。

## 结论

**整体架构方向可保留，但尚不具备按当前设计直接全面实施的条件。** 原生小程序、共用业务服务、SQLite 持久化、后台四模块的方向可以支撑目标；当前问题主要是业务事实、状态转换和新旧行为切换的契约没有闭合，而非必须更换技术栈。

本轮提出 **7 项发现：5 项 P1、2 项 P2**。P1 是对应核心链路实施前必须闭合的设计/迁移缺口，不是声称线上已经发生事故；P2 应在相关流程开发前修订。未发现有证据支持的 P0 线上事故。

此前“52/52 需求映射、130 画板、568 动作”只能证明覆盖数量和部分结构有效，不能证明业务可达、数据能贯通或验收已通过。本轮发现实际流程断点，因此不能继续将“全量设计首版”解释为“完整可开发规格”。

## 评审方法与边界

主会话按数据架构、领域规则、业务操作和迁移兼容四个视角完成评审；当前 inline 配置禁止派发 implement/check 子代理，本报告不是多位独立评审人的联合意见。

本轮重新读取权威需求、准备方案和相关源码，实读 Figma 的 C16/C18/C19/C20/C22/C23、D10/D13/D20、M09/M11 节点及原型连线，查看 C18/C20/M11 的新截图；相关结构证据见 [review-evidence.json](review-evidence.json)。其余页面以本轮读取的清单为线索，不声称全画布逐操作验收。

没有修改业务代码或设计节点，没有请求生产业务写接口，没有执行 62 条软件验收。下文“反例”是依据代码和契约的桌面推演，须在实现后转成实际测试。未取得的业务规则仍保持 O/P 状态。

## 发现

### R1 · P1：原始值到评分模型的复用边界没有落实，会把量纲带错

**证据。** [候选方案](/Users/dongjun/projects/football-club-management/docs/current/upgrade-readiness-2026-09-18/02-data-api-permissions.md:25)要求支持秒、次数并复用现有模型能力，但未说明如何替换旧值适配。现有 [assessment-services.ts](/Users/dongjun/projects/football-club-management/packages/domain/src/assessment-services.ts:139)在未提供 normalizedScore 时回退到原始数值；[后续模型输入](/Users/dongjun/projects/football-club-management/packages/domain/src/assessment-services.ts:249)又把该数值包装成单位 score。现有工作流的[类型限制](/Users/dongjun/projects/football-club-management/apps/api/src/application/assessment-workflow.ts:96)目前会挡住秒数输入，因此这不是宣称新界面已经造成线上错分，而是升级时仅放开类型就会暴露的复用风险。

**反例与后果。** 为“20米跑”放开 duration_seconds 后，把 4.28 秒传给原有发布路径，未提供正式换算时可能作为 4.28 个评分单位进入图计算；次数同理。这破坏原始值、标准分和模型输出的区别，也可能令越低越好的项目按错误方向参与计算。

**修订建议。** 为旧标准分保留明确兼容适配器；新原始记录必须保留值类型、单位和采集定义版本。只有已指定的规则才可产生标准分；也允许模型明确直接消费带单位原始值，但不能隐式改成 score。补充无模型、缺输入、计算失败、已计算但未发布的状态矩阵，明确原始结果确认的条件，避免 O-04 使所有已有效采集的原始值都无法使用。

**关闭证据。** 在 ACC-21/41/42/55 中验证：4.28 秒保持秒，18 次保持次数；无批准换算不生成综合分；旧评分任务仍可读取；模型失败不伪造结果，草稿和家长发布互不串状态。

### R2 · P1：当前名单、课程名单与测评任务名单尚未形成三个独立的数据边界

**证据。** [领域原则](/Users/dongjun/projects/football-club-management/docs/current/upgrade-readiness-2026-09-18/02-data-api-permissions.md:7)已提出历史名单可追溯，但后续候选接口没有任务名单版本、必测要求版本和显式名单调整的契约。现有 [roster()](/Users/dongjun/projects/football-club-management/apps/api/src/application/assessment-workflow.ts:29)每次取当前 active 队员，summary 和写入权限均依赖它；[AssessmentTask](/Users/dongjun/projects/football-club-management/apps/api/src/data-capability/types.ts:628)仍是单 teamId。M09 已画出多队下发，却没有落实到主任务/执行范围如何组织。

**反例与后果。** 月初下发 19 人任务，月中一人转队、一人加入：旧任务分母和写入对象随当前名单改变，转出的未测人员可能从待办消失，新增人员被带入旧任务。临时参训如果为满足现有接口而加入长期队伍，则会污染正式人数和授权范围。多队学员如何去重也未定义。

**修订建议。** 明确人员身份、长期成员关系、当次参与名单、任务参与者分别引用什么键，分别由什么操作更新。候选为任务下发保存参与者及项目定义版本，多队下发保留授权执行范围；采用一个主任务还是批次下多个队任务可以评估，但必须固定跨队重复人员的归属和汇总规则。历史对象存在不代表历史教练永久获权，读取/补录应同时检查当前明确授权。名单调整、临时人员测评和跨队去重按 O-06 决定，不能由开发者靠当前 active 列表暗中决定。

**关闭证据。** ACC-14/17/18/22/36/45/52：转队不静默改变旧任务，名单调整有版本与原因，临时参训不自动转正式，跨队对象不泄露，任务进度与明细一致。

### R3 · P1：逐人逐项课程来源没有贯穿录入、核对、修订和持久化

**证据。** [候选 PATCH](/Users/dongjun/projects/football-club-management/docs/current/upgrade-readiness-2026-09-18/02-data-api-permissions.md:42)已经把 eventId/measuredAt 放到 entries，这是正确方向。但 [C18](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-724)只有一处统一关联课程，没有行级选择/例外入口；[C19](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-728)说“应用到所选记录”却没有表达选中了哪些人。 [C20](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-732)将两个项目汇总为9月12日一堂课，而 [M11](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-52)已表达传接球发生在9月10日。

代码也需相应迁移：[AssessmentEntry](/Users/dongjun/projects/football-club-management/apps/api/src/application/assessment-workflow-types.ts:3)只有项目和值；[变更判断](/Users/dongjun/projects/football-club-management/apps/api/src/application/assessment-workflow.ts:108)只比较 value；[metric 记录生成](/Users/dongjun/projects/football-club-management/packages/domain/src/assessment-services.ts:220)使用整份 assessment 的共同时间及 eventId。

**反例与后果。** 同一个人跑步在 T1、传接在 T2，另一人在 T3：当前核对页无法准确表达和纠正。只改课程/日期而分值不变，若沿用旧判断就会被当成无变化；趋势与“最新”可能继续按错误日期展示。

**修订建议。** 行级成绩统一带实际课程、发生时间和定义版本；批量默认值只作用于明确选中的记录，并可逐条改例外。确认页逐项列原值、单位、课程、日期、保存状态；修订页允许更正来源。修订比较覆盖值、课程、日期及相关定义，而非只比较数值。将条目来源贯穿到持久化原始记录、模型血缘与成长查询。

**关闭证据。** ACC-16/17/20/57：两人三课、同人不同项目分课、只改日期、补录早期成绩、修订后重新确认，均保留真实来源且不产生虚假的一次新测评。

### R4 · P1：兼容期未明确关闭旧扣余额写入，新增课次服务还不能形成唯一写入口

**证据。** [迁移方案](/Users/dongjun/projects/football-club-management/docs/current/upgrade-readiness-2026-09-18/03-migration-and-deployment.md:25)要求兼容旧客户端并保留旧入口，但没有旧写接口逐项处置表。除了已列出的 [lesson-confirmation](/Users/dongjun/projects/football-club-management/apps/api/src/routes/app-client.routes.ts:2925)，[recordEventParticipants](/Users/dongjun/projects/football-club-management/apps/api/src/store.ts:2125)也会为 present/late 调用扣课账本，两者 sourceId 前缀不同；[账本逻辑](/Users/dongjun/projects/football-club-management/apps/api/src/store.ts:1693)确实计算余额变化。这里是课包 ledger 副作用，不是银行支付。

**反例与后果。** 新日期任务已产生轻量课次，仍在使用的旧小程序发送点名/确认，旧链路继续改变课包余额；即使新表自身唯一，也不能阻止另一写入口产生不同含义的事实。单纯重定向新前端页面不能控制已发布旧客户端。

**修订建议。** 在启用新语义前，列出点名、lesson-confirmation、lesson-adjustment、后台/导入等所有写入路径，逐一规定停写、只读提示或适配到新命令。保留旧账历史与允许旧账继续写入是两件事。按俱乐部业务模式在服务端执行一致策略；不能仅依赖客户端自报能力。无法无歧义适配的旧动作应返回明确兼容错误并指向升级路径。回退开关同样不得重新开启已被新业务禁止的账本副作用。

**关闭证据。** ACC-53/54/58/59，加旧版本请求回放：新模式下所有旧入口不再自动改外部课包，重复请求不新增课次；保留历史仍可追查。对启用和回退都做验证。

### R5 · P1：取消课程后的“当前有效课次”缺少统一优先级和并发边界

**证据。** [候选当前记录](/Users/dongjun/projects/football-club-management/docs/current/upgrade-readiness-2026-09-18/02-data-api-permissions.md:17)含 counted 和 explicitOverride；[下一段](/Users/dongjun/projects/football-club-management/docs/current/upgrade-readiness-2026-09-18/02-data-api-permissions.md:21)只明确取消时统计排除课程。方案没有说明取消后详情接口的 counted、正在编辑的 revision 和人工保护如何一起变化。权威 [STATE-02](/Users/dongjun/projects/football-club-management/docs/current/product-requirements/03-data-and-permissions.md:124)已要求取消不销课、原记录与取消变更保留，因此不应把该问题重新归为“是否取消计课”的业务待决。

**反例与后果。** 教练手工改为已计课次，管理员随后取消课程；BI按活动状态排除，但详情若直接返回 current.counted=true，就出现两个当前结果。另一端拿取消前版本保存，若只校验记录 revision 而不校验课程状态，仍可能写回已计课次。

**修订建议。** 区分“人工选择/历史事实”和“当前有效计次”，全部读端复用同一个有效结果计算。课程取消优先使有效计次为否，保留原人工选择与取消历史；写命令在事务中核对活动状态/版本和记录版本。请假、补假、改回计次都属于明确用户动作；后台自动补跑不得覆盖它们。取消后恢复如何重算、是否延续旧人工选择仍按 O-14 形成明确规则，不能悄悄重用历史 true。

**关闭证据。** ACC-58/59/60/61：取消与人工保存并发、取消后补跑、请假后改回、撤回请假；列表/详情/统计同一有效结果，历史完整且余额不变。

### R6 · P2：关键业务动作存在画板，但主流程入口或后续步骤未闭合

**本轮直接读取的证据：**

- C16“按学员录入”“按项目录入”是文字，现有主按钮只连到项目清单；未提供从此页进入逐人列表的可达路径。
- C23“标记不测评”画板存在，但遍历整个教练页的直接导航动作，未发现指向它的入口。这里不扩大为整个文件绝无链接，也不否认可以手工选择画板展示。
- D10“维护成员”连到 D04“编辑学员”，后者未表达成员关系生效/结束时间或临时名单边界，容易把主档编辑当成关系维护。
- D13“预览安排”无原型动作；M09“预览下发”直接进入采集明细 M10，没有名单/必测范围确认步骤。

**后果。** 操作者无法按主流程演练完成不测评处理、按人采集以及上游名单/排课创建。链接目标存在的结构检查会通过，但核心工作仍断开。

**修订建议。** 补充最少必要的列表、抽屉或确认态，不必为增加画板数量而另建大量页面；明确入口、对象、可选动作、保存后去向和失败恢复。不测评的撤销/重开按 O-06 保持显式边界。成员维护更新关系，临时参训更新当次名单，不通过改主档字段混用。

**关闭证据。** 从工作台开始按 ACC-14/18/19/34/54 的正常用户路径走通，不允许评审者靠手工跳转独立画板来补流程。原型验收与实现验收分别记录。

### R7 · P2：同一截止时间不足以保证 BI、明细与导出来自同一版数据

**证据。** [BI 契约](/Users/dongjun/projects/football-club-management/docs/current/upgrade-readiness-2026-09-18/02-data-api-permissions.md:47)只列相同筛选/截止时刻，[一致口径](/Users/dongjun/projects/football-club-management/docs/current/upgrade-readiness-2026-09-18/02-data-api-permissions.md:66)提出缓存失效及 processing/dataAsOf，但未规定不同请求读取哪个事实版本。大量“当前结果”允许修正，单纯传日期过滤不能冻结记录内容。

**反例与后果。** 09:00 看训练次数，09:01 家长修正一堂课，09:02 导出同一学期：筛选日期相同，数字可能不同。异步投影还可能出现卡片已更新、明细未更新。界面只有一个截止日期无法说明差异。

**修订建议。** 给查询结果可识别的数据版本/快照标识，明确导出是复用当前视图版本，还是刷新后显示新的版本。小规模可在短读事务内物化导出输入或固定结果集，无须因此建设复杂数据仓库；异步投影要返回真正已处理到的版本及状态，不能只填服务器当前时间。

**关闭证据。** ACC-37/48/53：查询与导出之间发生修正、投影处理失败/重试、跨页读取，结果可复现或清楚声明刷新后的新版本，不能表面同口径而内容不一致。

## 数据流与业务合理性判断

| 核心链路 | 判断 | 本轮关键依据 |
| --- | --- | --- |
| 人员 → 长期关系 → 当次名单 → 日程 | 方向正确，尚缺关系变更/快照/授权契约 | R2、R6 |
| 日期默认 → 请假/修正 → 有效课次 → 统计 | 符合减轻教练工作目标，需统一写入口和取消优先级 | R4、R5 |
| 项目采集 → 每项课程日期 → 个人确认 → 成长 | 需求合理，但数据粒度与画板尚未贯通 | R1、R3、R6 |
| 项目/模型/标准版本 → 计算 → 发布 | 分层方向正确，旧原始数值回退评分不可直接沿用 | R1 |
| 业务更正 → BI/明细/导出 | 共用口径正确，需增加版本一致性契约 | R7 |
| 咨询 → 分派 → 承接 → 执行/交付 | 当前轻量流程方向合理，保留 O-13 服务规则 | 本轮文档检查；未逐状态实测 |
| 导入 → 预览 → 确认 → 来源/重试 | 已有基本设计；按对象定义模板和字段来源仍是 O-05/实施门禁 | 本轮读取 D18—D22、接口候选；未实测导入 |

值得保留的业务边界：请假与课次修正直接生效、自动课次不冒充实测出勤、评价不强制逐课填写、测评采集与家长发布分开、专业服务不默认支付结算、成长不做同伴排名。这些可以降低不必要的操作负担。

## 修订顺序与开发准入

1. 先补 R1—R5 的最小数据关系和状态转换契约：键、版本、操作、权限、事务、失败和迁移策略。优先处理测评原始值、名单范围、成绩来源及旧写入口。
2. 以同一组情景数据修订 R3/R6 涉及的 Figma 流程，补齐能走通的入口与核对步骤，避免图与 API 分别定义事实。
3. 补 R7 查询/导出一致性策略，再实施一条培训闭环和一条成长闭环，跑对应 ACC 与权限反例后扩展到其余页面。

可以继续的工作：隔离环境、既有基线、只读现状盘点和不依赖未决规则的基础准备。暂不建议按130页分头平铺实现；应先让一名学员从建档排课到课次更正、从多课测评到个人确认和成长展示完整走通。

本轮仅提出评审及可验证的关闭条件，未把 P/O 擅自转为已确认。评分手册、导入样表、服务细则仍由各自负责人补充；本报告中的工程缺口不能简单归入这些业务待决项而延后处理。

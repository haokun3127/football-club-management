# 按钮、BFF 与数据流程核对（2026-09-23）

本报告是本地工作区的静态核查，不调用生产 API，不宣称已通过端到端运行验收。106 条路由和 56 个现有小程序页面的 217 个事件绑定已提取到 local-contract-inventory.json；该提取器采用词法匹配，不是完整调用图。Figma 新操作是否全部连通另以设计回读证据为准。

状态：复用＝已有可辨认入口/服务；改造＝已有实现与新合同有差距；待补＝此次检索范围未找到完整能力，不等于整个后端不存在。后台独立前端尚未在仓库发现；不能把设计表格当作已实现后台。

## 已核验的关键差距

| 页面/动作 | 现有入口和服务证据 | 数据链及判定 | 后续实现完成证据 |
|---|---|---|---|
| P01 切孩子/首页 | api.ts getParentChildren/getParentStudentHome；app-client.routes.ts:172,977 | guardian→student→timeline/metrics；复用。首页当前含status与sync，需去除课包等不需展示字段，补实际里程碑与Banner | 每个绑定孩子隔离、越权403、切换后不串数据 |
| P02 周月/孩子筛选 | getParentCalendar；app-client.routes.ts:1791 | 服务端按event.id合并孩子及participants，已有31日范围校验；补月历跨月可见格分段/范围策略、冲突/变更信息 | 日期保持、同event去重、不同孩子各自请假 |
| P03–07/P12 请假/更正/历史 | 现有事件参与与课时入口；store.ts:2120 recordEventParticipants | **改造：present/late仍触发recordLessonAdjustment debit -1**。培训事实必须与账本切断；新自动生成及双方更正历史需完整实现 | 重试不重复、取消不计、人工优先、并发保留输入、账本不变 |
| P08–11/C31/C33 能力/下钻/趋势 | growth-summary:1257、ability-metrics:1202、coach/students/:id/radar:2222、team/ability-overview:2286 | 复用指标图与metricRecords；现有overallScore/peerAverage不能冒充新映射和默认成长组合；行级课程日期/版本可比/缺测需补 | 每维来源日期/单位/版本，1–2维不用雷达、未测非零 |
| P14–15 自动里程碑/分享 | 本次 routes/application/data-capability 检索未见完整 milestone 规则及达成管线 | 待补：课堂事实/确认成绩→版本规则→唯一达成→同一分享对象；不以课堂配置推断实测动作次数 | 去重、规则变化/历史更正策略、无事实不颁章 |
| P16–17/Banner | getContentArticles + content routes | 复用内容，补后台图片/受控目标配置与预览，不默许任意外链 | 不可用目标有降级，点击同一文章/服务 |
| P18–20/P27–28 咨询 | createPrivateLessonRequest/getPrivateLessonRequests；parent/private-lessons | 复用咨询对象；补页面对象/状态回读与后台服务流衔接，咨询不等于预约或付款 | 创建幂等、对象归属、列表/详情同ID |
| P21–26 资料/快捷/消息/帮助 | parent/children、family、reminders、getContentFaqs、getClubCoachTeam | 复用；reminders仍声明lesson_credit_low，需按新前台合同清理；快捷保存/消息深链逐项验证 | 身份切换清理作用域，消息定位正确孩子和最终安排 |
| P29–30 场地/导航 | getVenues；venues:2726 | 已有列表与名称匹配统计；补稳定场地/场区关系、持久化维护和有效坐标，不伪造导航 | 无定位/空搜索/返回来源/坐标合法 |
| P31/C24/C25 正式比赛 | coach/events/:id/match:1567、match/events:737、match.routes.ts | 复用事件/比赛/事件记录，补队伍列表、赛制/组别/秩序册；空比分与0:0区分；友谊赛属训练 | 赛前/进行中/赛后与记录权一致，两个入口同对象 |
| C01 日期日程/跨日未完 | getCoachHome；app-client.routes.ts:2039 | **改造：tasks由所查dates的events.map(buildCoachTask)构建**；需独立按授权范围聚合跨日task，选队但不按日历日期过滤 | 一任务多课去重、本人范围、真实截止与周期分离 |
| C02 队伍选择 | coach/preferences GET/PUT:1416,1445，getCoachTeam | 复用偏好/队伍，补多队有效授权集合、最少一队、撤权校正；无队伍不能伪造 | 登录/俱乐部隔离，授权变化读回 |
| C03/C07/C08 出勤 | workbench:1481、saveCoachAttendance及store.recordEventParticipants | 保留名单与事件身份；新增自动出勤/非财务修正/版本与历史，不沿用旧销课语义 | 课后不需开页自动生效、双方一致、人工优先 |
| C04–06/C30 内容/模板/复制 | training-project-tree:1871、training-projects:1956、buildTrainingContentTree | 复用树/课程内容保存；补模板复制排除友谊赛、目标已有内容差异和真正保存路径 | 避免静默覆盖、只复制允许项、回读实际配置 |
| C09 单课变更 | createCoachEventChangeRequest、app-client.routes.ts:2393起 | 已有change request；最终直接生效/审批仍业务待决，设计不能擅自给定结果 | 核准流程后验证仅改地点及变更历史 |
| C10–13 学员/评价 | getCoachTeam/getCoachStudentRadar、buildStudentTrainingStats | 复用名单/能力；三块整合与评价历史需补；late存在不代表早退事实存在 | 同一学员身份、真实统计、无课包、缺项不造值 |
| C14–19/C32 随堂创建/采集 | createCoachAssessmentTask、assessment-tasks、projects/:id/entries | 已有任务/项目录入；补部分对象、原任务匹配、课程上下文、来源标签与可补录边界 | 创建直入、复测独立、参与变化不静默改任务对象 |
| C18/C19 行级课程 | AssessmentEntry in assessment-workflow-types.ts:3 | **改造：entry仅testItemId/metricId/value，无eventId**；每项需实际课程/业务日期及版本 | 值不变只改课程仍留修订；返回原位置 |
| C20–23 确认/修订 | workflow GET、entries PUT、publications POST；assessment-workflow.routes.ts:32–51 | 已有expectedRevision/逐人确认/历史可复用；**现有scope仅defaultCoachId**，与协同授权不一致 | 授权动作与范围独立，失败行可重试、重复确认回放 |
| 确认结果时间 | assessment-workflow.ts:133–137 | **改造：assessedAt=publishedAt**；区分课程发生日期、recordedAt、confirmedAt | 跨课程项目日期分别展示，晚录不改变发生日 |
| C26 自由战术板 | GET/PUT coach/events/:id/tactical-board:95,120 | 已有归一化坐标、名单、保存回读、赛后只读；**PUT要求formationName且校验模板**，需移除旧固定阵型限制 | 自由人数/拖放/空场/默认保存/失败保留；不产生比赛统计 |
| C27/C28 教学记录/身份 | coach/home及身份切换接口 | weekHours由event时间范围累计，是安排时长，不能称实际执教；补真实口径/来源 | 无来源时不显示伪造累计 |
| C29/C34/C35 服务/接课 | coach/preferences与现有咨询对象 | 复用偏好；补区间、周汇总、跟进详情和保存回读，暂停不删除历史 | 可用≠预约、失败保留设置 |
| SC-SELECT/CREATE/PROFILE | 09-22 coach design.md 与本次检索 | 待补统一证件身份/俱乐部档案/单次参与与教练最小建档；不自动队伍/家长/课包 | 同证件并发唯一、同场幂等、转正式保留历史/跨俱乐部无泄露 |
| D01 模块布局 | 本次routes检索无完整dashboard/layout合同 | 待补预制模块注册与授权数据/布局持久化；不是自定义BI引擎 | 保存回读、无权模块不取数 |
| D02–17/D26 业务表维护 | admin/students:255,278、teams/members、admin/calendar、store等已有领域对象 | 复用已有主档/关系/日程，不重建物理全库；各对象详情/编辑/冲突/审计合同分开补齐 | 对象字段校验/乐观版本/权限/保存回读 |
| D18–21 导入 | data-capability.routes.ts:662 Excel preview、696 import-preview、785 external-record confirm | 已有解析/预览/外部记录确认与sync runs；不能认定所有表已支持 | 按实体白名单/唯一键/空值策略/关联校验、预览后版本保护、逐行结果 |
| D22/D23 导出/质量 | admin/privacy/export-preview:377、审计与sync runs | 复用受控预览，补表/字段/筛选范围与下载任务/失败明细 | 敏感字段独立授权、生成与下载审计、修复不扩大权限 |
| D24/25 内容/里程碑 | 已有内容读取；规则完整写管理尚未核验 | 补图片/受控链接配置、里程碑条件/素材/版本/达成证据 | 保存后前台一致、规则示例不作为生产参数 |
| M01–07/M12–13 模型/标准/展示 | 已有metric graph/services/版本与血缘（16号规格） | 复用DAG，补两段区间映射、临界值校验、统一展示尺度、版本可比；不重写另套计算 | 空缺/重叠/错误单位阻断、历史版本不静默重算 |
| M08–11 后台测评 | 复用assessment workflow/事实与历史 | 管理端授权及任务范围、逐人修订UI需补；不得新建独立成绩台账 | 同任务同人同revision、前后台一致 |
| B01–05 BI | 原领域事实及列表接口可复用，专用聚合需核查/补齐 | 显式定义人数/参与/安排时长/确认率与范围，不能从排课推断实际 | 筛选→汇总→明细→导出同口径/同范围 |
| S01–08 专业服务/球探 | 咨询已有，计划/交付/分派完整管理链待补或待核验 | 统一request/person/assignment，避免仅有通用确认无实际字段 | 保存/权限/附件/状态历史逐项合同 |
| A01–04 账号/授权/集成/审计 | platform/data-capability、auth/membership与现有权限基础 | 复用授权体系，补管理动作；绑定不得仅姓名/手机号扩大访问 | 俱乐部/角色/对象/action四层验证、敏感审计原值受限 |
| X01–16 通用状态/登录 | wechat-login、session/role及environment guard | 复用认证与三环境保护；设计覆盖提交中/错误/无权/冲突/离线，不假设已实现 | 真机键盘/字体/320/430、开发/体验不得写release，运行验收另行 |

## 建议实现顺序（设计确认后）

1. 先完成环境隔离的隔离环境验收；保持生产不动。
2. 训练事实与账本分离、统一身份/单次参与、课程来源/版本和权限合同。
3. 复用测评工作流完成协同、行级课程、晚录和两段映射；实现共享日历/跨日任务聚合。
4. 补后台对这些对象的维护、导入、导出和历史，使前台配置真实可管理。
5. 按已确认Figma接入家长/教练前端，再做全链路、异常与真机验证。

以上顺序不授权本阶段开发/部署。当前交付仍为产品原型与UI待用户确认。

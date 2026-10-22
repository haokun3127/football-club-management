# 全量页面归属与迁移地图

这是目标归属和兼容计划，不是已实施路由变更。62条均来自当前 app.json 登记与源码扫描，见 [原始盘点](route-inventory.json)。未来一级页保留Tab；详情/编辑逐页迁移为返回/动作壳。没有在本规划删除页面。

## 小程序全部62条

| # | 现有路由（相对小程序根目录） | 目标归属与处理 |
| --- | --- | --- |
| 1 | `pages/launch/index` | 启动与角色恢复｜保持真实会话流程 |
| 2 | `pages/login/index` | 登录与绑定｜保持认证/隐私授权 |
| 3 | `pages/parent/home/index` | 首页｜调整首屏；保留快捷位与内容配置 |
| 4 | `pages/parent/confirmed-results/index` | 成长/已确认成绩｜保留当前共享结果实现 |
| 5 | `pages/parent/schedule/index` | 日程｜保留多孩子与三类活动 |
| 6 | `pages/parent/event/index` | 活动详情｜修正投影/孩子上下文；保留id深链 |
| 7 | `pages/parent/growth/index` | 成长｜重排解释/评价/成绩/图表 |
| 8 | `pages/parent/radar/index` | 成长/能力图表｜统一详情壳，保留指标钻取 |
| 9 | `pages/parent/metric/index` | 成长/指标详情｜保留来源与日期 |
| 10 | `pages/parent/child/index` | 我的｜重组职责；保留旧URL |
| 11 | `pages/parent/semester-report/index` | 成长/学期报告｜我的保留快捷入口 |
| 12 | `pages/parent/account/index` | 我的/账号｜沿用认证及隐私流程 |
| 13 | `pages/parent/reminders/index` | 日程/提醒｜保持提醒可达，不扩通知机制 |
| 14 | `pages/parent/status/index` | 我的/学员状态｜保留现有业务含义 |
| 15 | `pages/parent/content/index` | 首页内容 / 我的服务｜一个内容源，多入口 |
| 16 | `pages/parent/article/index` | 内容详情｜统一阅读与返回 |
| 17 | `pages/parent/guide/index` | 我的/俱乐部指南｜保留内容链接 |
| 18 | `pages/parent/milestones/index` | 成长/里程碑｜保留历史来源 |
| 19 | `pages/parent/ability-history/index` | 成长/能力历史｜不合并成评分计算器 |
| 20 | `pages/parent/training-history/index` | 成长/训练历史｜区分计次与参与 |
| 21 | `pages/parent/match-history/index` | 成长/比赛历史｜按来源展示获准记录 |
| 22 | `pages/parent/help/index` | 我的/帮助｜统一详情壳 |
| 23 | `pages/parent/coaches/index` | 我的/教练与联系｜保持权限裁剪 |
| 24 | `pages/parent/venues/index` | 我的/场地｜与活动投影共用事实 |
| 25 | `pages/parent/private/index` | 我的/专业服务｜保留咨询流程，不新增支付 |
| 26 | `pages/parent/private-success/index` | 专业服务反馈｜返回原服务入口 |
| 27 | `pages/parent/day/index` | 日程/当日清单｜保留旧深链与选择日期 |
| 28 | `pages/parent/binding/index` | 我的/孩子绑定｜不改变监护验证 |
| 29 | `pages/coach/schedule/index` | 日程｜压缩上下文，活动与待办优先 |
| 30 | `pages/coach/team-selector/index` | 球队上下文选择｜单队/多队模式明确 |
| 31 | `pages/coach/event/index` | 本次训练｜内容/计次/任务/友谊赛汇集 |
| 32 | `pages/coach/attendance/index` | 历史考勤入口｜保留TRAINING跳转；核实非训练消费者 |
| 33 | `pages/coach/lesson/index` | 本课计次与更正｜紧凑记录/明确写操作 |
| 34 | `pages/coach/match/index` | 正式赛事详情｜保留原业务；清楚返回 |
| 35 | `pages/coach/match-edit/index` | 正式赛事编辑｜原类型约束与权限不变 |
| 36 | `pages/coach/tactical-board/index` | 课堂/赛事战术｜自由摆放；不强制人数 |
| 37 | `pages/coach/team/index` | 球队成员/教练组/比赛分区｜保留section参数 |
| 38 | `pages/coach/scout/index` | 球队/活动球探工作｜保留来源与权限 |
| 39 | `pages/coach/student-radar/index` | 队员成长｜与个人成绩/评价区分 |
| 40 | `pages/coach/team-ability/index` | 球队能力分析｜显示数据覆盖；不做儿童排行 |
| 41 | `pages/coach/event-change/index` | 课程变更｜移入次级操作；沿用服务 |
| 42 | `pages/coach/content-select/index` | 课堂内容选择｜搜索、已选摘要、明确保存 |
| 43 | `pages/coach/content-copy/index` | 课堂内容复制｜保持友谊赛排除约束 |
| 44 | `pages/coach/training-assessment/index` | 课堂表现记录｜与标准化测评分开命名 |
| 45 | `pages/coach/test-tasks/index` | 球队测评任务｜待办优先/单一新建 |
| 46 | `pages/coach/test-task-create/index` | 测评任务创建｜保持模板/有效课程/人员规则 |
| 47 | `pages/coach/assessment-projects/index` | 任务/项目｜数量单位清楚/继续录入优先 |
| 48 | `pages/coach/assessment-bulk-entry/index` | 项目批量录入｜两层行/键盘/保存/冲突 |
| 49 | `pages/coach/assessment-submit/index` | 测评确认反馈｜核查实际调用方再兼容整合 |
| 50 | `pages/coach/attendance-success/index` | 原考勤反馈｜保留旧流；不可作为新训练计次必经页 |
| 51 | `pages/coach/lesson-history/index` | 训练记录历史｜统一对象与时间筛选 |
| 52 | `pages/coach/lesson-detail/index` | 旧计次详情入口｜保留到lesson的兼容关系 |
| 53 | `pages/coach/match-event-add/index` | 正式赛事事件录入｜保留原契约；纯行组件可复用 |
| 54 | `pages/coach/permissions/index` | 我的/权限说明｜与服务端授权一致 |
| 55 | `pages/coach/private-interest/index` | 我的/私教服务意向｜保留已有功能边界 |
| 56 | `pages/coach/account/index` | 我的/账号｜保持会话切换 |
| 57 | `pages/coach/help/index` | 我的/帮助｜统一信息与返回 |
| 58 | `pages/coach/training/index` | 球队工作台｜保留旧路径名，补近期/待办 |
| 59 | `pages/coach/test-entry/index` | 旧录入入口｜查调用方和数据契约后兼容，不盲删 |
| 60 | `pages/coach/me/index` | 我的｜账号/身份/服务/帮助 |
| 61 | `pages/coach/student-results/index` | 队员已确认结果｜保留共享成绩实现 |
| 62 | `pages/shared/student-evaluation/index` | 共享教练评价｜按角色读写；独立于测评分数 |

## 计划新增

仅友谊赛最小闭环预计新增 `pages/coach/training-game/index`，承载创建/编辑/回看；是否拆详情页以实际状态复杂度决定，不能先扩成一套赛事系统。家长优先复用活动详情。新增 app.json/分包项、query schema 与导航测试放在友谊赛批次。

## 后台所有菜单资源

入口保留原 URL，仅调整菜单分组和对象详情的关联路径。数据管理29个资源如下；括号中为路径 `/data/<key>` 的 key。

| 新分组 | 原资源 |
| --- | --- |
| 人员与队伍（10） | 学员档案(students)、球探人员(scouts)、队伍(teams)、教练(coaches)、队伍成员(members)、教练任职(assignments)、家长资料(parents)、家长绑定(guardians)、学员联系人(contacts)、学员运营资料(operations) |
| 课程与记录（7） | 课程与活动(events)、场地(venues)、学期(terms)、活动参训记录(participants)、训练计次与更正(training-records)、保险资料(insurance)、课包台账(credits) |
| 教学资源（5） | 训练练习库(drills)、公共训练计划(plans)、能力指标定义(metrics)、测评采集项目(testitems)、评价用语(evaluation-phrases) |
| 内容与展示（5） | 公告与内容(articles)、队徽与主题(branding)、新闻Banner(banners)、预制分享模板(share-templates)、可选功能目录(optional-features) |
| 导入与账号（2） | 导入与批次(imports)、账号与角色(memberships) |

| 其他既有模块 | 保留路径 / 调整 |
| --- | --- |
| 工作台 | `/`；已有待办/近期活动/导入问题/服务入口，重排与筛选，不重建 |
| 评测与模型 | `/assessment/projects`、`/assessment/models`、`/assessment/standards`、`/assessment/tasks`；保持映射/版本/标准/任务职责 |
| BI | `/bi/overview`；来源、筛选范围和更新时间清楚，不把图表值回写业务表 |
| 专业服务 | `/services/service-catalog`、`/services/consultations`、`/services/service-cases`、`/services/scout-work`；保持原能力与可选开关 |
| 管理设置 | `/settings/club`；保持俱乐部/环境权限，不混入教练端 |

## 迁移检查

每页登记主入口、次入口、返回目标、需要的ID、角色、空/错态和是否含写操作。旧分享链接、提醒链接、课内跨页、后台对象跳转都属于兼容范围。未经调用方查证，不把名称老旧的test-entry/attendance等页标记为可删除。菜单分组不改变后端资源键、权限或数据表。

# 核心流程覆盖矩阵

2026-10-20/21，源码97419b47；Figma EyQtDtILGDZDf6neLBL6vs。N=本轮真实身份原生界面/只读导航；S=原生模板+合成视图（只检查视觉）；L=未修改控制器合成逻辑探针；T=本轮现有隔离测试；C=源码路径核对。空态截图和源码检查均不等同完整业务通过。

| 步骤 | 需求/流程 | 路由（pages/ 下）与 Figma 节点 | 本轮检查与健康状态 |
| --- | --- | --- | --- |
| 01 | 登录、身份与角色切换 | login；coach/me；parent/child；C28 214:2814、P22 213:875 | N：已有正常双角色会话切换成功；首次手机号、隐私拒绝/同意未测 |
| 02 | REQ-PAR-001 首页/孩子/四入口 | parent/home；P01 213:348 | N为空（无绑定）；S完整模板；L/T孩子选择与加载；F-01/F-02、V-01/V-04/V-05、L-02 |
| 03 | REQ-PAR-002 日程/周月/活动 | parent/schedule、day；P02 213:395 | N无孩子；C日期/列表/路由；有数据周月切换待样本 |
| 04 | REQ-ATT-001 课前请假 | parent/event；P03 213:428→P04 213:450 | C确认客户端没有提交操作；F-01；不能用课后修正替代 |
| 05 | REQ-ATT-002 训练事实/更正/历史 | parent/training-history；P06 213:484 | N为空；L/C保存/409/历史；T训练API与自动任务；有数据原生保存待样本 |
| 06 | REQ-PAR-003 成长与能力详情 | parent/growth、radar、metric；P08 213:526 | N为空；S模板；L八维截六/总分兜底；T雷达/指标；F-03/F-04/F-06、V-02 |
| 07 | REQ-PAR-004 标准对照 | parent/metric；P08能力详情关联 | C当前同龄均值逻辑，缺适用标准链路；F-05；正式标准待核定 |
| 08 | REQ-ASM-004/006 已确认成绩/历史 | parent/confirmed-results；P08下钻 | C已有原始值/分值/等级/版本；N直接无学员参数报错为正常守卫，不记缺陷；T后端确认隔离；有数据原生待样本 |
| 09 | REQ-EVA-001 评价与变化 | shared/student-evaluation；P08→当前评价 | C/T按队评价/历史/权限；无真实评价样本，未原生保存 |
| 10 | REQ-PAR-005 时间线/报告/分享 | parent/milestones、semester-report | C有路由与数据拼装；公开字段、徽章规则等O-11未定，未冒称分享闭环已验收 |
| 11 | REQ-PAR-006 私教咨询 | parent/private、private-success；P19 213:810 | N无孩子；L/T多孩子和保存；F-02/F-11；实际咨询写入及承接待隔离业务样本 |
| 12 | REQ-COA-001 教练日程/待办 | coach/schedule；C01 214:2144 | N当前日/当月/九月空态；C筛选/任务路由；V-03、L-01；实际课程待样本 |
| 13 | REQ-ORG-002 队伍上下文/权限 | coach/training、team、team-selector | N队伍可见/成员及课程为空；C按队选择/权限；不宣称角色授权完整通过 |
| 14 | REQ-TRN-001/003 训练工作台/内容选择 | coach/event、content-select；C03 214:2203、C04 214:2226 | C/T编辑权限、选择/回读、失败保留；真实课程缺失，未原生保存 |
| 15 | REQ-TRN-002 个人/公共模板与复制 | coach/event、content-copy；C04关联模板 | C/T预览→显式替换/跳过→结果与重试；缺真实未来课程/模板样本 |
| 16 | REQ-ATT-002 教练更正/历史 | coach/lesson；C07 214:2308 | C/T共同训练事实/冲突和自动生成；无整班确认要求；实际名单原生待样本 |
| 17 | REQ-ORG-003 临时球员/球探 | coach/scout；C03→临时球员 | C/T人员复用、临时加入与历史、失败恢复；本轮未向真实活动加人 |
| 18 | REQ-SCH-003 单堂课变更 | coach/event-change；C03底部入口 | C有变更请求、失败保留；审批模式O-01/通知O-12未定，未据此判全部可用或缺陷 |
| 19 | REQ-ASM-001 任务列表/创建 | coach/test-tasks、test-task-create；C14 214:2481 | N空态/新增按钮遮挡；C/T任务来源/授权；V-06；实际任务创建待样本 |
| 20 | REQ-ASM-002/003 分人分项分课/不测评 | coach/assessment-projects、assessment-bulk-entry；C18 214:2561 | C/T课程归属、录入/不测/草稿；API22例覆盖相关域路径；实际名单原生待样本；L-04 |
| 21 | REQ-ASM-004/005 核对同步/修订 | coach/assessment-projects、student-results；C20 214:2629 | C/T确认结果与新草稿隔离、修订/历史；实际原生操作待样本 |
| 22 | REQ-COA-002/EVA 学员成长/评价 | coach/student-radar、student-results、shared/student-evaluation | C/T评价按队、历史及查看范围；现有队伍无学员，真实数据待样本 |
| 23 | REQ-COA-004 比赛/战术 | coach/match、tactical-board；C26 214:2739 | C/T自由拖入/移出、自动保存、失败草稿/撤销、只读；无真实比赛，原生拖拽未签收 |
| 24 | REQ-SVC-002 接课/时段/跟进 | coach/private-interest；C34 214:3368 | N配置页面；L/T失败回滚、空时段和读失败；F-07/F-08/F-09、V-07；未改真实设置 |

结论：24步全部建立需求/实现/证据或具体阻塞对应；其中正常有数据的原生写入闭环仍受B-01阻塞，不能记作24步全部通过。主报告的问题清单是修复唯一清单，本矩阵不另建重复待办。

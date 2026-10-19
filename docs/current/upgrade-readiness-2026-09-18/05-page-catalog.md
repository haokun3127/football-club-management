# 页面目录与路由迁移

> 2026-09-20：本文件保留当时取证/设计状态；当前业务目标以产品需求 v1.2 及 [16号修订规格](16-confirmed-rules-and-engineering-spec.md) 为准。三层区间映射、前台余额隐藏及自由拖放战术尚未改入 Figma，不得将旧画板当成新需求已验收。

Figma 以 C/P/O 状态说明为准；页面已生成不等于代码实现或平台验收。2026-09-19五项能力设计补齐后共176个页面/状态画板：家长41、教练63、后台56、公共状态/适配16。基础组件、封面与设计说明不计入业务页面数。原有编号保持不变；最新新增项及验证边界见15号报告。

## 完整目录
| 编号 | 页面 | 类型 | 需求 | Figma画板 |
| --- | --- | --- | --- | --- |
| P01 | 首页 | home | REQ-PAR-001、REQ-GOAL-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-2) |
| P02 | 日程 | schedule | REQ-SCH-001、REQ-PAR-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-6) |
| P03 | 训练详情 | detail | REQ-PAR-002、REQ-SCH-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-10) |
| P04 | 提交请假 | form | REQ-ATT-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-14) |
| P05 | 请假已生效 | success | REQ-ATT-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-18) |
| P06 | 修正训练记录 | form | REQ-ATT-002、REQ-ATT-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-22) |
| P07 | 记录与修改历史 | timeline | REQ-ATT-002、REQ-ATT-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-26) |
| P08 | 成长 | growth | REQ-PAR-003、REQ-GOAL-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-30) |
| P09 | 测评项目详情 | metric | REQ-ASM-006、REQ-PAR-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-34) |
| P10 | 测评历史 | list | REQ-ASM-005、REQ-PAR-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-38) |
| P11 | 学期成长报告 | report | REQ-PAR-003、REQ-PAR-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-42) |
| P12 | 训练记录 | list | REQ-PAR-002、REQ-TRN-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-46) |
| P13 | 比赛记录 | list | REQ-COA-004、REQ-SCH-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-50) |
| P14 | 成长里程碑 | timeline | REQ-PAR-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-54) |
| P15 | 成长分享卡 | share | REQ-PAR-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-58) |
| P16 | 俱乐部动态 | list | REQ-DAT-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-62) |
| P17 | 动态详情 | article | REQ-DAT-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-66) |
| P18 | 专业服务 | list | REQ-PAR-006、REQ-SVC-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-70) |
| P19 | 私教咨询 | form | REQ-PAR-006、REQ-SVC-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-74) |
| P20 | 咨询已提交 | success | REQ-PAR-006 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-78) |
| P21 | 孩子档案 | profile | REQ-ORG-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-82) |
| P22 | 我的 | account | REQ-ADM-002、REQ-PAR-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-86) |
| P23 | 自定义快捷入口 | select | REQ-PAR-001、REQ-DAT-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-90) |
| P24 | 消息中心 | list | REQ-PAR-002、REQ-DAT-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-94) |
| P25 | 教练与场地 | directory | REQ-ORG-002、REQ-SCH-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-98) |
| P26 | 帮助与反馈 | list | REQ-UX-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=15-102) |
| C01 | 工作日程 | coachHome | REQ-COA-001、REQ-UX-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-656) |
| C02 | 选择队伍 | select | REQ-ORG-002、REQ-COA-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-660) |
| C03 | 训练工作台 | detail | REQ-TRN-001、REQ-ATT-002、REQ-COA-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-664) |
| C04 | 选择训练内容 | select | REQ-TRN-001、REQ-TRN-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-668) |
| C05 | 课程模板 | list | REQ-TRN-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-672) |
| C06 | 复制课程内容 | form | REQ-TRN-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-676) |
| C07 | 训练记录名单 | list | REQ-ATT-001、REQ-ATT-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-680) |
| C08 | 修正记录与历史 | form | REQ-ATT-002、REQ-ATT-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-684) |
| C09 | 单堂训练变更 | form | REQ-SCH-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-688) |
| C10 | 我的队伍 | list | REQ-COA-002、REQ-ORG-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-692) |
| C11 | 学员详情 | profile | REQ-COA-002、REQ-ORG-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-696) |
| C12 | 更新学员评价 | select | REQ-EVA-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-700) |
| C13 | 评价变化 | timeline | REQ-EVA-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-704) |
| C14 | 测评任务 | list | REQ-ASM-001、REQ-ASM-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-708) |
| C15 | 创建本队测评 | form | REQ-ASM-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-712) |
| C16 | 任务详情 | detail | REQ-ASM-002、REQ-ASM-003、REQ-ASM-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-716) |
| C17 | 项目清单 | list | REQ-ASM-006 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-720) |
| C18 | 批量录入 | entry | REQ-ASM-002、REQ-ASM-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-724) |
| C19 | 选择关联训练课 | select | REQ-ASM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-728) |
| C20 | 核对并同步 | detail | REQ-ASM-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-732) |
| C21 | 同步完成 | success | REQ-ASM-004、REQ-ASM-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-736) |
| C22 | 更正已确认成绩 | form | REQ-ASM-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-740) |
| C23 | 标记不测评 | form | REQ-ASM-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-744) |
| C24 | 比赛详情 | detail | REQ-COA-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-748) |
| C25 | 比赛记录 | form | REQ-COA-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-752) |
| C26 | 战术板 | tactics | REQ-COA-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-756) |
| C27 | 我的教学记录 | list | REQ-COA-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-760) |
| C28 | 我的与权限 | account | REQ-ADM-002、REQ-ORG-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-764) |
| C29 | 服务跟进 | list | REQ-SVC-002、REQ-SVC-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=17-768) |
| P27 | 我的咨询 | list | REQ-PAR-006、REQ-SVC-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=25-236) |
| P28 | 咨询跟进 | timeline | REQ-SVC-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=25-240) |
| C30 | 保存课程模板 | form | REQ-TRN-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=25-583) |
| D01 | 工作台 | dashboard | REQ-ADM-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-2) |
| D02 | 学员管理 | table | REQ-DAT-001、REQ-ORG-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-7) |
| D03 | 学员档案 | profile | REQ-ORG-001、REQ-COA-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-12) |
| D04 | 编辑学员 | form | REQ-DAT-001、REQ-ORG-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-17) |
| D05 | 家长与联系人 | table | REQ-ORG-001、REQ-DAT-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-22) |
| D06 | 球探人员库 | table | REQ-ORG-003、REQ-DAT-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-27) |
| D07 | 球探档案与转入 | profile | REQ-ORG-003、REQ-SVC-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-32) |
| D08 | 教练与任职 | table | REQ-ORG-002、REQ-DAT-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-37) |
| D09 | 队伍管理 | table | REQ-ORG-002、REQ-DAT-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-42) |
| D10 | 队伍详情 | profile | REQ-ORG-002、REQ-ORG-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-47) |
| D11 | 学期与场地 | table | REQ-SCH-002、REQ-DAT-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-52) |
| D12 | 共同日程 | calendar | REQ-SCH-001、REQ-DAT-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-57) |
| D13 | 学期排课与变更 | form | REQ-SCH-002、REQ-SCH-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-62) |
| D14 | 原子训练内容库 | table | REQ-TRN-001、REQ-DAT-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-67) |
| D15 | 训练内容与公共模板 | form | REQ-TRN-002、REQ-TRN-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-72) |
| D16 | 训练记录与修正 | table | REQ-ATT-001、REQ-ATT-002、REQ-ATT-003、REQ-DAT-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-77) |
| D17 | 业务修改历史 | detail | REQ-DAT-004、REQ-ATT-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-82) |
| D18 | 导入：选择数据 | import | REQ-DAT-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-87) |
| D19 | 导入：字段映射 | mapping | REQ-DAT-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-92) |
| D20 | 导入：影响预览 | preview | REQ-DAT-003、REQ-DAT-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-97) |
| D21 | 导入：批次结果 | table | REQ-DAT-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-102) |
| D22 | 导出数据 | form | REQ-DAT-003、REQ-BI-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-107) |
| D23 | 数据质量 | table | REQ-DAT-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-112) |
| D24 | 内容与展示配置 | table | REQ-DAT-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-117) |
| D25 | 内容编辑与预览 | form | REQ-DAT-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=18-122) |
| M01 | 测评项目库 | table | REQ-MOD-001、REQ-ASM-006 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-2) |
| M02 | 项目采集定义 | form | REQ-MOD-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-7) |
| M03 | 模型库 | table | REQ-MOD-002、REQ-MOD-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-12) |
| M04 | 模型定义 | model | REQ-MOD-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-17) |
| M05 | 模型试算与发布 | preview | REQ-MOD-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-22) |
| M06 | 版本与血缘 | detail | REQ-MOD-003、REQ-ASM-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-27) |
| M07 | 培养标准 | table | REQ-MOD-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-32) |
| M08 | 任务运营 | table | REQ-MOD-005、REQ-ASM-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-37) |
| M09 | 创建与下发任务 | form | REQ-ASM-001、REQ-MOD-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-42) |
| M10 | 采集与同步明细 | table | REQ-ASM-002、REQ-ASM-003、REQ-ASM-004、REQ-MOD-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-47) |
| M11 | 个人结果与修订 | profile | REQ-ASM-004、REQ-ASM-005 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-52) |
| B01 | 运营概况 | analytics | REQ-BI-001、REQ-BI-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-616) |
| B02 | 训练分析 | analytics | REQ-BI-002、REQ-BI-003、REQ-TRN-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-621) |
| B03 | 测评执行 | analytics | REQ-BI-002、REQ-ASM-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-626) |
| B04 | 学员成长 | analytics | REQ-BI-002、REQ-PAR-003、REQ-PAR-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-631) |
| B05 | 专业服务分析 | analytics | REQ-BI-002、REQ-BI-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-636) |
| S01 | 服务目录 | table | REQ-SVC-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-641) |
| S02 | 服务定义 | form | REQ-SVC-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-646) |
| S03 | 需求与承接 | table | REQ-SVC-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-651) |
| S04 | 沟通与人员分派 | profile | REQ-SVC-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-656) |
| S05 | 计划与执行 | calendar | REQ-SVC-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-661) |
| S06 | 交付与反馈 | detail | REQ-SVC-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-666) |
| S07 | 球探工作 | table | REQ-SVC-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-671) |
| S08 | 球探观察记录 | form | REQ-SVC-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-676) |
| A01 | 账号与角色 | table | REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-681) |
| A02 | 范围授权与绑定 | form | REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-686) |
| A03 | 俱乐部与集成 | form | REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-691) |
| A04 | 操作与导出历史 | table | REQ-ADM-002、REQ-DAT-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=20-696) |
| M12 | 培养标准编辑 | form | REQ-MOD-004 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=25-740) |
| M13 | 成长展示组织 | form | REQ-MOD-004、REQ-PAR-003 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=25-745) |
| D26 | 转为正式学员 | form | REQ-ORG-003、REQ-DAT-001 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=25-638) |
| X01 | 登录天才足球 | login | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-2) |
| X02 | 选择当前身份 | roles | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-15) |
| X03 | 关联孩子 | binding | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-30) |
| X04 | 正在加载日程 | loading | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-44) |
| X05 | 暂时没有训练安排 | empty | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-62) |
| X06 | 暂时无法连接 | error | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-73) |
| X07 | 当前身份无法查看 | permission | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-84) |
| X08 | 草稿等待同步 | offline | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-95) |
| X09 | 记录有新的修改 | conflict | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-106) |
| X10 | 本次保存未成功 | error | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-121) |
| X11 | 课程已取消 | cancelled | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-132) |
| X12 | 保存成长卡 | consent | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-143) |
| X13 | 训练详情 · 320宽 | adapt | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-154) |
| X14 | 训练详情 · 430宽 | adapt | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-170) |
| X15 | 适老化示例 · 140% | adapt | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-186) |
| X16 | 后台登录 | adminLogin | REQ-UX-001、REQ-ADM-002 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=22-202) |

## 旧版56条路由迁移
下表是实施映射，不修改当前 app.json。保留旧参数与入口兼容；在新页面稳定前不要删除别名。合并页面仍须按原角色做权限和回退。

| 旧路由 | 新设计 | 迁移说明 |
| --- | --- | --- |
| pages/launch/index | X01 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/login/index | X01 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/schedule/index | P02 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/event/index | P03训练 / P31系列比赛 | 比赛已补赛前、赛后与取消详情；其他活动专属详情仍需另行承接 |
| pages/parent/growth/index | P08 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/radar/index | P08 | 重用已确认结果；无同伴排名，不能把全队待测当能力零分 |
| pages/parent/metric/index | P09 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/child/index | P21 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/semester-report/index | P11 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/account/index | P22 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/reminders/index | P24 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/status/index | P12 | 状态入口转培训记录；当前不展示余额/扣减；后台能力保留（DEC-27） |
| pages/parent/content/index | P16 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/article/index | P17 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/guide/index | P26 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/milestones/index | P14 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/ability-history/index | P10 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/training-history/index | P12 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/match-history/index | P13 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/help/index | P26 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/coaches/index | P25 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/venues/index | P29系列 / P30系列 | 名称地址搜索、五类筛选、地址设施、地图交接、无定位和空结果；P25保留目录入口 |
| pages/parent/private/index | P19 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/private-success/index | P20 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/day/index | P02 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/parent/binding/index | X03 | 绑定方式为候选，沿用已验证认证，不仅凭手机号自动关联 |
| pages/coach/schedule/index | C01 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/team-selector/index | C02 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/event/index | C03训练 / C24-A赛前 / C24赛后 | 赛前进入C26编辑示例，赛后进入C26-RO只读；不赋予教练创建比赛权限 |
| pages/coach/attendance/index | C07 | 取消旧逐堂点名扣课确认，转到有效培训记录/修正/历史；保留深链兼容 |
| pages/coach/lesson/index | C07 | 取消旧逐堂点名扣课确认，转到有效培训记录/修正/历史；保留深链兼容 |
| pages/coach/match/index | C24 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/match-edit/index | C25 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/tactical-board/index | C26 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/team/index | C10 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/student-radar/index | C11 | 重用已确认结果；无同伴排名，不能把全队待测当能力零分 |
| pages/coach/team-ability/index | C10→C33系列→C31系列 | 独立队伍项目结果、同队学员切换、个人历史、草稿/未测区分；汇总失败仍可看名单。设计承接完成，C16仍只承担录入任务 |
| pages/coach/event-change/index | C09 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/content-select/index | C04 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/training-assessment/index | 旧课堂评分历史待补；新个人测评录入见C32 | 历史数值与新学员文字评价分开，不恢复逐堂强制评分；C16不能视为全部承接 |
| pages/coach/test-tasks/index | C14 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/test-task-create/index | C15 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/assessment-projects/index | C17 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/assessment-bulk-entry/index | C18 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/assessment-submit/index | C20 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/attendance-success/index | C07 | 取消旧逐堂点名扣课确认，转到有效培训记录/修正/历史；保留深链兼容 |
| pages/coach/lesson-history/index | C07 | 取消旧逐堂点名扣课确认，转到有效培训记录/修正/历史；保留深链兼容 |
| pages/coach/lesson-detail/index | C08 | 取消旧逐堂点名扣课确认，转到有效培训记录/修正/历史；保留深链兼容 |
| pages/coach/match-event-add/index | C25 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/permissions/index | C28 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/private-interest/index | C28/C29→C34系列→C35系列 | 接课开关、离散每周时点、暂停保留设置和咨询、保存回读/失败重试及未开通状态；不自动预约或收款 |
| pages/coach/account/index | C28 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/help/index | P26 | 复用帮助布局并替换为教练文案与角色路由 |
| pages/coach/training/index | C03 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/test-entry/index | C18 | 复用/升级对应业务入口，保留旧参数与权限 |
| pages/coach/me/index | C28 | 复用/升级对应业务入口，保留旧参数与权限 |

## 关键原型路径
- 家长：P01 → P02 → P03 → P04 → P05 → P12；P12 → P06 → P07。
- 成长：P01 → P08 → P09；P14 → P15。
- 服务：P01/P18 → P19 → P20 → P27 → P28。
- 教练：C01 → C03 → C04；C14 → C16 → C17 → C18 → C20 → C21，C18可跳C19选择实际课；C22保存修订后回核对。
- 后台：人员→详情→编辑；导入D18—D21；模型M03—M06；测评M08—M11；服务S03—S06。不同Figma页面的模块入口用画板链接切换。

原型为静态交互说明，不运行真实校验或保存；状态页可独立查看错误/离线/冲突及适配方案。所有可见状态与动作的实现按验收文档执行。


## 2026-09-19 新增的结果、录入与交互状态

| 编号 | 页面/状态 | Figma |
|---|---|---|
| C31 | 学员已确认成绩 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=86-319) |
| C32 | 按学员录入 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=86-358) |
| C18-A | 批量录入 · 传接球 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=87-321) |
| C18-B | 批量录入 · 控球稳定性 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=87-362) |
| C04-A | 技术训练检索 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=87-403) |
| C04-B | 已选4项 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=87-456) |
| C04-C | 检索时保留4项选择 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=88-324) |
| C03-A | 课程内容已保存 · 3项 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=88-377) |
| C03-B | 课程内容已保存 · 4项 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=88-405) |
| C18-C | 部分保存失败 · 仅重试失败记录 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=89-327) |

训练编排：C04/C04-A→C03-A；C04-B/C04-C→C03-B，编辑返回对应选择状态。
测评：C16分流C17或C32；C17连接C18/C18-A/C18-B；C18系列继续项目选择或个人核对。C11结果入口改为C31。


## 2026-09-19 五项能力补齐新增画板

| 编号 | 页面/状态 | Figma |
|---|---|---|
| P29 | 训练场地 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=112-254) |
| P30 | 场地详情 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=112-281) |
| P30-NO | 场地暂无定位 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=112-308) |
| P29-A | 室内场地检索 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=113-287) |
| P30-IN | 室内馆详情 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=114-288) |
| P30-MAP | 地图导航 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=114-315) |
| P29-E | 未找到匹配场地 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=114-342) |
| P31 | 比赛详情 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=115-309) |
| P31-END | 比赛已结束 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=115-336) |
| P31-CANCEL | 比赛已取消 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=115-363) |
| P29-OUT | 室外场地 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=125-329) |
| P29-ART | 人工草场地 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=125-370) |
| P29-NAT | 天然草场地 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=125-411) |
| C33 | 队伍能力 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=103-328) |
| C31-A | 周子衡的测评记录 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=104-659) |
| C31-B | 许明澈的测评记录 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=104-686) |
| C33-A | 队伍能力 · 传接球 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=105-682) |
| C31-C | 传接球已确认成绩 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=106-374) |
| C33-E | 能力汇总暂不可用 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=106-401) |
| C34 | 私教接课设置 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=107-397) |
| C34-OFF | 私教接课已暂停 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=107-424) |
| C35 | 每周可用时段 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=108-417) |
| C34-S | 私教时段已保存 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=110-523) |
| C26-F | 选择阵型 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=120-430) |
| C26-A | 3-2-1未保存 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=120-457) |
| C26-S | 阵型已保存 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=121-441) |
| C26-E | 保存失败保留布阵 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=121-501) |
| C26-RO | 比赛结束只读 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=121-562) |
| C26-PICK | 选择换下球员 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=122-444) |
| C26-SWAP | 替补换人未保存 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=122-504) |
| C26-SWAP-S | 换人已保存 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=123-446) |
| C24-A | 赛前比赛详情 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=123-506) |
| C34-NA | 私教服务未开通 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=127-451) |
| C35-A | 周六尚未选择时段 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=110-418) |
| C35-B | 新增周六17点 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=110-470) |
| C35-E | 时段保存失败 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=127-478) |

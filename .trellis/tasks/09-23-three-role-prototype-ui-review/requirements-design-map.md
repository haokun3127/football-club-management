# 定稿需求到原型与 UI 的映射

依据 PRD 所列三会话定稿文档。原型中的文案、字段默认值、演示评分和分区名称属于本轮设计表达，不覆盖既有业务定稿；待决事项见 review.md。

| 需求组 | 页面/状态 | 入口 | 覆盖与边界 |
|---|---|---|---|
| 家长首页 | P01 / P-CHILD / P01-CHILD2 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=213-348) | 孩子身份与头像、训练数、徽章、成长事件、快捷入口；图片横幅外传授权待确认。 |
| 多孩日程 | P02 / MONTH / DAY | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=213-395) | 同一事件内区分孩子状态；周月切换、命名色块、溢出展开；友谊赛归训练；演示日期固定9月19日。 |
| 请假与训练更正 | P03–P07 / SUCCESS / CONFLICT | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=213-428) | 有效参与事实与金融课包分离；展示更正原因、历史、成功与版本冲突。 |
| 成长与版本 | P08 / L2 / TREND / CHILD2 / COMMENTS | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=213-526) | 只展示确认结果；分层能力、无数据不画零值、不可比版本断线、课程与评价历史。 |
| 队伍范围 | C01 / C02 / MONTH | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2144) | 默认全部授权队伍、至少1队；任务独立于日历日期。 |
| 课程工作台 | C03 / C07 / C08 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2203) | 出勤头像、名单、修改历史、临时球员；训练与测评入口分开。 |
| 模板与复制 | C04 / C05 / C06 / C30 / C06-A | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2226) | 模板和复制过滤友谊赛；仅友谊赛空态；非空目标应选择合并或替换。 |
| 学员教学档案 | C10 / C11 / C11-TRAIN / C12 / C13 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2381) | 教学、出勤、训练与能力；不展示财务余额。实际教学与排课信息分开。 |
| 测评全过程 | C14–C23 / C32 / 5个新增状态 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2481) | 真实课程日期、项目及部分名单、项目/学员两种录入方式、按人确认、草稿/旧确认版/修订对照。 |
| 自由战术板 | C26 / 各拖放与保存状态 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2739) | 自由摆放与独立名单、临时球员；无效落点回退、保存失败保留。真实拖放/撤销/自动保存留待运行验收。 |
| 球探身份 | SC01训练/比赛/独立库三组 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=248-305) | 同一人员身份与球探档案复用；临时活动参与不自动转正式学员、不自动加永久队伍或关联家长。 |
| 教练服务承接 | C29 / DETAIL / FOLLOWUP / C34 / C35 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=300-353) | 需求对象、负责人、阶段、沟通与执行；可用时段有起止与时长，不等于已预约。 |
| 分区模块工作台 | D01 / EDIT / LIB / SAVED | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-29) | 预制模块选取与排序；候选分区名称与保存范围不擅自锁成业务规则。 |
| 数据浏览与维护 | DAT01 / EDIT / NEW / CONFLICT / HISTORY | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=229-491) | 分类树、表格、实际字段、关系、版本冲突、历史；表格横向滚动，详情纵向滚动。 |
| 基础实体表单 | D05/D06/D08/D09/D11-NEW / DAT01-NEW | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=326-168) | 联系人、球探、教练、队伍、学期、学员的实际输入结构；示例默认值不构成已确认必填规则。 |
| 导入、导出与同步 | D18–D22 / IMPORT-ROW | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=229-495) | 映射、逐行问题与影响预览、结果、历史；源字段与导出授权需后续接口验收。 |
| 模型配置与依赖 | M01–M07 / M02-ERROR / VERSION | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-4622) | 原始值/单位→整数分数→等级；连续区间、重叠/缺口/精度错误；版本影响。示例阈值不是正式标准。 |
| 任务、确认与展示 | M08–M13 / M09-PREVIEW | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-5066) | 范围、周期与截止时间、晚录、部分名单、结果修订、层级成长配置；预览后下发。 |
| BI | B01–B05 / 4个共享状态 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-5394) | 来源、统计口径、截至时间、明细；正常/空/加载/失败/部分数据分开。 |
| 专业服务 | S01–S08 / DETAIL / EDIT / RECORD / CONFIRMED | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-6124) | 目录、需求、分派、执行与交付；球探观察；不把咨询当支付。 |
| 管理与登录 | A01–A04 / A01-NEW / X16及4状态 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-5863) | 角色和数据范围分开；账号停用/无权限/登录错误；不按姓名手机号扩大孩子访问权。 |
| 通用与适配 | X01–X15 | [查看](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-6654) | 身份/绑定/空/错/加载与320、430宽、大字状态示例；这不是微信真机验收。 |


## 当前实现与设计复核

2026-09-28 实时目录复核及首批偏差、执行批次和完成门槛见 [工程统筹基线](engineering-baseline-20260928.md)。本表是设计交接映射，不能据此把对应代码标成已验收；后续每批在其行或该基线中附上代码、接口及实际运行证据。


### 2026-10-05 实现证据补充

C03/C07/C08训练事实、C06复制、C15创建、C31确认原始成绩已有本地合成运行证据；C11已落摘要/训练下钻，C12/C13仍待O-08及服务实现。C04保留09-22已确认的线上层级选取，修复勾选/权限/回调并适配浅色风格；画稿中禁止友谊赛选择的文案与明确需求冲突，未照搬。详见implement.md及verify-c04/c11/c31-design.cjs。以上均未部署到新版develop/trial，不能据此标记整组交付或真实E2E完成。

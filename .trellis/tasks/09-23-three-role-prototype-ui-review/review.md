# 三端产品原型与 UI 评审包

2026-09-23。当前是待用户确认的设计评审版，不是已开发、已验收或已发布版本。原有 176 个页面基线保留在原 Figma 页面中；8 个独立评审页共 238 个画板，包含 62 个新增页面或状态。

## 建议确认顺序

先确认业务流程与页面信息，再确认视觉细节。方案沿用原有 TC 组件、Noto Sans SC 字体、品牌红、卡片和导航结构。使用 Figma 原生 Agents 生成增量，再通过 MCP 逐项修正并回读。

| 入口 | 重点确认 |
|---|---|
| [家长首页](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=213-348) | 孩子身份、训练数、徽章、成长事件与快捷入口 |
| [家长日程](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=213-395) | 多孩、周/月切换、活动类型、请假和冲突 |
| [家长成长](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=213-526) | 分层能力、已确认结果、不同版本趋势与评价历史 |
| [教练首页](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2144) | 队伍范围、日程与跨日任务 |
| [教练训练工作台](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2203) | 名单、出勤更正、临时球员、训练内容与测评 |
| [教练测评](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2481) | 课程→项目/人员→录入→按人确认→修订 |
| [战术板](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-2739) | 自由布置、独立名单、撤销与保存状态 |
| [后台工作台](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-29) | 预制模块的选取、分区与顺序 |
| [后台数据浏览器](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=229-491) | 分类树→表格→实际字段→保存/冲突/历史 |
| [后台模型配置](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-4622) | 原值/单位→整数分数→等级，版本与错误 |
| [后台 BI](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-5394) | 指标来源、统计口径、截至时间与缺失状态 |
| [后台专业服务](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-6124) | 目录→需求→分派→执行→交付及球探观察 |
| [后台账号与权限](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-5863) | 角色和数据范围、敏感字段、账号状态 |
| [后台登录与通用状态](https://www.figma.com/design/EyQtDtILGDZDf6neLBL6vs?node-id=214-6845) | 登录中、凭证错误、停用、无权限 |

可点击主流程入口：[家长](https://www.figma.com/proto/EyQtDtILGDZDf6neLBL6vs?node-id=213-348&starting-point-node-id=213-348)、[教练](https://www.figma.com/proto/EyQtDtILGDZDf6neLBL6vs?node-id=214-2144&starting-point-node-id=214-2144)、[后台](https://www.figma.com/proto/EyQtDtILGDZDf6neLBL6vs?node-id=214-29&starting-point-node-id=214-29)。跨端入口使用 Figma 链接，不模拟真实登录切换。

## 全量覆盖

| 评审页 | 画板数 |
|---|---:|
| 家长 | 53 |
| 教练 | 83 |
| 数据管理 | 40 |
| 评测与模型 | 16 |
| BI | 9 |
| 专业服务 | 12 |
| 管理设置 | 5 |
| 通用状态与登录 | 20 |
| 合计 | 238 |

[全量逐页目录](/Users/dongjun/projects/football-club-management/.trellis/tasks/09-23-three-role-prototype-ui-review/screen-catalog.md) · [定稿需求映射](/Users/dongjun/projects/football-club-management/.trellis/tasks/09-23-three-role-prototype-ui-review/requirements-design-map.md) · [BFF 与数据流程差距](/Users/dongjun/projects/football-club-management/.trellis/tasks/09-23-three-role-prototype-ui-review/bff-data-flow-review.md) · [设计参考研究](/Users/dongjun/projects/football-club-management/.trellis/tasks/09-23-three-role-prototype-ui-review/design-research.md)

## 需要你确认的业务点

1. C09 单课变更：教练直接生效，还是提交审批。
2. C26：清空是否二次确认、清空是否进入撤销栈，以及赛后编辑权限。
3. SC01：球探敏感档案的精细编辑权限，以及活动结束后的补人规则。
4. D01：布局保存范围是当前账号还是俱乐部共享；分区名称仍是候选文案。
5. 模型新版本：默认生效范围与历史重算策略。当前版本影响页是候选展示，不代表已经确认该发布策略。
6. 新建表单的演示默认值和可选字段需在实际数据权限合同中落实；本轮没有新增已确认业务规则。

## 验证证据与范围

- 已完成全量目录与结构回读；字体清单为 Noto Sans SC。
- 已查看 8 个完整画布总览，并对主要改造与新增状态单独截图核查。总览用于覆盖与布局检查，不能代替每个字段的逐像素验收。
- 已修正首页白底白字、日期排列和选中态、数据浏览器侧栏覆盖与表格密度、导入表头越界，以及错误的评分区间示例和交付状态。
- [原型目标审计](/Users/dongjun/projects/football-club-management/.trellis/tasks/09-23-three-role-prototype-ui-review/prototype-target-audit.json)共检查 1,066 条已设置反应（包含继承和隐藏内容），未发现目标跳回原稿或不在评审画板集合中。它不是“所有控件都已交互”的覆盖率，也不证明每条业务路径运行通过。
- 页内文本输入、筛选、分页、动态增删行、自由拖放、撤销、真实自动保存与网络重试，当前主要以页面结构、状态画板及交互合同表达；不把 Figma 导航冒充完整应用行为。
- BFF 核查仅使用本地代码，提取 106 条路由、56 个小程序页面和 217 个事件绑定。后台独立前端未在本次检索中发现。
- 已发现关键开发差距：训练记录仍可能触发金融扣课；教练未完任务依赖所选日历日期；测评条目缺实际课程关联；确认时间混作测评时间；协同教练授权范围不足。这些均已列入后续开发证据，不宣称已修复。
- 本阶段未运行业务写入、生产 API、部署、发布、提交或归档操作。环境隔离任务和原有工作区修改保留。

## 尚待图片传输授权

首页图片 Banner 的容器已设计，当前保留文字版横幅。自动审批拒绝把项目现有 `assets/venues/venue-1.jpg` 上传至当前 Figma 文件，理由是未确认该素材对外传输授权及目标归属。已通过独立问题请求用户授权；未收到回复前不重试、不换通道上传。该图片为空足球场，不含人物，但授权不能由此推定。

## 确认后的工程顺序

1. 固定本轮原型、UI 和上述业务待决项。
2. 先验收 develop / trial / release 环境隔离与服务端写入防护。
3. 落实人员身份、授权、训练事实与修改历史合同，切断训练统计和金融扣课的错误耦合。
4. 实现测评课程关联、确认/修订/版本，再接家长成长与教练任务。
5. 完成后台数据维护、模型、服务及 BI；以非生产数据做按钮→BFF→持久化→回读的可重复验证。

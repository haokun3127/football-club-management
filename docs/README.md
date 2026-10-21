# 项目文档导航

> 本目录按“当前事实、设计规格、历史档案”组织。历史文档保留以便追溯，但不代表当前实现、计划或生产状态。

## 从这里开始

- [优化后独立审计与差距矩阵](current/post-optimization-audit-2026-10-21/README.md)：40提交范围、修复证据、版本一致性、文档治理及下一周期边界。
- [唯一主开发入口](current/development-workspace.md)：各工具统一仓库与微信项目路径，辨认别名和历史副本。
- [当前交付状态与待办](current/development-delivery-channel.md)：当前源码、体验版、服务端版本、证据日期与优先级。
- [核心流程审计（2026-10-21）](current/miniprogram-core-flow-audit-2026-10-21.md)：家长/教练24步覆盖、当前Figma对照、加载采样、问题及修复顺序，逐项标注真实数据与真机验证边界。
- [GitHub 当前交接 HANDOFF-GITHUB-2026-09-08.md](../HANDOFF-GITHUB-2026-09-08.md)：2026-09-08交接快照；路径和当前交付状态优先以上述入口为准。
- [当前项目进度](current/progress.md)：历史时点日志；当前状态以交付入口和本轮审计为准。
- [项目全景（2026-09-18）](current/project-overview-cq-talent.md)：一页看懂产品面、设计权威、技术面、部署与交付状态、风险与开工前缺口；每条事实标注 `[实测]`/`[记录]`/`[未验证]` 证据等级。
- [产品需求文档 v1.2（含后续明确决定）](current/product-requirements/README.md)：本轮小程序与后台的统一需求入口，含确认状态、数据权限、验收场景和待决项；描述目标行为，不替代当前实现和发布事实。
- [当前架构](current/architecture.md)：服务、数据和模块边界。
- [API 契约](current/api-contract.md)：对外/客户端接口约定。
- [Figma 权威来源](current/figma-source-of-truth.md)：唯一在线设计基准与修改规则。
- [小程序验收](current/miniprogram-manual-acceptance-cq-talent.md)：DevTools/真机验收流程。
- [发布准备度](current/miniprogram-release-readiness-cq-talent.md)：上线前缺口与判断。
- [部署要求](current/deployment-requirements.md)：部署环境与运维要求。
- [数据能力规划](current/data-capability-plan.md)：早期数据接入与字段扩展方案；产品规则以本轮统一需求为准，技术实施另行评估。
- [后台设计背景资料](current/backoffice-product-design.md)：保留此前设计背景；本轮统一四模块需求见产品需求文档。
- [客户测试数据修复记录（2026-09-07）](current/customer-test-data-repair-2026-09-07.md)：受控生产数据重建的已验证事实与限制。

## 设计资料

- [在线画板 ID 映射](design/specifications/figma-online-frame-map-2026-08-12.md)：历史文件的画板与路由对照；当前节点必须从 Figma 权威入口进入。
- [52 张设计稿离线 PNG](design/reference/figma/)：目录内实际 52 张（该目录 README 的对照表仍只登记 49 张：家长 21 + 教练 28，少登记 `c11-1-assessment-task-create.png`、`p4-1-milestones.png`、`p4-2-training-history.png`），375 宽原尺寸。仅作历史辅助；新实现与验收必须核对当前在线Figma权威来源。
- [Figma 审计与 Token](design/figma/)：设计变量、全量实施决策和视觉审计。
- [页面规格](design/specifications/)：按家长端、教练端、批次和通用页面分类的实现规格。

这些规格来自历史 Figma 导出。页面实现和新修改必须以在线 Figma 文件为准，具体地址见“Figma 权威来源”。

## 工具链

- [DevTools 截图工具链](../scripts/devtools/README.md)：路由跳转 + 375×812 截图 + 设计稿合成对比，含全部已知坑。截图工具不替代业务断言与真机验收。

## 平台规范参考（微信官方留档）

- [微信小程序官方规范参考](reference/wechat-miniprogram/README.md)：最初于2026-09-18抓取、2026-10-14刷新的46篇腾讯官方正文（框架/配置/分包/隐私/开放能力/性能/审核运营/设计）+ 面向本项目的提炼。**动小程序代码、评审或发版前先读对应主题，避免与当前平台规范不一致**；超过约 1 个月或发版前重跑 `scripts/wechat-docs/fetch-official-docs.py` 复核。
- [本项目平台合规差距（2026-09-18）](reference/wechat-miniprogram/notes/08-本项目平台合规差距-2026-09-18.md)：含2026-10-18复核、更正与明确标注的历史记录。

## 历史档案

- [2026-08 交接快照](archive/2026-08-handoffs/)：旧 Kimi/Claude/截图 SOP 交接和安全测试账号操作记录；仅用于追溯。
- [2026-08 运行记录](archive/2026-08-operations/)：旧角色切换、登录绑定、C1 与生产演示记录；不代表当前生产状态。
- [2026-06 与 2026-08 计划](archive/2026-06-plans/) 和 [2026-08 计划](archive/2026-08-plans/)：已被后续实现或产品决策替代的阶段计划。
- [2026-08 执行计划](archive/2026-08-execution-plans/) 和 [2026-09 执行计划](archive/2026-09-execution-plans/)：已完成批次的 agent 施工计划和验证上下文。
- [早期调研与 WPS 资料](archive/)：早期评估、调研和阶段性决策。阅读前先确认日期，并以 `current/` 文档为准。

当前没有独立维护的 `docs/plans/active/` 计划目录。新工作须通过 `.trellis/tasks/` 建立任务，并在完成后将阶段性计划归档。

## 维护规则

1. 持续维护的事实文档放入 `current/`；不要在历史文档中静默改写过去的结论。
2. 设计规格放入 `design/`；新页面的在线设计节点、截图和验收证据应写入对应规格。
3. 完成或替代的计划移入 `archive/YYYY-MM-*`，并在文首注明其历史状态。
4. 新增文档前先判断是否应更新现有文档；避免再次平铺创建相同主题的文件。

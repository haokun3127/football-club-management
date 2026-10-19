# 项目文档导航

> 本目录按“当前事实、设计规格、历史档案”组织。历史文档保留以便追溯，但不代表当前实现、计划或生产状态。

## 从这里开始

- [唯一主开发入口](current/development-workspace.md)：各工具统一仓库与微信项目路径，辨认别名和历史副本。
- [当前交付状态与待办](current/development-delivery-channel.md)：当前源码、体验版、服务端版本、证据日期与优先级。
- [GitHub 当前交接 HANDOFF-GITHUB-2026-09-08.md](../HANDOFF-GITHUB-2026-09-08.md)：2026-09-08交接快照；路径和当前交付状态优先以上述入口为准。
- [当前项目进度](current/progress.md)：逐日事实、已知阻塞和真实验证状态；最新记录在文件末尾。
- [当前架构](current/architecture.md)：服务、数据和模块边界。
- [API 契约](current/api-contract.md)：对外/客户端接口约定。
- [Figma 权威来源](current/figma-source-of-truth.md)：唯一在线设计基准与修改规则。
- [小程序验收](current/miniprogram-manual-acceptance-cq-talent.md)：DevTools/真机验收流程。
- [发布准备度](current/miniprogram-release-readiness-cq-talent.md)：上线前缺口与判断。
- [部署要求](current/deployment-requirements.md)：部署环境与运维要求。
- [数据能力规划](current/data-capability-plan.md)：数据接入与字段扩展的当前规划。
- [后台产品设计](current/backoffice-product-design.md)：运营后台的当前产品资料。
- [客户测试数据修复记录（2026-09-07）](current/customer-test-data-repair-2026-09-07.md)：受控生产数据重建的已验证事实与限制。

## 设计资料

- [在线画板 ID 映射](design/specifications/figma-online-frame-map-2026-08-12.md)：Figma 画板 ↔ 小程序路由对照，复原任务的施工图纸。
- [49 张设计稿离线 PNG](design/reference/figma/)：家长 21 + 教练 28，375 宽原尺寸，含画板↔文件对照表。仅作历史辅助；新实现与验收必须核对当前在线Figma权威来源。
- [Figma 审计与 Token](design/figma/)：设计变量、全量实施决策和视觉审计。
- [页面规格](design/specifications/)：按家长端、教练端、批次和通用页面分类的实现规格。

这些规格来自历史 Figma 导出。页面实现和新修改必须以在线 Figma 文件为准，具体地址见“Figma 权威来源”。

## 工具链

- [DevTools 截图工具链](../scripts/devtools/README.md)：路由跳转 + 375×812 截图 + 设计稿合成对比，含全部已知坑。视觉验收全靠它。

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

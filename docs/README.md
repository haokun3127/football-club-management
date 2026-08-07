# 项目文档导航

> 本目录按“当前事实、设计规格、历史档案”组织。历史文档保留以便追溯，但不代表当前实现或当前计划。

## 从这里开始

- [当前项目进度](current/progress.md)：正在推进的工作、已知阻塞和真实验证状态。
- [当前架构](current/architecture.md)：服务、数据和模块边界。
- [API 契约](current/api-contract.md)：对外/客户端接口约定。
- [Figma 权威来源](current/figma-source-of-truth.md)：唯一在线设计基准与修改规则。
- [小程序验收](current/miniprogram-manual-acceptance-cq-talent.md)：DevTools/真机验收流程。
- [发布准备度](current/miniprogram-release-readiness-cq-talent.md)：上线前缺口与判断。
- [部署要求](current/deployment-requirements.md)：部署环境与运维要求。
- [Agent 交接文档（2026-08-07）](current/agent-handover-2026-08-07.md)：工作区、hotfix worktree、生产状态、未完成任务和交接规则。
- [数据能力规划](current/data-capability-plan.md)：数据接入与字段扩展的当前规划。
- [后台产品设计](current/backoffice-product-design.md)：运营后台的当前产品资料。

## 设计资料

- [Figma 审计与 Token](design/figma/)：设计变量、全量实施决策和视觉审计。
- [页面规格](design/specifications/)：按家长端、教练端、批次和通用页面分类的实现规格。

这些规格来自历史 Figma 导出。页面实现和新修改必须以在线 Figma 文件为准，具体地址见“Figma 权威来源”。

## 计划与历史

- [当前计划](plans/active/)：仍待决策或外部依赖未解决的工作。
- [历史档案](archive/)：早期评估、调研、已过期计划和阶段性决策。阅读前先确认日期，并以 `current/` 文档为准。

## 维护规则

1. 持续维护的事实文档放入 `current/`；不要在历史文档中静默改写过去的结论。
2. 设计规格放入 `design/`；新页面的在线设计节点、截图和验收证据应写入对应规格。
3. 完成或替代的计划移入 `archive/YYYY-MM-*`，并在文首注明其历史状态。
4. 新增文档前先判断是否应更新现有文档；避免再次平铺创建相同主题的文件。

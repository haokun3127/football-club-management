# 项目文档入口

**所有现行规范统一从 [docs/spec/README.md](spec/README.md) 进入。** 此目录是唯一的人和 Agent 文档导航；散落的旧交接和任务文件不再作为规范来源。

| 想了解 | 前往 | 用法 |
| --- | --- | --- |
| 产品与权限 | [产品 Spec](spec/product.md) | 当前约束 |
| 技术架构 | [架构入口](spec/architecture.md) | 版本化架构边界 |
| API / 安全 / 数据 | [API 契约](spec/api/README.md) | 当前规范正文已集中 |
| Figma / 视觉还原 | [视觉保真与验收](spec/visual-fidelity.md) | 在线画板为设计权威 |
| 研发流程与提交 | [工作流](spec/workflow.md) | 与托管 Trellis 协作 |
| 检查、截图、发布 | [质量门禁](spec/quality-gates.md) / [截图操作说明](spec/visual-capture-runbook.md) | 必须记录证据 |
| 文档生命周期 | [治理规则](spec/governance.md) / [ADR](decisions/README.md) | 单一权威、冲突解决 |
| 最近已确认状态 | [当前交接快照](status/current.md) | 带日期和 commit |
| 历史设计和画板 | [Figma 变更台账](current/figma-source-of-truth.md) / [原始设计规格](design/specifications/) / [离线参考图](design/reference/figma/) | **参考/证据，不代替在线 Figma** |
| 旧计划与历史材料 | [归档](archive/README.md) / [任务证据](../.trellis/tasks/) | 不自动作为当前需求 |

### 兼容说明

`.trellis/workflow.md` 是工具管理的任务阶段机制，必须保留；`.trellis/spec/`、`PRODUCT.md`、原 `docs/current/` 部分路径仍作为旧引用的薄跳转入口存在，不能据此创建平行 Spec。运行事实若有新变化先验证后更新 [状态](status/current.md)。

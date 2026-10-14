# 文档目录（唯一索引）

| 当前想查什么 | 唯一入口 | 规则 |
| --- | --- | --- |
| 全部现行项目规范 | [docs/spec](spec/README.md) | 现行规范仅在此编辑 |
| 产品/架构/API/安全 | [产品](spec/product.md) · [架构](spec/architecture.md) · [API](spec/api/README.md) | 保持单一权威 |
| Figma 在线基准和节点定位 | [Figma 登记](spec/figma-current-registry.md) · [视觉保真](spec/visual-fidelity.md) | 线上画板是唯一设计权威 |
| 部署/数据安全 | [运行手册](spec/operations/deployment.md) | 任何生产操作必须再验证授权和状态 |
| 交付与质量标准 | [质量门禁](spec/quality-gates.md) · [研发流程](spec/workflow.md) | 功能/视觉/发布分别验收 |
| 本期已核实状态 | [时间戳快照](status/current.md) | 未验证不冒充当前事实 |
| 变更为什么这样做 | [ADR](decisions/README.md) | 可追溯决策 |
| 旧版本为什么不同 | [历史档案](archive/README.md) · [设计参考](design/reference/figma/README.md) | 不作为现行 Spec |
| 任务和开发证据 | [Trellis tasks](../.trellis/tasks/) | 证据库，不自动变成规范 |

历史 `docs/current/` 只保留兼容入口；`docs/design/` 保留非权威设计参考；`.trellis/spec` 为工作流兼容入口和只读思考指南。新增项目规范一律经 [治理规则](spec/governance.md) 定位后写入 `docs/spec/`。

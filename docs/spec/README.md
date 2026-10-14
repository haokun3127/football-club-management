# 项目规范中心 — 单一现行入口

> Status: **Active** | Owner: Engineering / Product | Reviewed 2026-10-14.

**原则：每项现行约束只有一个可写正文。** 任务、交接、历史导出均只用于取证，不能从旧日志抽取规范替代本目录。

| 权威领域 | 规范文件 |
| --- | --- |
| 产品范围和数据真实性 | [product.md](product.md) |
| 架构边界 | [architecture.md](architecture.md) |
| BFF、安全、会话、持久化契约 | [api/README.md](api/README.md) |
| Figma 当前节点定位（先现场验证） | [figma-current-registry.md](figma-current-registry.md) |
| 视觉保真 / DevTools 证据 | [visual-fidelity.md](visual-fidelity.md) · [visual-capture-runbook.md](visual-capture-runbook.md) |
| 项目研发流程与 Trellis 附加约束 | [workflow.md](workflow.md) |
| 质量门禁 | [quality-gates.md](quality-gates.md) |
| 部署运维安全 | [operations/deployment.md](operations/deployment.md) |
| 文档生命周期 / 冲突治理 | [governance.md](governance.md) |
| 技术取舍 / 当前已核实状态 | [ADR](../decisions/README.md) · [status](../status/current.md) |

**工具例外**：`AGENTS.md` 和 `.trellis/workflow.md` 留在工具预期位置；`.trellis/spec/api/backend/` 只保存重定向，`.trellis/spec/domain/*` 与未填写模板不是现行规则。[完整文档导航](../README.md)。

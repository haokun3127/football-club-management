# 项目规范中心（唯一项目级入口）

> Status: **Active** | Owner: **Engineering / Product** | Reviewed: 2026-10-14

所有项目级**现行要求**从此目录进入。不要从任务日志、旧交接、设计导出或历史批次中推断当前规则。文档使用 Docs-as-Code；规范随代码同分支评审和版本化。

## 阅读顺序（人和 Agent 一致）

1. [产品边界](product.md) —— 用户、职责、权限、真实数据规则。
2. [现行技术边界](architecture.md) 和 [API/安全契约](api/README.md)。
3. [Figma 与视觉还原](visual-fidelity.md) —— 在线设计权威、运行态证据和例外。
4. [研发流程](workflow.md) 与 [交付门禁](quality-gates.md)。
5. [文档治理](governance.md)、[ADR](../decisions/README.md)、[当前状态](../status/current.md)。

## 文档类别与单一权威来源

| 信息域 | 唯一权威 | 备注 |
| --- | --- | --- |
| 项目产品原则 | `docs/spec/product.md` | 根目录 PRODUCT.md 仅兼容入口 |
| 技术架构与边界 | `docs/spec/architecture.md` | 运行中的代码、迁移与 OpenAPI 用于实证校验 |
| API/会话/种子/测试账号契约 | `docs/spec/api/` | Trellis 原路径为只读兼容跳转 |
| 视觉设计内容 | [在线 Figma](https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/) | 本库 [visual-fidelity.md](visual-fidelity.md) 规定实施与验收方法 |
| 开发阶段与任务生命周期 | `.trellis/workflow.md` | Trellis 托管入口，不搬动；项目补充规则在 workflow.md |
| 项目质量与验收 | `docs/spec/quality-gates.md` | 仅自动测试绿色不得认定视觉通过 |
| 当前接手与已知阻塞 | `docs/status/current.md` | 带时间戳的经确认快照，不假定最新生产情况 |
| 重大取舍 | `docs/decisions/` | ADR 追加状态，不覆写历史理由 |
| 任务施工与历史证据 | `.trellis/tasks/`、`docs/archive/` | 证据，不作为现行规范 |

## 约束

- 一个规范问题只有一个可写源文件；其它入口只做简短指针。首次修改要在此索引找到归属，不能随意新建 `*-plan.md`、`HANDOFF*.md`。
- 临时计划只能放在 Trellis task 内。历史页面设计资料 `docs/design/specifications/` 是对照材料，除非指定并复核在线节点，否则**不能**视作当前视觉权威。
- 与实现冲突时：安全/数据契约先停止并审查；在线 Figma 决定视觉意图，后端真实数据与权限决定哪些内容可显示。不能用假数据解决差异。
- 文档集中不等于移动生成目录或破坏工具入口：`AGENTS.md` 和 `.trellis/workflow.md` 保留在工具预期路径，但只指向当前规范。

本轮整理的范围和遗留项见 [文档治理](governance.md)。

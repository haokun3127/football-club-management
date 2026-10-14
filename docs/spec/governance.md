# 单一权威文档治理

> Status: **Active** | Owner: Engineering / Product | Reviewed 2026-10-14.

采用 Docs-as-Code 与 ADR：产品/接口/视觉/运行手册分别拥有**唯一可写正文**，旧路径只作兼容入口；不建立 `*-final`、`*-v2`、新 HANDOFF 作为第二份合同。现行索引见 [spec/README](README.md)。

## 权威矩阵

- 产品和品牌：[product.md](product.md)。以在线 Figma 与代码 Token 校验设计细节，不允许 `PRODUCT.md` 的旧颜色再次变成执行依据。
- BFF/身份/持久化：[api](api/README.md)。API 真实行为还需 Schema、已核验 OpenAPI 和回归测试核验；安全冲突必须停止而不是自行放宽。
- UI：[在线 Figma](https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/)。[定位登记](figma-current-registry.md) 是带日期索引，非 Figma 替代品。遗留图只作为历史参考。
- 流程：受托管 `.trellis/workflow.md` 决定任务机制，[项目 overlay](workflow.md) 决定质量要求；两者不可随意复制。
- 交接事实：[status](../status/current.md)。未验证最新实例不能自称当前发布。
- 决策：[ADR](../decisions/README.md)。新决策必须写明取代链。

## 文档状态与生命周期

新规范必须声明 Status / Owner / Reviewed；兼容旧路径必须标注 Superseded/Historical 和 canonical 链接。通过 PR 审核后才从 Draft 变为 Active；重大变更写 ADR；历史档案不删除，只限制作为执行权威的入口。

## 自动规则

提交前运行 `node scripts/docs-governance.mjs --strict` 与 `node --test scripts/docs-governance.test.mjs`。CI 对新规范/入口的失效本地链接、兼容路径完整性、重复正文、错置新增规范、过时品牌色和移动后失效路径 **fail closed**；历史文档存在的旧链接只汇报、不做整仓硬拦截。例外需更新唯一登记的 [策略文件](../../scripts/docs-governance-policy.json)，不可在多个脚本里分散 allowlist。

本轮仍待解决：历史任务上下文的外部路径/图片、运行态视觉证据的补拍；CI 绿色只证明文档基础结构正确，不能代表当前 Figma 或生产已验证。

# 文档治理与收敛规则

> Status: **Active** | Owner: **Engineering** | Reviewed: 2026-10-14

## 1. 范围与原则

采用 **Docs-as-Code + Diátaxis（用途分层）+ ADR** 的简化实践：解释“为什么”的决策、约束“必须怎么做”的规范、解释“如何操作”的运行手册、保留“当时发生什么”的证据分开维护。**先消歧义，再搬迁**，绝不通过复制形成第二权威。

## 2. 生命周期

每份现行文档在开头声明 `Status: Draft | Active | Superseded | Historical`、负责人及最近核验日期；没有日期的记录不得推断为“当前”。变更流程为：查找唯一权威 → 提交冲突与影响范围 → 变更同一源文件 → 审核链接/路径/受影响测试 → 以一条提交记录变更。大变更写 ADR，ADR 状态为 Proposed/Accepted/Superseded，并标注取代关系。

旧文档不直接消失：保留在 `docs/archive/` 或用薄兼容跳转指出新位置，避免已有任务/引用断链。历史任务 `.trellis/tasks/` 为不可变施工档案，不自动注入为规范；新工作只有一份活跃 PRD + 实施计划。

## 3. 权威冲突处理

1. **实际行为、安全与数据**：源代码、迁移、Schema/OpenAPI、真实读回是核验依据；与已批准契约矛盾时先暂停变更并修订设计/测试，不擅自以当前实现覆盖安全规则。
2. **视觉与交互**：当前在线 Figma 节点为唯一视觉设计源，代码及离线图为实现和审计证据。节点不明确时不得据历史截图猜测。
3. **流程**：Trellis `.trellis/workflow.md` 是工具受控的阶段机制，本文件的 [工作流](workflow.md) 为项目范围的附加验收门禁，不重复拷贝工作流全文。
4. **技术决策**：已采纳 ADR 优先于较旧的建议/规划；新决策需明确 supersedes。任务日志/交接中的过时命令不能凌驾于规范。
5. **状态**：`docs/status/current.md` 只记录注明时间的已核验信息；生产当前状态必须重新现场验证。

## 4. 禁止的做法

- 无需新来源时又建 `*-v2.md`、`*-final.md`、多套 Spec；同名结论分散在任务/README/交接中各维护一份。
- 在稳定规范中逐日追加过程日志；过程日志留在 Task，规范只保留稳定约束和必要示例。
- 将过期 `docs/design/specifications`、离线 PNG 或历史 PRD 标为“已视觉验收”。
- 批量搬运 `.trellis/workflow.md`、修改托管块 `AGENTS.md` 或删除被任务/脚本引用的历史目录。

## 5. 本轮审计（2026-10-14，GitHub dev 1453e54）

- 发现 644 份 Markdown，其中 483 份位于 `.trellis/tasks/`。历史任务应保持可追溯而非改写。
- `docs/current/progress.md` 是巨量时间序列日志，降级为历史事件流；新 Agent 从 [当前状态](../status/current.md) 开始，不能把旧段落当最新结论。
- `PRODUCT.md` 的旧品牌色 `#E60012` 与现行 Token `#A80F1B` 冲突，统一以 [产品](product.md) + 代码 Token + 在线 Figma 为准。
- `docs/design/specifications` 与在线 V3/V6 画板并非天然一一等价，旧规格仅用于核对原意。
- `.trellis/spec/api/backend` 的五份真实活动规范迁到 `docs/spec/api/`，原路径保留薄入口；`.trellis/spec/domain/*` 等模板型、未填写规范暂不当作项目规则。

## 6. 后续清退清单（需要在项目本地执行和复核）

- 对全部 Markdown 做引用图和相对链接校验；清点生成器/脚本中的硬编码路径，确认后分批迁移 `docs/current/` 仍有用的运行手册。
- 对每个产品路由建立设计三元组、实际截图证据、适用版本，淘汰过时的设计文本，不直接删历史设计稿。
- 将进度日志按月份归档，仅在 `docs/status/current.md` 保留简明的 verified/unverified/blocker 快照。
- 增加 CI 的 Markdown 相对链接、必须 frontmatter、禁双权威/旧路径的检测；门禁生效前不能宣称全仓文档已收敛。

# 工程与交付质量门禁

> Status: **Active** | Owner: **QA / Engineering** | Reviewed: 2026-10-14

每条验收结论必须有 `commit SHA + 环境 + 操作或命令 + 输出/截图 + 日期`。不能把“代码符合静态断言”写成“运行界面已还原”，也不能把“本地通过”写成“生产已部署”。

| Gate | 必须证明 | 没有证据时 |
| --- | --- | --- |
| Contract | API/会话/权限/租户边界未退化；OpenAPI 兼容变化已审核 | Blocked |
| Code | `pnpm@10.33.0` 的相关 typecheck、测试、根 `check`、diff check 实际通过 | Not run |
| Data | 真正的后端读回、授权用户上下文、必要 SQLite 关闭重启与回读 | Data blocked |
| Visual | 当前在线 Figma 对应节点与同态 375×812 运行截图对比通过 | Visual not checked |
| Release | 验证版本与发布版本一致，有回滚点、保密审计及部署后 health/readback | Not released |
| Documentation | 只有一个规范权威；索引/相对链接/原路径兼容被验证，ADR/状态更新 | Docs not accepted |

视觉和功能分开打勾；部分状态已完成不能外推到整个页面族。生产访问、数据库改写、测试数据导入和部署需要明确授权；GitHub push、LocalHarness pull、微信 IDE 编译及线上 API 部署是**不同事件**。

**文档治理批次验收**：改变规范前核对旧路径引用；仅 doc-only 文件变更也要做链接检查、冲突检索和根检验（如环境可运行）。无法在当前环境执行时报告未执行，不得冒称通过。不要新建会和 Trellis 钩子冲突的平行过程。

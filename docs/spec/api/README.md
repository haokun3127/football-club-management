# API、身份与持久化契约

> Status: **Active** | Owner: **API / Security** | Reviewed: 2026-10-14

此目录保存具有执行约束的现行契约，已从 Trellis 独立目录集中收录。**不要**在新任务里再次向 `.trellis/spec/api/backend/*.md` 写另一套正文；这些旧路径只作兼容入口。

- [小程序 BFF 详细契约](app-client-bff-contracts.md)
- [双角色会话与令牌](active-role-sessions.md)
- [微信手机号 seed 重启规则](phone-binding-seed.md)
- [受控测试账号操作](secure-test-account-operations.md)
- [API 质量标准](quality-guidelines.md)

[原 API 概览](../../current/api-contract.md) 仍可做导读，但不是完整的最新 endpoint 列表。实际 endpoints、schema、错误返回以 `GET /openapi.json` 对应的**已核验部署版本**、本分支的 `apps/api/src/routes/` 和测试为准。二者不符时标记 discrepancy，不能擅自降低身份隔离、持久化或测试要求。

读写边界：小程序只调 app-client API；需要登录/session 的真实用户态不能用测试账号假 token、开发 header 或伪角色代替。涉及生产库、真实手机号或受控 seed 的操作独立审批、备份与回读。

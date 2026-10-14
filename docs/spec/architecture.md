# 技术架构权威入口

> Status: **Active index; implementation must be verified** | Owner: **Architecture** | Reviewed: 2026-10-14

本页只定义**模块边界**，不复制详细历史架构快照。原 `docs/current/architecture.md` 保留为有日期的说明记录；实现细节需核对对应 `dev` 提交、数据库迁移和 OpenAPI。

- `apps/api/`：Fastify API、授权与租户边界、SQLite 持久化、WPS/Excel 数据接入、小程序 BFF。
- `packages/domain/`：领域模型、度量/业务规则。
- `apps/miniprogram-cq-talent/`：微信原生小程序；仅使用受控 app-client BFF，不复制后台 API 字段。
- `scripts/`：截图、开发/测试与受控操作脚本。
- `.trellis/`：工具托管生命周期与历史任务证据，不是产品规范的第二套源。

关键设计不变量：club scope、guardian binding、coach scope、真实会话、数据持久化，以及接口/生产执行的安全边界见 [API 契约](api/README.md)。需要更改数据库、身份、BFF 或部署行为时先提交 ADR 并给出回滚与重启读回证据。阅读 [历史架构快照](../current/architecture.md) 时必须确认其日期和适用版本，不得直接作为线上现状断言。

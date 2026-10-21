# 当前实现架构

复核：2026-10-21，代码基线 `68921a8d`。本页描述实现，不改变 [产品需求](product-requirements/README.md)。旧实体设计和2026-07交接事实保存在[历史架构](../archive/architecture-before-2026-10-21.md)。

- `packages/domain`：类型、业务计算与校验；`apps/api`：Fastify 5、路由/应用服务/仓储；`apps/backoffice`：Umi/React 管理界面；`apps/miniprogram-cq-talent`：原生 TypeScript/WXML/WXSS 小程序。
- API 使用 Node 24 的 `node:sqlite`，当前仓库有 43 个 SQL 迁移文件，运行入口/迁移和持久化实现分别见 `apps/api/src/index.ts`、`src/migrate.ts`、`src/persistence/`。数量是源码事实，不是线上库盘点。
- 单实例 SQLite、短事务、版本冲突与留痕是当前工程边界。没有本轮实测的 DAU/吞吐 SLA；不以历史“500日活”说法作容量保证，也不启动数据库重构。
- 小程序经 app-client BFF 使用真实微信手机号连接器与 Bearer 会话；服务器对 active role、guardian、教练队伍和具体动作授权。后台使用自己的认证与授权；客户端隐藏按钮不构成权限控制。
- 训练事实在 `training-records`，系统按课程结束时刻对账；人工修正优先、取消课不计次、请假/撤回追加历史。课包账本独立，训练记录不会自动扣账。
- 测评工作流区分原始值、分值、等级，草稿、确认与修订；家长只读取已确认版本。教练队伍评价是独立沟通记录，不是测评发布数量或能力分。
- 后台已有资料、导入、评分映射、模型、标准、任务、BI、服务资源路由；“有路由/表单”不代表全部客户数据和跨端流程验收。标准的家长适用匹配、C34服务跟进等差距见[矩阵](post-optimization-audit-2026-10-21/product-gap-matrix.md)。

细节以 `apps/api/src/routes/`、应用服务、数据库迁移和[包级开发规范](../../.trellis/spec/api/backend/index.md)共同核对。运维边界见[部署要求](deployment-requirements.md)，版本状态只从[交付入口](development-delivery-channel.md)读取。

# 本任务提交计划（待一次确认）

开始前有282项未提交工作。这里只拟提交本任务增量；未执行 git add/commit/push。当前可工作源码依赖原有后台认证及共同业务WIP，不能把它们自动混入本任务。

## 拟提交

1. `feat(backoffice): add framework management and shared business workflows`：管理端、固定资源/关系/课程/权限及历史、版本配置与教学、类型化导入/BI/服务/内容和相关迁移/测试。
2. `docs(backoffice): record integration contracts and local acceptance`：规格、BO矩阵与本任务计划记录。

### 本任务新增路径

以下是基线后新增或本任务拥有的路径（不包含构建产物、临时数据库和凭证）：

- `.trellis/spec/api/backend/backoffice-integration.md`
- `.trellis/spec/api/backend/backoffice-management.md`
- `.trellis/tasks/archive/2026-10/10-10-backoffice-assessment-models/`
- `.trellis/tasks/archive/2026-10/10-10-backoffice-data-management/`
- `.trellis/tasks/archive/2026-10/10-10-backoffice-framework-completion/`
- `.trellis/tasks/archive/2026-10/10-10-backoffice-framework-shell/`
- `.trellis/tasks/archive/2026-10/10-10-backoffice-imports-bi/`
- `.trellis/tasks/archive/2026-10/10-10-backoffice-services-integration/`
- `apps/api/db/migrations/0031_backoffice_management.sql`
- `apps/api/db/migrations/0032_training_catalog_status.sql`
- `apps/api/db/migrations/0033_assessment_mapping_versions.sql`
- `apps/api/db/migrations/0034_assessment_project_metadata.sql`
- `apps/api/db/migrations/0035_assessment_mapping_lineage.sql`
- `apps/api/db/migrations/0036_backoffice_model_definitions.sql`
- `apps/api/db/migrations/0037_backoffice_standards.sql`
- `apps/api/db/migrations/0038_backoffice_teaching_authorization.sql`
- `apps/api/db/migrations/0039_backoffice_import_batches.sql`
- `apps/api/db/migrations/0040_backoffice_bi_snapshots.sql`
- `apps/api/db/migrations/0041_backoffice_services.sql`
- `apps/api/db/migrations/0042_backoffice_content.sql`
- `apps/api/db/migrations/0043_backoffice_import_secrets.sql`
- `apps/api/src/application/backoffice-assessment-tasks.ts`
- `apps/api/src/application/backoffice-bi.ts`
- `apps/api/src/application/backoffice-content-resources.ts`
- `apps/api/src/application/backoffice-content.ts`
- `apps/api/src/application/backoffice-document-projections.ts`
- `apps/api/src/application/backoffice-exports.ts`
- `apps/api/src/application/backoffice-import-special.ts`
- `apps/api/src/application/backoffice-imports.ts`
- `apps/api/src/application/backoffice-management.ts`
- `apps/api/src/application/backoffice-mappings.ts`
- `apps/api/src/application/backoffice-model-composition.ts`
- `apps/api/src/application/backoffice-model-types.ts`
- `apps/api/src/application/backoffice-models.ts`
- `apps/api/src/application/backoffice-plans.ts`
- `apps/api/src/application/backoffice-resources.ts`
- `apps/api/src/application/backoffice-service-resources.ts`
- `apps/api/src/application/backoffice-standards.ts`
- `apps/api/src/application/backoffice-training-records.ts`
- `apps/api/src/application/backoffice-value-validation.ts`
- `apps/api/src/application/backoffice-workbench.ts`
- `apps/api/src/http/backoffice-bi-schemas.ts`
- `apps/api/src/http/backoffice-import-schemas.ts`
- `apps/api/src/http/backoffice-management-schemas.ts`
- `apps/api/src/http/backoffice-mapping-schemas.ts`
- `apps/api/src/http/backoffice-model-schemas.ts`
- `apps/api/src/http/backoffice-plan-schemas.ts`
- `apps/api/src/http/backoffice-standard-schemas.ts`
- `apps/api/src/http/backoffice-task-schemas.ts`
- `apps/api/src/http/backoffice-workbench-schemas.ts`
- `apps/api/src/http/club-presentation-schemas.ts`
- `apps/api/src/persistence/assessment-mapping-repository.ts`
- `apps/api/src/persistence/backoffice-bi-repository.ts`
- `apps/api/src/persistence/backoffice-import-repository.ts`
- `apps/api/src/persistence/backoffice-management-repository.ts`
- `apps/api/src/persistence/backoffice-model-repository.ts`
- `apps/api/src/persistence/backoffice-standard-repository.ts`
- `apps/api/src/routes/backoffice-bi.routes.ts`
- `apps/api/src/routes/backoffice-import.routes.ts`
- `apps/api/src/routes/backoffice-management.routes.ts`
- `apps/api/src/routes/backoffice-mapping.routes.ts`
- `apps/api/src/routes/backoffice-model.routes.ts`
- `apps/api/src/routes/backoffice-plan.routes.ts`
- `apps/api/src/routes/backoffice-standard.routes.ts`
- `apps/api/src/routes/backoffice-task.routes.ts`
- `apps/api/test/backoffice-management.test.ts`
- `apps/backoffice/.eslintrc.cjs`
- `apps/backoffice/.gitignore`
- `apps/backoffice/LICENSE.ant-design-pro`
- `apps/backoffice/README.md`
- `apps/backoffice/config/config.ts`
- `apps/backoffice/package.json`
- `apps/backoffice/public/favicon.svg`
- `apps/backoffice/src/app.tsx`
- `apps/backoffice/src/global.css`
- `apps/backoffice/src/global.d.ts`
- `apps/backoffice/src/pages/Workspace.tsx`
- `apps/backoffice/src/pages/bi.tsx`
- `apps/backoffice/src/pages/catalog.tsx`
- `apps/backoffice/src/pages/grants.tsx`
- `apps/backoffice/src/pages/imports.tsx`
- `apps/backoffice/src/pages/management.tsx`
- `apps/backoffice/src/pages/mappings.tsx`
- `apps/backoffice/src/pages/model-display.tsx`
- `apps/backoffice/src/pages/models.tsx`
- `apps/backoffice/src/pages/plans.tsx`
- `apps/backoffice/src/pages/resource-export.tsx`
- `apps/backoffice/src/pages/scouts.tsx`
- `apps/backoffice/src/pages/standards.tsx`
- `apps/backoffice/src/pages/tasks.tsx`
- `apps/backoffice/src/pages/training-records.tsx`
- `apps/backoffice/src/pages/workbench.tsx`
- `apps/backoffice/src/services/api.ts`
- `apps/backoffice/src/services/download.ts`
- `apps/backoffice/src/styles.d.ts`
- `apps/backoffice/test/api.test.ts`
- `apps/backoffice/tsconfig.json`
- `apps/backoffice/vitest.config.ts`
- `docs/current/backoffice-delivery-2026-10-10.md`
- `packages/domain/src/score-mapping.ts`
- `packages/domain/test/assessment-mappings.test.ts`
- `packages/domain/test/score-mapping.test.ts`
- `patches/rc-util@5.44.4.patch`
- `scripts/backoffice/local-fixture.ts`

### 共享文件：仅本任务修改块

以下路径可能含原有WIP，确认后仍须逐块暂存并核对暂存diff，不能整文件提交。框架/auth前置基线若未提交，保留在工作树并单独列出依赖，不擅自纳入。

- `.dockerignore`
- `.gitignore`
- `Dockerfile`
- `docker-compose.yml`
- `package.json`：仅 `dev:backoffice` 脚本增量
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `apps/api/src/server.ts`
- `apps/api/src/store.ts`
- `apps/api/src/http/openapi.ts`
- `apps/api/src/http/schemas.ts`
- `apps/api/src/application/assessment-workflow.ts`
- `apps/api/src/application/assessment-workflow-types.ts`
- `apps/api/src/persistence/platform-persistence.ts`
- `apps/api/src/persistence/assessment-repositories.ts`
- `apps/api/src/persistence/assessment-task-repository.ts`
- `apps/api/src/persistence/assessment-workflow-repository.ts`
- `apps/api/src/persistence/session-plan-repository.ts`
- `apps/api/src/routes/app-client.routes.ts`
- `apps/api/test/persistence.test.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/assessment-services.ts`
- `packages/domain/src/assessment.ts`
- `packages/domain/src/training.ts`
- `packages/domain/src/metric-graph-services.ts`
- `.trellis/spec/api/backend/index.md` / `backoffice-management.md` / `backoffice-integration.md`：本任务规则与入口。
- `.trellis/spec/api/frontend/*.md`：React/Umi实际架构与质量门禁增量。
- `.trellis/spec/api/backend/assessment-publication.md`：两段映射增量。

- `apps/api/src/routes/backoffice-web.routes.ts`
- `apps/api/src/http/backoffice-errors.ts`
- `apps/api/src/persistence/scout-player-repository.ts`
- `apps/api/src/persistence/data-capability-repositories.ts`
- `apps/api/src/data-capability/types.ts`
- `apps/api/src/http/assessment-workflow-schemas.ts`
- `apps/api/test/assessment-workflow.test.ts`

### 原有改动（默认排除）

完整基线见 `research/working-tree-baseline.txt`。除以上明确本任务修改块外，默认不纳入，包括小程序所有既有改动、既有认证/环境运维脚本和其他文档。若某块无法可靠区分，停留未暂存而非猜测。

回复“行”确认按此范围逐块核对/提交；回复“我自己来”则保留工作树供手工提交。不自动推送。提交后才进入Trellis归档和日记，session_auto_commit=false。

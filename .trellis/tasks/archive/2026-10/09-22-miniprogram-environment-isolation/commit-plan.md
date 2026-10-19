# 待用户确认的提交方案

尚未 git add/commit/push。工作区原有 31 项改动未覆盖。

## 1. fix: isolate mini-program environments and guard production writes

以下为本任务独立文件（只在提交前再次核验差异后纳入）：

- `.trellis/spec/api/backend/environment-isolation.md`
- `.trellis/spec/api/backend/index.md`
- `apps/api/src/dev.ts`
- `apps/api/src/http/environment-guard.ts`
- `apps/api/src/index.ts`
- `apps/api/src/migrate.ts`
- `apps/api/src/persistence/platform-persistence.ts`
- `apps/api/src/persistence/runtime-database.ts`
- `apps/api/src/runtime/environment.ts`
- `apps/api/src/server.ts`
- `apps/api/test/environment-isolation.test.ts`
- `apps/miniprogram-cq-talent/README.md`
- `apps/miniprogram-cq-talent/pages/coach/assessment-bulk-entry/index.test.mjs`
- `apps/miniprogram-cq-talent/pages/coach/assessment-bulk-entry/index.ts`
- `apps/miniprogram-cq-talent/pages/coach/team-ability/index.ts`
- `apps/miniprogram-cq-talent/pages/coach/team-selector/index.test.mjs`
- `apps/miniprogram-cq-talent/pages/coach/team-selector/index.ts`
- `apps/miniprogram-cq-talent/pages/coach/training/index.ts`
- `apps/miniprogram-cq-talent/pages/parent/binding/index.ts`
- `apps/miniprogram-cq-talent/scripts/smoke-app-client.mjs`
- `apps/miniprogram-cq-talent/utils/api.test.mjs`
- `apps/miniprogram-cq-talent/utils/config.ts`
- `apps/miniprogram-cq-talent/utils/environment-isolation.test.mjs`
- `apps/miniprogram-cq-talent/utils/match-event-draft.ts`
- `apps/miniprogram-cq-talent/utils/reminders.ts`
- `apps/miniprogram-cq-talent/utils/request.test.mjs`
- `apps/miniprogram-cq-talent/utils/request.ts`
- `apps/miniprogram-cq-talent/utils/store.test.mjs`
- `apps/miniprogram-cq-talent/utils/store.ts`
- `deploy/environment-isolation/compose.nonproduction.yml`
- `deploy/environment-isolation/nginx-locations.conf`
- `docker-compose.yml`
- `docs/current/deployment-requirements.md`
- `docs/current/miniprogram-environment-isolation.md`
- `scripts/verify-environment-startup.mjs`

- 本任务目录中的 task.json、prd.md、design.md、implement.md、verification.md、commit-plan.md。

## 混合文件

- `apps/miniprogram-cq-talent/project.config.json`：仅纳入新增 environment-isolation.test.mjs 的忽略条目；保留用户原有 JSON 格式变化，不整文件暂存。
- `.trellis/spec/miniprogram/frontend/configuration-and-packaging.md` 与 `docs/reference/wechat-miniprogram/notes/08-本项目平台合规差距-2026-09-18.md` 是会话开始前就存在的未跟踪文件。本任务只追加环境隔离契约/变更记录。它们没有 HEAD 基线，无法在不带入既有内容的前提下单独提交尾部追加；默认保留工作区，待原文件先提交后再按增量纳入，不擅自提交全文。

## 排除的既有工作

- `.gitignore`
- `.trellis/config.yaml`
- `AGENTS.md`
- `docs/README.md`
- `docs/current/backoffice-product-design.md`
- `docs/current/data-capability-plan.md`
- `docs/current/progress.md`
- `package.json`

- 既有 `.trellis/spec/miniprogram/` 其余文件。
- 09-09 同步任务、09-18 全栈准备任务、09-22 教练产品评审任务、09-22 家长 TabBar 任务。
- 既有自动截图 PNG/JSON。
- 既有 docs/current 产品评审/需求/upgrade-readiness 文件、docs/reference 留档、scripts/miniprogram-policy 和 scripts/wechat-docs。

## 后续账目

工作提交完成且混合规范文件处理范围明确后，再按 Trellis finish-work 执行本任务归档及 journal；不归档其他任务、不 push、不部署或发布。当前先停在可审查结果，不自动执行这些提交。

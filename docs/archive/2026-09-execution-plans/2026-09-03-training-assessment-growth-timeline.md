# Training Assessment and Growth Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate classroom training-content scores from semester assessment tasks and expose a real parent growth timeline with attended/expected lesson counts.

**Architecture:** Persist training scores at event/student/project granularity. Bind semester assessments to a team, a term and a task id. Extend the existing parent growth-summary read model to aggregate only the authenticated child’s real training, match and ability-update history.

**Tech Stack:** TypeScript, Fastify, SQLite migrations/repositories, WeChat Mini Program WXML/WXSS, Vitest, Figma MCP.

## Global Constraints

- Online Figma file `zZ6wKyOHKcO4UYXDd9jGwv` is the visual source of truth.
- No fake API responses, fake roles, or frontend sample records.
- WXML must not invoke JS array methods; calculate display fields in TypeScript.
- Use path-limited `git add`; never stage unrelated dirty worktree files.
- Implement every behavior red → green → refactor, then commit each batch independently.

---

### Task 1: Persist classroom training-content scores

**Files:**
- Modify: `apps/api/src/data-capability/types.ts`, `apps/api/src/store.ts`, `apps/api/src/routes/app-client.routes.ts`
- Create: `apps/api/src/persistence/training-content-assessment-repository.ts`, `apps/api/db/migrations/0018_training_content_assessments.sql`
- Test: a focused API route test

- [x] Write failing route tests for invalid scope and restart-safe round-trip.
- [x] Add the migration and repository with event/student/project upsert semantics.
- [x] Add coach read/write route backed by real selected project ids and present participants.
- [x] Run focused API tests and typecheck.
- [ ] Commit only this batch.

### Task 2: Bind semester tasks to teams and submitted assessments

**Files:**
- Modify: `packages/domain/src/assessment.ts`, `packages/domain/src/assessment-services.ts`, `apps/api/src/data-capability/types.ts`, `apps/api/src/persistence/assessment-task-repository.ts`, `apps/api/src/persistence/assessment-repositories.ts`, `apps/api/src/routes/app-client.routes.ts`
- Create: `apps/api/db/migrations/0019_assessment_task_scope.sql`
- Test: API task and assessment route tests

- [x] Write failing tests for task team/term validation and task-owned completion count.
- [x] Add migration/type/repository mappings.
- [x] Require `taskId` on semester assessment submission and calculate progress from persisted task id.
- [x] Run focused API tests and typecheck.
- [ ] Commit only this batch.

### Task 3: Implement coach full-screen entry flows

**Files:**
- Create: `apps/miniprogram-cq-talent/pages/coach/training-assessment/index.{json,ts,wxml,wxss,test.mjs}`
- Modify: `apps/miniprogram-cq-talent/app.json`, `utils/api.ts`, `utils/types.ts`, `pages/coach/event/index.{ts,wxml,test.mjs}`, `pages/coach/test-tasks/index.{ts,wxml,test.mjs}`, `pages/coach/test-task-create/index.{ts,wxml,test.mjs}`, `pages/coach/assessment-entry/index.{ts,wxml,test.mjs}`

- [ ] Read and update C2/C11/C15 online Figma screens before code changes.
- [ ] Write failing route/payload tests.
- [ ] Implement minimal full-screen UI and TS view models.
- [ ] Run focused mini-program tests, TypeScript and WXML/WXSS compile.
- [ ] Capture trusted 375×812 screenshots and commit only this batch.

### Task 4: Expose parent lesson stats and growth timeline

**Files:**
- Modify: `apps/api/src/routes/app-client.routes.ts`, `apps/miniprogram-cq-talent/utils/{api.ts,types.ts}`, `pages/parent/growth/index.{ts,wxml,wxss,test.mjs}`, `pages/parent/milestones/index.{ts,wxml,wxss,test.mjs}`
- Test: API parent growth tests and page tests

- [x] Write failing tests for `attendedLessons/expectedLessons`.
- [ ] Add child-scoped mixed timeline records from persisted training scores, matches and metric records.
- [x] Update P4 hero with `已到/应到课时` after Figma context was reread; online Figma write remains blocked by current MCP read-only permission.
- [ ] Run focused tests, full gate, Figma/runtime screenshot comparison and commit only this batch.

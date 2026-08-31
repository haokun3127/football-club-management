# 三层指标训练内容规划实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将教练端训练内容选择升级为基于指标图谱三层视图的可搜索、多选、可保存训练动作目录，并保持旧训练项目保存接口兼容。

**Architecture:** API 使用纯投影函数从 `MetricViewNode` 构造一级/二级/三级目录，三级节点按 `TrainingDrill.metricIds` 关联动作；响应追加 `contentTree` 和球队上下文但保留旧 `projects`。小程序在 TypeScript 中预计算三层导航、动作卡片和选择状态，WXML 只渲染字段；球队选择通过稳定 `teamId` 贯穿训练首页、目录读取和活动上下文。

**Tech Stack:** TypeScript, Fastify, SQLite seed/persistence patterns, Vitest, 微信小程序 WXML/WXSS, `npx --yes pnpm@10.33.0`。

## Global Constraints

- 在线 Figma `zZ6wKyOHKcO4UYXDd9jGwv` 是视觉权威；没有真实 375×812 截图不能宣称视觉通过。
- 不触碰当前工作区其他未提交/未跟踪改动；每批仅使用路径限定 `git add`。
- WXML 不调用 `.map()`、`.filter()`、`.slice()`、`.indexOf()` 等 JS 方法；展示字段在 TS view model 中预计算。
- `quantityLabel` 表示剂量；`durationMinutes` 表示预计时长，缺少剂量时显示“剂量待设置”。
- API 变更后必须 build 并重启本地 API；不得手改 `dist/`。
- 生产数据和日志不得包含手机号、密码、token 或数据库绝对路径。

---

### Task 1: 三层目录投影与训练动作领域字段

**Files:**
- Modify: `packages/domain/src/training.ts`
- Modify: `apps/api/src/seed/cq-talent-assessment-model.ts`
- Create: `apps/api/src/application/training-content-catalog.ts`
- Create: `apps/api/src/application/training-content-catalog.test.ts`

**Interfaces:**
- Consumes: `AbilityMetric`, `MetricView`, `MetricViewNode`, `TrainingDrill` and their already club-filtered arrays.
- Produces: `TrainingContentTree`, `TrainingContentMetricNode`, `quantityLabel`, and `buildTrainingContentTree(input)` for the route layer.

- [ ] **Step 1: Write the failing projection tests**

  Cover: a three-level node chain returns the expected levels; a drill linked to two tertiary metrics appears under both nodes but keeps one ID; invalid parent/metric nodes are ignored; sibling ordering uses `sortOrder`; `quantityLabel` is preserved separately from `durationMinutes`.

- [ ] **Step 2: Run the focused test and verify it fails**

  Run:

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/api exec vitest run src/application/training-content-catalog.test.ts
  ```

  Expected: FAIL because the projection module and `quantityLabel` field do not exist.

- [ ] **Step 3: Implement the smallest pure projection**

  Add explicit exported types and a pure `buildTrainingContentTree` function. Use maps keyed by stable IDs, build only nodes reachable from valid roots, copy `TrainingDrill.metricIds`, `difficulty`, `durationMinutes`, `coachingPoints`, and optional `quantityLabel`, and return empty `drills` arrays for valid tertiary nodes without matches. Add `quantityLabel` to generated catalog drills with deterministic Chinese demo values, without changing `durationMinutes` semantics.

- [ ] **Step 4: Run domain/API typecheck and focused tests**

  Run:

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/domain typecheck
  npx --yes pnpm@10.33.0 --filter @football-club/api typecheck
  npx --yes pnpm@10.33.0 --filter @football-club/api exec vitest run src/application/training-content-catalog.test.ts
  ```

  Expected: all pass.

- [ ] **Step 5: Commit only this batch after review**

  ```powershell
  git add packages/domain/src/training.ts apps/api/src/seed/cq-talent-assessment-model.ts apps/api/src/application/training-content-catalog.ts apps/api/src/application/training-content-catalog.test.ts
  git diff --cached --check
  git commit -m "feat(api): model three-level training content catalog"
  ```

### Task 2: API route contract and team-scoped catalog read

**Files:**
- Modify: `apps/api/src/routes/app-client.routes.ts`
- Modify: `apps/api/src/http/schemas.ts`
- Modify: `apps/api/src/http/openapi.ts` only if operation metadata needs the new query shape
- Modify: `apps/api/test/server.test.ts`
- Modify: `apps/api/src/store.ts` only if a shared team-scope helper is required by the existing implementation

**Interfaces:**
- Consumes: `buildTrainingContentTree`, existing catalog readers, `collectCoachScope`, and the current `coach/training-project-tree` route.
- Produces: optional `teamId` query, `team`, `teamOptions`, and `contentTree`; legacy `dimensions` and `projects` remain present.

- [ ] **Step 1: Add failing route contract tests**

  Extend the existing training tree test to assert `contentTree.nodes[0].level === 1`, the descendant levels are `2` and `3`, a tertiary node contains Chinese drills with `quantityLabel`, and legacy `projects` remains available. Add a request with an inaccessible `teamId` and assert a structured `403`/`404` according to the existing coach scope behavior.

- [ ] **Step 2: Run the route tests and verify the new assertions fail**

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/server.test.ts -t "training project tree"
  ```

- [ ] **Step 3: Implement route composition and validation**

  Parse `teamId`, resolve coach auth/scope once, validate the selected team belongs to the coach-visible scope, call the projection with the full active view, and serialize the new fields. Keep route authentication before store reads. Reuse one `summarizeTrainingDrill` projection for legacy and new fields.

- [ ] **Step 4: Run API tests, build and restart the local API**

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/server.test.ts -t "training project tree"
  npx --yes pnpm@10.33.0 --filter @football-club/api typecheck
  npx --yes pnpm@10.33.0 --filter @football-club/api build
  ```

  Restart the local API using the repository's documented command, then read the real coach endpoint and verify the response contains `contentTree`, `team`, and `teamOptions` without secrets.

- [ ] **Step 5: Commit only the API contract batch**

  ```powershell
  git add apps/api/src/routes/app-client.routes.ts apps/api/src/http/schemas.ts apps/api/src/http/openapi.ts apps/api/test/server.test.ts
  git diff --cached --check
  git commit -m "feat(api): expose three-level training content tree"
  ```

### Task 3: Client contract and content-select view model

**Files:**
- Modify: `apps/miniprogram-cq-talent/utils/types.ts`
- Modify: `apps/miniprogram-cq-talent/utils/api.ts`
- Modify: `apps/miniprogram-cq-talent/pages/coach/content-select/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/coach/content-select/index.test.mjs`

**Interfaces:**
- Consumes: API `contentTree`, `teamOptions`, `quantityLabel`, and existing workbench readback.
- Produces: `TrainingContentTree` client types and precomputed page fields for primary/secondary/tertiary navigation and action cards.

- [ ] **Step 1: Add failing client tests**

  Add fixtures with one primary, two secondary, three tertiary nodes and duplicate cross-linked drills. Assert the normalizer preserves levels and quantity, the page defaults to the first valid secondary, filters by tertiary/search text, deduplicates selected IDs, computes a duration summary without calling it a dosage, and preserves selection on save failure. Assert the WXML remains free of forbidden method calls.

- [ ] **Step 2: Run the focused mini-program tests and verify failure**

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/content-select/index.test.mjs
  ```

- [ ] **Step 3: Implement normalizers and view-model reducers**

  Extend `normalizeTrainingProjectTree` without discarding legacy fields. Add pure helpers that flatten valid tree nodes into page-safe views, use existing local SVGs for stable fallback icons, map `quantityLabel` to its own field, and compute all visible groups before `setData`. Do not add `.map()`/`.filter()`/`.slice()` calls to WXML.

- [ ] **Step 4: Run focused tests and mini-program typecheck**

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/content-select/index.test.mjs
  npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
  ```

- [ ] **Step 5: Commit the client contract/view-model batch**

  ```powershell
  git add apps/miniprogram-cq-talent/utils/types.ts apps/miniprogram-cq-talent/utils/api.ts apps/miniprogram-cq-talent/pages/coach/content-select/index.ts apps/miniprogram-cq-talent/pages/coach/content-select/index.test.mjs
  git diff --cached --check
  git commit -m "feat(miniprogram): normalize three-level training catalog"
  ```

### Task 4: Figma-shaped three-level content-select layout

**Files:**
- Modify: `apps/miniprogram-cq-talent/pages/coach/content-select/index.wxml`
- Modify: `apps/miniprogram-cq-talent/pages/coach/content-select/index.wxss`
- Modify: `apps/miniprogram-cq-talent/pages/coach/content-select/index.ts` only for missing view fields/events
- Modify: `apps/miniprogram-cq-talent/pages/coach/content-select/index.test.mjs`

**Interfaces:**
- Consumes: Task 3's precomputed `primaryNodes`, `secondaryNodes`, `tertiaryGroups`, `actionCards`, selection and summary fields.
- Produces: a full-screen, non-modal three-level training content chooser with a fixed bottom operation bar.

- [ ] **Step 1: Add failing markup/style assertions**

  Assert the template contains primary and secondary navigation, tertiary group headings, two-column action-card classes, separate `quantityLabel`/duration fields, stable `<image mode="aspectFit">` rendering, and no WXML JS method calls. Assert the stylesheet has safe bottom padding, fixed navigation, two-column cards, and narrow-width overflow guards.

- [ ] **Step 2: Run the page test and observe the failure**

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/content-select/index.test.mjs
  ```

- [ ] **Step 3: Implement the layout**

  Replace the flat category strip/list with the Figma-shaped hierarchy: fixed top navigation/search, horizontal primary capability strip or compact primary rail, secondary vertical rail, tertiary group headings, two-column drill cards, and bottom “临时超级组 / 完成” bar. Keep action detail as a full-screen navigation/inline state, not a popup. Use Chinese labels and existing SVG resources.

- [ ] **Step 4: Compile and run focused tests**

  Run the focused Vitest and TypeScript checks, then use the trusted WeChat Developer Tools MCP compile path to confirm WXML/WXSS compilation. Fix only errors in this page batch.

- [ ] **Step 5: Capture and compare a real 375×812 screenshot**

  Navigate to a real writable training event in the coach session, compile first, capture outside the Desktop root under the project `tmp` or `C:\Users\ASUS\cq-talent-visual-evidence`, compare with the current online Figma training-content board, and record static/API/visual evidence separately.

- [ ] **Step 6: Commit the visual batch**

  ```powershell
  git add apps/miniprogram-cq-talent/pages/coach/content-select/index.wxml apps/miniprogram-cq-talent/pages/coach/content-select/index.wxss apps/miniprogram-cq-talent/pages/coach/content-select/index.ts apps/miniprogram-cq-talent/pages/coach/content-select/index.test.mjs
  git diff --cached --check
  git commit -m "feat(miniprogram): restore three-level training picker layout"
  ```

### Task 5: Team selector integration and end-to-end audit

**Files:**
- Modify: `apps/miniprogram-cq-talent/utils/api.ts`
- Modify: `apps/miniprogram-cq-talent/utils/types.ts`
- Modify: `apps/miniprogram-cq-talent/pages/coach/training/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/coach/training/index.wxml`
- Modify: `apps/miniprogram-cq-talent/pages/coach/team-selector/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/coach/team-selector/index.wxml`
- Modify: related page tests for training and team selector
- Modify: `docs/current/progress.md` and the handover record after acceptance only

**Interfaces:**
- Consumes: API `teamOptions`, optional `teamId`, and Task 3's client catalog context.
- Produces: stable selected-team storage, team-aware training home/content navigation, and audit evidence.

- [ ] **Step 1: Add failing team-ID tests**

  Assert a stored team ID is preferred, an old stored team name is migrated to its matching ID, the training home sends `teamId`, and switching teams changes the next training/content read request.

- [ ] **Step 2: Implement the smallest shared selection boundary**

  Add a single storage/parser helper or extend the existing team-selector contract. Keep old team-name fields for compatibility, but use IDs for requests and display the selected team name from server data.

- [ ] **Step 3: Verify API data separation**

  With at least two accessible teams, read training home, team detail, and content tree for each `teamId`; confirm events, member counts, and selected team context change while the club-level catalog remains intentionally shared.

- [ ] **Step 4: Run the full relevant gates**

  ```powershell
  npx --yes pnpm@10.33.0 run check
  npx --yes pnpm@10.33.0 --filter @football-club/api build
  npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
  git diff --check
  ```

- [ ] **Step 5: Capture final runtime evidence and update docs**

  Compile the mini-program, capture the selected-team and three-level picker routes at 375×812 under the evidence directory, record API readback and visual comparison separately, append the task outcome to `docs/current/progress.md`, and update the handover record with remaining limitations.

- [ ] **Step 6: Commit documentation and final task batch**

  ```powershell
  git add docs/current/progress.md docs/current/agent-handover-*.md .trellis/tasks/08-31-three-level-training-content
  git diff --cached --check
  git commit -m "docs: record three-level training content rollout"
```

## Completion record — 2026-08-31

- Task 1–5 implementation and focused verification are complete in commits `d1637fa`, `bb19b2d`, `e54a8d6`, and `1a9a27c`.
- API contract, three-level projection, team context, client normalizer, WXML/WXSS layout, and persistence readback are covered by the repository checks. The persistence regression confirms that a saved training session plan remains readable after closing and reopening SQLite.
- WeChatIDE MCP runtime verification reached `pages/coach/content-select/index` with a real `375×812` simulator screenshot. Selecting a real drill and pressing “选择 (1)” completed without the previous save-readback error.
- Screenshot outputs are isolated under the system temporary directory; no new screenshot was written to the Desktop root during this run.
- The old `implementation checklist` checkboxes above are retained as historical plan text; this completion record is the authoritative execution result for this task.

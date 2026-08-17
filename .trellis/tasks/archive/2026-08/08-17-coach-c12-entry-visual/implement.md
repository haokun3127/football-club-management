# C12 Project Score Entry Implementation Plan

> **For agentic workers:** execute this page-local plan inline; do not alter API contracts, role/session state, production data, or unrelated dirty paths.

**Goal:** Restore the C12 first viewport to the online Figma hierarchy while retaining all real assessment fields, local drafts, validation, and submit behavior.

**Architecture:** The page continues to load a real coach workbench and assessment form. TypeScript adds a compact, derived display label to each visible metric. WXML places the multi-group/field navigation after the learner roster so the first viewport is task summary plus learner cards; WXSS constrains metric labels to one compact line. Existing handlers remain the sole way to change groups/fields and submit real scores.

**Tech Stack:** WeChat Mini Program, TypeScript, WXML, WXSS, Vitest, Figma MCP, DevTools screen capture.

## Global Constraints

- Online Figma `zZ6wKyOHKcO4UYXDd9jGwv`, C12 node `93:1030`, is the visual authority.
- Real production-backed C12 route: `pages/coach/test-entry/index?eventId=event-cq-talent-demo-training-upcoming`.
- Keep WXML free of `.map()`, `.filter()`, `.slice()`, `.indexOf()` and preserve real API/role/draft/submit behavior.
- Do not stage any pre-existing dirty files outside this task.

---

### Task 1: Reclaim the C12 first viewport for the Figma learner list

**Files:**
- Modify: `apps/miniprogram-cq-talent/pages/coach/test-entry/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/coach/test-entry/index.wxml`
- Modify: `apps/miniprogram-cq-talent/pages/coach/test-entry/index.wxss`
- Modify: `apps/miniprogram-cq-talent/pages/coach/test-entry/index.test.mjs`
- Modify: `docs/design/specifications/coach/design-spec-C12-project-score-entry.md`
- Modify: `docs/current/progress.md`

**Consumes:** Existing `AssessmentForm.fields`, `fieldsInGroup`, `fieldIndex`, `presentDraftRow`, and group/field event handlers.

**Produces:** A truthful compact `MetricCell.label`, Figma-aligned first-screen ordering, and a regression asserting the learner roster precedes field navigation in markup.

- [x] **Step 1: Write the failing regression test**

  Add a C12 test asserting that `c12-student-list` appears before `c12-field-navigation` in the WXML source, and that the first card metric label uses `displayLabel` rather than the unconstrained full label.

- [x] **Step 2: Run the test to verify it fails**

  Run:

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent test -- pages/coach/test-entry/index.test.mjs
  ```

  Expected: the new first-viewport ordering assertion fails because the field navigation currently precedes the learner list.

- [x] **Step 3: Apply the smallest page-local implementation**

  1. Add `displayLabel` to the TypeScript metric cell view model, derived from the real field label and constrained to the existing one-line visual capacity without inventing a different metric.
  2. Move the existing group/field navigation markup after the learner list and label it `c12-field-navigation`; retain the same handlers/data bindings.
  3. Render `displayLabel` in card cells and constrain its WXSS to one line so real long labels cannot grow card height.
  4. Keep the fixed submit bar and all score-input bindings unchanged.

- [x] **Step 4: Run focused checks and typecheck**

  ```powershell
  npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent test -- pages/coach/test-entry/index.test.mjs
  npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
  git diff --check
  ```

- [x] **Step 5: Rebuild and visually re-verify**

  Navigate to the real upcoming-training C12 route, obtain a fresh `375x812` DevTools simulator capture, compare it against the Figma screenshot, and classify remaining differences as system pixels, real data, or code defects.

- [ ] **Step 6: Record, full-check, and commit only task-owned paths**

  Update the C12 design specification and progress log with the online node, real route, screenshot paths, and verdict. Run the workspace check, then use path-limited `git add --` for the four C12 source/test files plus task/docs evidence before committing and pushing.

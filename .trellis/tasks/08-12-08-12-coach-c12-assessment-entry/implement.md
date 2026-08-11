# C12 Implementation Plan

1. Add focused failing tests for compact real metric cells, bounded four-column projection, truthful blank values, and preservation of current field, draft and submit behavior.
2. Inspect the existing C12 controller and reuse its field/draft helpers; add only page-local view-model fields and handlers needed to bind an input to its real test-item ID.
3. Replace the C12 WXML/WXSS hierarchy with the Figma header, 96px summary, student-card field grid and fixed 70px submit composition. Preserve C12.1 modal and coach tab.
4. Run the C12 focused Vitest suite, mini-program typecheck and `git diff --check`; then run the root quality gate.
5. Terra reviews the diff and evidence. On approval, update progress/task records and make one path-scoped commit.

## Validation

`npx.cmd --yes pnpm@10.33.0 exec vitest run apps/miniprogram-cq-talent/pages/coach/test-entry/index.test.mjs`

`npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent run typecheck`

`npx.cmd --yes pnpm@10.33.0 run check`

`git diff --check`

No runtime screenshot result is implied by these commands.

## Execution record

- RED: the focused C12 suite failed as intended because the old controller had no `metricCells` projection and wrote every compact input against the selected first field.
- GREEN: the focused C12 suite passed `15/15` after the page projected a maximum four real fields per student and used each input cell's real `testItemId`.
- Gate: root `check` passed with domain `19/19`, mini-program `306/306`, API `85/85`; TypeScript and `git diff --check` passed. No new 375x812 runtime screenshot was captured in this batch.

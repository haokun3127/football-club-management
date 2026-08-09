# C10 Implementation Plan

1. Add focused C10 and C2 tests first. RED covers missing ID zero requests,
   concurrent reads, merged duplicate group membership, stable selected IDs,
   missing duration, invalid/cancelled/mismatched workbench, zero selection,
   single-flight save, save/readback failure preservation, exact readback, C2
   training routing, safe WXML, and no sample facts.
2. Replace only the C10 page controller, template, styles, configuration, and
   required C2 route. Use existing API helpers unchanged. Add only Figma C10
   assets whose glyph has no faithful local equivalent.
3. Run focused tests, Mini Program package test and typecheck, task validation,
   and `git diff --check`. Do not stage, commit, deploy, or claim a device
   visual comparison.

## Allowed Files

- `apps/miniprogram-cq-talent/pages/coach/content-select/index.json`
- `apps/miniprogram-cq-talent/pages/coach/content-select/index.ts`
- `apps/miniprogram-cq-talent/pages/coach/content-select/index.wxml`
- `apps/miniprogram-cq-talent/pages/coach/content-select/index.wxss`
- `apps/miniprogram-cq-talent/pages/coach/content-select/index.test.mjs`
- `apps/miniprogram-cq-talent/pages/coach/event/index.ts`
- `apps/miniprogram-cq-talent/pages/coach/event/index.test.mjs`
- Direct C10 Figma icon assets only when no verified equivalent exists
- `.trellis/tasks/08-10-coach-training-content-select-figma-alignment/**`

## Evidence (2026-08-10)

- RED: the focused C10/C2 command failed on the old page with 8 assertions:
  missing-ID reads, no parallel workbench read, incorrect selection/deduplication,
  missing readback guard, invalid workbench save surface, the legacy header, and
  the C2 training route still pointing at C8.
- GREEN: `pnpm.cmd --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/content-select/index.test.mjs pages/coach/event/index.test.mjs` passed 2 files / 13 tests.
- `pnpm.cmd --filter @football-club/miniprogram-cq-talent typecheck` passed.
- `pnpm.cmd --filter @football-club/miniprogram-cq-talent test` passed 35 files / 166 tests.
- The direct C10 target and check assets are node exports only; existing local
  chevron and search assets were retained. No device or simulator visual
  comparison was performed or claimed.

# C8 Implementation Plan

1. Add `pages/coach/training/index.test.mjs` first. Run it RED against the
   legacy C10 page and assert explicit current-month home range, parallel
   coach-home/team reads, trailing-30-day labels, training-only cards, monthly
   match count, null attendance `--`, hidden absent participant count, error
   clearing, non-coach zero requests, and the three permitted navigations.
   Add static checks that C10 read/write/search paths, stale component
   registrations, Figma samples, and WXML helper calls are absent.
2. Replace the page-local controller, template, styles, and component registry
   with the read-only C8 projection. Use precomputed labels and visibility
   flags; do not alter API utilities or shared components.
3. Run the focused C8 test RED then GREEN, the Mini Program package test and
   typecheck, `git diff --check`, and task validation. Do not claim a visual
   screenshot comparison or stage, commit, or deploy.

## Execution Evidence

- RED: `pages/coach/training/index.test.mjs` failed 4/4 against the legacy C10
  implementation, including the missing explicit current-month range, missing
  C8 projection, missing permitted event navigation, and stale component
  registrations.
- GREEN: the focused C8 test passed 4/4 after the page-local read-only
  projection replaced C10 controls.
- Package verification: Mini Program tests passed 153/153 across 33 files;
  Mini Program typecheck passed. The final diff and task validation are run as
  the completion gate. No device or simulator visual comparison was performed.

## Allowed Files

- `apps/miniprogram-cq-talent/pages/coach/training/index.json`
- `apps/miniprogram-cq-talent/pages/coach/training/index.ts`
- `apps/miniprogram-cq-talent/pages/coach/training/index.wxml`
- `apps/miniprogram-cq-talent/pages/coach/training/index.wxss`
- `apps/miniprogram-cq-talent/pages/coach/training/index.test.mjs`
- `.trellis/tasks/08-10-coach-training-management-figma-alignment/**`

# C9 Implementation Plan

1. Add the focused page test first and run it against the current page. Cover
   null team, a real team with no members, null attendance, safe request
   failure, non-coach zero requests, trailing-30-day labels, real radar ID
   navigation, local pink navigation, component registration, no Figma samples,
   and declarative WXML.
2. Replace only the page-local controller, template, styles, and component
   registry. Reuse the existing left-chevron asset and make no API, utility,
   shared-component, app configuration, or backend change.
3. Re-run the focused test, Mini Program package tests and typecheck, task
   validation, and `git diff --check`. Do not stage, commit, deploy, or claim a
   device visual comparison.

## Execution Evidence

- RED: the new focused C9 test failed 5/5 against the legacy page, showing the
  fabricated fallback team name, lost hero for a member-empty real team, unsafe
  stale/error handling, absent local navigation, and stale component registry.
- GREEN: the focused C9 test passed 5/5 after replacing the controller and
  template with the page-local API projection.
- Package verification: Mini Program tests passed 158/158 across 34 files and
  Mini Program typecheck passed. Device and simulator visual comparison were
  not performed.

## Allowed Files

- `apps/miniprogram-cq-talent/pages/coach/team/index.json`
- `apps/miniprogram-cq-talent/pages/coach/team/index.ts`
- `apps/miniprogram-cq-talent/pages/coach/team/index.wxml`
- `apps/miniprogram-cq-talent/pages/coach/team/index.wxss`
- `apps/miniprogram-cq-talent/pages/coach/team/index.test.mjs`
- `.trellis/tasks/08-10-coach-team-detail-figma-alignment/**`

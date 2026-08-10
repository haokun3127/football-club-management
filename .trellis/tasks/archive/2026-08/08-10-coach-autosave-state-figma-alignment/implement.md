# C12.1 Implementation Plan

1. Add RED focused tests for valid/current draft selection, out-of-scope and empty rejection, latest local timestamp, Continue/Exit behavior, guards, stale load success/failure, and Figma structure/style restrictions.
2. Add page-local modal state, a load token, local-draft projection, and guards to the existing C12 controller. Reuse the existing workbench/form validation and draft storage functions.
3. Add the WXML event mask/modal and direct Figma check asset. Keep all modal labels safe and all draft mutation paths unchanged.
4. Run the focused test, mini-program typecheck, full mini-program test suite, task validation, and diff check.

## Rollback

Revert only this child task's page/asset files and parent-child pointer. No database, API, or stored draft migration is involved.

## Evidence

- RED: `pnpm.cmd --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/test-entry/index.test.mjs` failed `4/11` on the unmodified page: no resume state, no out-of-scope projection, no stale-load guard, and no C12.1 modal structure.
- GREEN: the same focused command passed `11/11`; mini-program typecheck passed; full mini-program tests passed `45 files / 225 tests`; `task.py validate 08-10-coach-autosave-state-figma-alignment` and `git diff --check` passed.
- This is static/page-level evidence only. No simulator or device screenshot was taken and no runtime visual-acceptance claim is made.

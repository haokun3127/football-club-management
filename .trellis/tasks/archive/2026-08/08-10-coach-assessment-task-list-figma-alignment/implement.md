# C11 implementation plan

1. Inspect C11 page and existing coach assessment task/entry APIs before editing.
2. Replace only C11's local render model, interaction handlers, WXML/WXSS/JSON and tests; add the direct Figma back-arrow asset if needed.
3. Implement TS-side status, date, progress and filter view models, conservative navigation and safe API errors. Use independent success and in-flight markers so an empty successful response remains refreshable, while initial `onShow` and repeated `onShow` calls do not duplicate or overlap requests.
4. Add focused regression tests for coach guard, status/filter behavior, zero/count clamp, navigation, safe failures, successful empty-list refresh, first-load non-duplication and in-flight refresh protection.
5. Run focused tests, package typecheck and package test suite. Review the exact diff and protected-file boundary.
6. Controller reviews the result, explicitly stages this task's white-list, commits code, then archives the task in a separate bookkeeping commit.

## Rollback point

If existing C11 API/entry constraints cannot support a required UI behavior honestly, retain current API behavior and return to planning rather than fabricating an action or modifying protected backend work.

## Evidence (2026-08-10)

- RED: `pnpm.cmd --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/test-tasks/index.test.mjs` failed 5 expected assertions against the old page: no precomputed visible view model, status-unrestricted entry route, backend error exposure, no empty-list return refresh, and legacy header/create surface.
- GREEN: the same focused command passed 1 file / 7 tests.
- `pnpm.cmd --filter @football-club/miniprogram-cq-talent typecheck` passed.
- `pnpm.cmd --filter @football-club/miniprogram-cq-talent test` passed 36 files / 173 tests.
- `c11-arrow-left.svg` is the direct export of Figma `zZ6wKyOHKcO4UYXDd9jGwv` node `93:1002`; no screenshot comparison was performed or claimed.

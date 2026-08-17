# Implementation plan — Coach C11 assessment task list restoration

1. Confirm online Figma node `93:1002`, its checked-in C11 geometry specification, current controller/template/styles/test, and the unchanged `getCoachAssessmentTasks()` contract.
2. Extend `index.test.mjs` with failing assertions for the Figma new-action/FAB hooks, menu-inset protected nav, unconditional chevron, real-data-only source, and honest unavailable create action. Run the focused test and record the red result.
3. Make the smallest TS/WXML/WXSS changes in `pages/coach/test-tasks`: compute the new presentation fields, keep role/status guards, render Figma header/FAB/chevrons, and route both new affordances to the unavailable handler. Rerun the focused test until green.
4. Run mini-program typecheck, `git diff --check`, and `npx --yes pnpm@10.33.0 run check`. If DevTools is reachable after a user-visible IDE compile, attempt the documented 375x812 screen-pixel capture and record the exact outcome without overstating it.
5. Update `docs/current/progress.md` and `docs/design/specifications/coach/design-spec-C11-test-tasks.md`, stage only C11 source/test/task/doc paths, commit, push `dev`, and archive C11 before moving to C12.

## Risk points and rollback

- Do not embed Figma sample task data or introduce task creation.
- Do not replace the existing in-progress/template guard with a visual-only shortcut.
- Keep all data transformation in TypeScript; no WXML helper methods.
- Preserve the existing non-coach, loading, empty, and error states.
- Revert only the isolated C11 commit if the restored layout causes an integration regression.

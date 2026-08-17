# Implementation plan — Coach C10/C10.1 restoration

1. Confirm C10/C10.1 online Figma nodes and checked-in specs; inspect existing page controllers, WXML/WXSS, tests, API contracts, and training-page entry points.
2. Add focused failing source/behavior tests for C10 compact layout and dynamic selection summary; implement minimal C10 TS/WXML/WXSS changes; rerun the focused test until green.
3. Add focused failing source/behavior tests for C10.1 header/card/track layout and non-fabricated coverage presentation; implement minimal C10.1 TS/WXML/WXSS changes; rerun the focused test until green.
4. Run mini-program typecheck, affected Vitest files, `git diff --check`, and the repository gate. If DevTools is reachable, capture the two routes through the documented 375x812 screen-pixel path and record the exact result.
5. Update `docs/current/progress.md`, validate the task artifacts, stage only this task's source/tests/docs paths, commit, push `dev`, and archive this task before starting C11.

## Risk points and rollback

- Do not replace real project/coverage responses with Figma examples.
- Do not add a C10.1 write endpoint or a misleading confirmation result.
- Avoid WXML method calls; retain computed arrays/labels in TypeScript.
- The compact C10 card must preserve the existing tap target and selected state.
- Revert only the isolated commit if an integration issue occurs.

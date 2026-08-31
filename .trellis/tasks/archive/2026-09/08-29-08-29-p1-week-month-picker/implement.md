# P1 周日历展开月历改版 — 实施计划

1. [x] Read current online P1 frames, tokens and components; create the three revised Figma states without altering historical frames.
2. [x] Capture Figma screenshots and record the new node identifiers in the task context.
3. [x] Read the mini-program specifications and current P1 code. Add targeted failing/updated tests for collapsed/expanded date-picker behavior.
4. [x] Implement the smallest TypeScript/WXML/WXSS change set, keeping template logic declarative and all derived fields in TypeScript.
5. [x] Run targeted tests, TypeScript check and `git diff --check`.
6. [x] Obtain a 375x812 mini-program screenshot after compile, compare it to the new Figma state, update documentation and prepare a path-limited commit.

## Close-out evidence (2026-09-01)

- Figma V3: weekly `1442:185`, expanded `1444:185`, empty `1442:351`; all screenshot-read at `375×812` without modifying historical P1 frames.
- Mini-program: real parent session weekly screenshot captured at `375×812`; expanded state was clicked in WeChatIDE MCP, data confirmed `isMonthPickerExpanded=true`, and the raw capture was normalized only with the repository evidence script.
- Validation: `vitest` covering `components/role-tabbar` and both P1 suites passed `29/29`; `tsc --noEmit` succeeded; path-limited `git diff --check` has no whitespace errors.

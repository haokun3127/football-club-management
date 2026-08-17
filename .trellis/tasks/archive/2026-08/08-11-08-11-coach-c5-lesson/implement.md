# C5 execution plan

1. Record the dirty-worktree baseline and allow only this task's files: its Trellis directory, the parent task link, `pages/coach/lesson/**`, `pages/coach/lesson-correction/**`, and any targeted test/document files. Do not edit or stage the existing project configuration, SVGs, docs tree or workbook.
2. Verify the existing lesson confirmation/correction BFF endpoints, SQLite ledger persistence and acceptance-seed coverage with a focused regression before altering visual code. Use an isolated file-backed SQLite database only; do not invoke production or mutate a pre-existing database.
3. Compare `pages/coach/lesson` and `lesson-correction` against online Figma C5 `93:734` and C5.1 `93:765`; reuse `app-header`, `role-tabbar` and existing state components. Use the soft 88px header, 22px gutters, compact scrollable rows, and a fixed 52px action at `bottom: 140rpx` so it clears the 70px tab bar.
4. Make the minimum view-model/WXML/WXSS changes. Preserve the C5 POST confirmation and C5.1 PATCH correction APIs, correction idempotency, `requireRole("coach")`, BFF event authorization and parent projection. WXML must not call array methods; derive all display data in TypeScript.
5. Run focused mini-program and API regression tests, including unauthorized coach/parent-scope coverage. If a seed changes, add a fresh-DB/restart proof. Then run the full repository quality gate and diff check.
5. Obtain 375x812 C5/C5.1 runtime captures if available; otherwise record the capability boundary and do not claim visual acceptance.
7. Ask Terra xhigh to review the diff and evidence before committing only this task's files.

# Match record closure implementation plan

1. Add failing controller/template tests for the coach editor: initial real-data load, local validation, API save, fresh detail read, and navigation only after readback.
2. Add the smallest editor page (`index.ts`, `index.wxml`, `index.wxss`, `index.json`) and register it in `app.json`.
3. Add the coach match-detail edit entry and ensure the workbench action opens the detail/editor path.
4. Add failing parent-detail tests for score/event projection, then implement the view-model projection and a compact match-events card in WXML/WXSS.
5. Run focused tests and typecheck, then API match tests and the root check. Fix only task-scoped failures.
6. Update `docs/current/progress.md` with the exact commands/results and visual-evidence boundary.
7. Run `git diff --check`, inspect the task-scoped diff, and stage only task paths for one independent commit.

## Verification commands

```powershell
npx --yes pnpm@10.33.0 --filter miniprogram-cq-talent exec vitest run pages/coach/match/index.test.mjs pages/coach/match-edit/index.test.mjs pages/coach/match-event-add/index.test.mjs pages/parent/event/index.test.mjs utils/api.test.mjs
npx --yes pnpm@10.33.0 --filter miniprogram-cq-talent exec tsc --noEmit
npx --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/server.test.ts
npx --yes pnpm@10.33.0 run check
git diff --check
```

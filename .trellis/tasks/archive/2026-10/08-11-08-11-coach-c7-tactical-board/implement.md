# Execution plan: C7 tactical board Figma restoration

1. Write failing fixture/server expectations for a sixteen-member coach roster, eleven tactical starters, five substitutes, and the unchanged two-child parent projection.
2. Extend only the opt-in acceptance seed and narrow rollback coverage for the new prefixed data; run focused API tests.
3. Write failing tactical-board page/unit expectations for 20px marker conversion and the Figma-specific pitch/marker/bench classes.
4. Adapt C7 WXML, WXSS, TypeScript view models, and focused tests while retaining the current real save/read interactions.
5. Run focused API and mini-program tests, typechecks, root check, and diff check. Record screenshot evidence separately if available.

## Validation

```text
npx.cmd --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/cq-talent-fixtures.test.ts test/server.test.ts
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent exec vitest run pages/coach/tactical-board/index.test.mjs
npx.cmd --yes pnpm@10.33.0 run check
git diff --check
```

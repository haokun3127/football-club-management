# C1 Coach Schedule Home Implementation Plan

## Scope

Implement the approved C1 presentation correction against Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:578` without changing the API or unrelated dirty paths.

## Ordered checklist

- [x] Add failing C1 assertions for content-sized stat pills, Figma hero time scale, hero pill height/first-pill treatment, and SVG activity chevrons.
- [x] Run `NPM_CONFIG_CACHE=.tmp-npm-cache-c4-1 npx --yes pnpm@10.33.0 --dir apps/miniprogram-cq-talent exec vitest run pages/coach/schedule/index.test.mjs` and confirm only the new assertions fail.
- [x] Make the smallest changes to `index.wxml` and `index.wxss`; preserve `index.ts` API/data behavior unless a view-only precomputed field is strictly required.
- [x] Re-run the focused test and mini-program typecheck.
- [ ] Compile `pages/coach/schedule/index.wxml` and `pages/coach/schedule/index.wxss` through WeChatIDE MCP (WXML timed out with code `10040`; WXSS was not accepted as evidence).
- [ ] Refresh/open the route in a real coach session, capture fresh `375x812` evidence, and compare top and bottom sections with the online Figma screenshot.
- [x] Run full `npx --yes pnpm@10.33.0 run check` and `git diff --check`.
- [x] Update `docs/design/specifications/batches/design-spec-batch14-c1-coach-schedule-home.md` and `docs/current/progress.md` with exact evidence and any real-data exemptions.
- [ ] Stage only C1 page files, C1 tests/spec/progress, and this task's planning artifacts; commit and push to `origin/dev`.

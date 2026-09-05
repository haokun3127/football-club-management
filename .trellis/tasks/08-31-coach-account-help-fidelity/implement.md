# Coach account and help Figma fidelity implementation plan

## Validation baseline

- Read live Figma context and screenshot before each page repair: C16.3 `93:1262`, C16.4 `93:1286`.
- Use only `node scripts/devtools/wechatide-mcp-capture.cjs --route <route>` for runtime evidence; default output must remain `%TEMP%\cq-talent-visual-evidence`.
- Run one focused Vitest file at a time, then `npx --yes pnpm@10.33.0 run check` serially. Never start a second root gate while another is active.

## Task 1 — durable own-account projection (C16.3)

1. Add a failing store test asserting `persistAuthenticatedSession()` carries the current login result's optional `profile.phone` and `phoneBinding`, while old persisted sessions normalize unchanged.
2. Run the store test and verify it fails because the durable session projection lacks those fields.
3. Extend only the mini-program `SessionState`/persistence projection with optional phone and binding fields; keep API login response types unchanged except where necessary for exact shared typing.
4. Run the store test again and verify it passes.
5. Add a failing C16.3 page test for own-phone masking, accepted binding presentation, and a missing-field fallback.
6. Implement the smallest account-page view model changes. Do not add row actions or data requests.
7. Run C16.3 test and TypeScript check; inspect `git diff --check`.
8. Capture `/pages/coach/account/index` through WeChatIDE MCP and compare it with node `93:1262`.

## Task 2 — fixed Figma quick-start presentation (C16.4)

1. Add a failing C16.4 test asserting exactly six presentation topics in Figma order, no `全部` topic card, and deterministic filtering of fetched FAQ records.
2. Run the focused test and verify it fails against category-derived cards.
3. Replace only the quick-start presentation derivation with the fixed topic mapping; preserve real FAQ fetch, local search, question expansion, and stale response handling.
4. Update WXML/WXSS using existing or current Figma-exported SVG assets so the six-card grid and support card match node `93:1286`. Keep support informational rather than interactive.
5. Run C16.4 focused test and TypeScript check; inspect `git diff --check`.
6. Capture `/pages/coach/help/index` through WeChatIDE MCP and compare top and bottom as needed with node `93:1286`.

## Task 3 — final verification and commit

1. Re-read both online Figma nodes and capture both routes at 375×812 after DevTools compilation.
2. Run the serial root gate `npx --yes pnpm@10.33.0 run check` and record exact result.
3. Update the C16.3/C16.4 design specification records and the audit task's evidence log with node IDs, runtime evidence paths, comparison outcome, and the explicit data/platform exemptions.
4. Inspect all dirty paths. Stage only this task's known page/session/test/spec/progress files with explicit `git add <path>` commands, then create one coherent commit. Do not include generated `index.js`, other agents' changes, or any task archival/deletion state.

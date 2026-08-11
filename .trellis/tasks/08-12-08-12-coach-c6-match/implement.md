# C6 match execution plan

1. Add focused failing Mini Program tests for the C6/C6.1 Figma hierarchy, neutral period chips, outlined add action, real-data-only rendering, exact-201 success handling (including a body-bearing `200` failure), stable-key retry, no optimistic C6 update, and C6.2 local-draft-only copy. Add a failing seed assertion for the required event diversity and for production refusing the opt-in seed environment variable.
2. Update only the C6/C6.1 view models, WXML and WXSS necessary to adapt to Figma `93:796` and `93:827`; retain the current API contract and truthful local-draft composition for `93:858`. Precompute all timeline labels, pill colours and period presentation in TypeScript. WXML may not invoke helpers or contain Figma business facts.
3. Add yellow-card and save facts at distinct minutes for students that are in both the completed event participants and persisted 16-player match roster. Keep the completed `event-cq-talent-demo-match-completed` aggregate canonical: friendly, 3:2, 16 players, goal, assist, yellow card and save. Update only the seed gate so production ignores `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`; do not perform any production database operation.
4. Extend the file-backed restart test to assert that it creates one temporary directory, resolves the SQLite path inside that exact directory, then proves GET -> POST -> exact replay -> changed-payload conflict -> GET -> close -> reopen -> GET with exactly one appended event. It must not invoke broad seed, migration, reset or any normal development/deployed database path.
5. Run focused Mini Program and API tests. Confirm C6.1 POST is only `{ studentId, type, minute?, note? }` + stable 8–128-character key; a C6 re-read uses the exact event id after return.
6. Have Terra review the final diff and evidence. Run the full project check, `git diff --check`, update progress/task records, then commit only task-owned paths.

## Commands

`npx.cmd --yes pnpm@10.33.0 exec vitest run apps/miniprogram-cq-talent/pages/coach/match/index.test.mjs apps/miniprogram-cq-talent/pages/coach/match-event-add/index.test.mjs`

`npx.cmd --yes pnpm@10.33.0 exec vitest run apps/api/test/app-client-match-detail.test.ts apps/api/test/app-client-match-event-create.test.ts`

`npx.cmd --yes pnpm@10.33.0 exec vitest run apps/api/test/app-client-match-event-create.test.ts -t "retains the created event and metric record after reopening SQLite"`

`npx.cmd --yes pnpm@10.33.0 exec vitest run apps/api/test/cq-talent-fixtures.test.ts`

`npx.cmd --yes pnpm@10.33.0 run check`

`git diff --check`

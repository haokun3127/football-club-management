# C6.1 Implementation Plan

## TDD Order

1. Add focused RED tests for a missing single-event domain operation, POST authorization/status matrix, idempotent replay/conflict, C6.1 draft behavior, and C6 reread.
2. Add the domain append operation and bundle tests. It must prepare event and metric records before a single persistence operation.
3. Add migration `0008`, match repository methods, persistent-store hydration/write transaction, and the restart RED/GREEN regression while preserving assessment hunks.
4. Add route, schema, and OpenAPI support. Prove only the new scoped POST is used and `POST .../coach/matches` is untouched.
5. Add Mini Program API types/helpers and C6.1 page. Load only real capability types and roster facts, preserve draft on all non-201 outcomes, and submit single-flight.
6. Make C6 reload its exact match detail in `onShow` after C6.1 returns. Delete the legacy opener-channel success path instead of consuming local payload data.
7. Update the BFF contract specification, run the full verification set, and retain task status/evidence. Do not commit or deploy.

## Planned File Boundary

- Domain: `packages/domain/src/match-services.ts` and focused domain test only.
- API: match-specific additions in `apps/api/src/routes/app-client.routes.ts`, `apps/api/src/http/{schemas,openapi}.ts`, `apps/api/src/store.ts`, `apps/api/src/persistence/**`, a new `0008` migration, seed fixtures only if necessary, and focused match tests.
- Mini Program: `utils/{api,types,request}` only as required; `pages/coach/match-event-add/**`, `pages/coach/match/**`, direct C6.1 assets, and focused tests.
- Docs: BFF contract and this task directory.

## Required Verification

- Focused domain/API/page RED before implementation and GREEN after it.
- API package test/typecheck/build, including a file-backed close/reopen assertion for the new match bundle.
- Mini Program focused tests, package test, and typecheck.
- `python ./.trellis/scripts/task.py validate 08-10-coach-match-event-add-figma-alignment`
- Scoped `git diff --check` and a manual diff review that confirms assessment WIP hunks were preserved.

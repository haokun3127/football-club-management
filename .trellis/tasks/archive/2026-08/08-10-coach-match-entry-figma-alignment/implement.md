# C6 Implementation Plan

1. Add focused API and Mini Program regressions and run them RED against the absent projection and legacy inline page.
2. Add the authorized BFF GET, schema, and OpenAPI entry without changing store or match write behavior.
3. Add one Mini Program API normalizer and replace C6 with a page-owned read model and precomputed template fields. Update the local page JSON only to replace `submit-bar` with `role-tabbar`; do not change global `app.json`.
4. Update the app-client BFF contract after the behavior is green.
5. Run focused tests, API and Mini Program package tests/typechecks, API build, task validation, and diff checks. Do not stage, commit, deploy, or claim visual acceptance.

## Allowed Files

- `apps/api/src/routes/app-client.routes.ts`
- `apps/api/src/http/schemas.ts`
- `apps/api/src/http/openapi.ts`
- `apps/api/test/app-client-match-detail.test.ts`
- `apps/miniprogram-cq-talent/utils/api.ts`
- `apps/miniprogram-cq-talent/utils/api.test.mjs`
- `apps/miniprogram-cq-talent/utils/types.ts`
- `apps/miniprogram-cq-talent/pages/coach/match/index.{json,ts,wxml,wxss,test.mjs}`
- `.trellis/spec/api/backend/app-client-bff-contracts.md`
- `.trellis/tasks/08-10-coach-match-entry-figma-alignment/**`

## Execution Evidence (2026-08-10)

- RED: before the route existed, `test/app-client-match-detail.test.ts` received `404` where the authorized projection expected `200`; the legacy page and missing API normalizer also failed their new focused regressions.
- GREEN: focused API test passes `1 file / 2 tests`; focused Mini Program page/API tests pass `2 files / 9 tests`.
- The BFF applies active coach client validation, then `requireCoachEventAccess`, then event/type validation. Its response has only `event`, participant-derived `roster`, `match | null`, and `events`; the regression confirms the event does not retain raw `participants`.
- API and Mini Program typechecks pass. API build passes. The Mini Program package suite passes `32 files / 149 tests`.
- Full API suite is not green because the unrelated, already-dirty `test/persistence.test.ts > platform persistence > preserves attendance status and note after reopening a seeded file database` exceeded its existing 5-second timeout (`72 passed / 1 failed`). This batch does not modify that file or its persistence chain.
- No DevTools/device screenshot was taken. Static and API tests do not claim visual acceptance.

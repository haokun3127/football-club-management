# Test-Metric Persistence Plan (Batch A)

## Objective

Persist coach test-metric assessments in SQLite and prove that parent `growth-summary` and `ability-metrics` reads survive an API process/database restart. Keep the current API contracts and defer all P5/radar visual work.

## In-scope implementation files

- `apps/api/src/persistence/assessment-repositories.ts` (new, only if the existing persistence boundary needs it)
- `apps/api/src/persistence/platform-persistence.ts`
- `apps/api/src/store.ts`
- `apps/api/test/persistence.test.ts`
- `apps/api/test/server.test.ts`
- `apps/miniprogram-cq-talent/utils/api.ts` and `api.test.mjs` only if normalization drops backend fields

No migration, page WXML/WXSS/TS, Figma, screenshot tooling, project configuration, or unrelated dirty file may change.

## Contract and data requirements

Keep coach app-client POST and generic assessment POST route paths, request/response shapes, app-client and role checks, and parent guardian scoping unchanged. Persist `player_assessments`, `assessment_raw_results`, `assessment_scores`, `player_metric_records`, and `metric_lineages` using the existing `0002_data_capability_foundation.sql` schema after a column/FK preflight.

Assessment POST currently has no `Idempotency-Key`; do not add or imply duplicate-request idempotency. Insert each request's assessment graph and preserve its relationships. Seed is insert-if-absent and never overwrites existing values.

## TDD and verification

1. RED file-database close/reopen test: coach POST -> close -> same path `seed:true` reopen -> parent growth-summary/ability-metrics readback fails under the old in-memory path.
2. GREEN repository/platform/store implementation with transaction and scope checks.
3. Contract tests: coach `201`; parent, no-scope coach, and cross-child parent `403`; authorized parent `200`; both route paths unchanged.
4. Run focused API tests, API typecheck/build, mini-program test/typecheck, and `git diff --check`; report known fixture differences separately.
5. API restart proof: build, stop only the confirmed PID, restart `dist/index.js` against the same outside-repository `DATABASE_URL`, and verify HTTP readback of exact metric values and lineage.

## Batch B gate and rollback

Batch B may start only after the current Figma file `zZ6wKyOHKcO4UYXDd9jGwv` provides real P5/radar and metric-entry nodes and screenshots. The only currently readable source is `0:1/89:37` (method page), so visual work is blocked. Rollback is the persistence logic change set plus the temporary local database; production deployment requires a separate plan and approval.

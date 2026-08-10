# Design: Test-Metric SQLite Persistence (Batch A)

## Scope and boundaries

Batch A owns persistence and readback only. It does not change the coach assessment HTTP contracts, parent growth-summary/ability-metrics response shapes, authentication, role resolution, P5 WXML/WXSS/TS, radar geometry, Figma, migrations, deployment, or unrelated dirty files.

The implementation whitelist is:

- `apps/api/src/persistence/assessment-repositories.ts` (new repository if the existing persistence modules do not already provide the needed boundary)
- `apps/api/src/persistence/platform-persistence.ts`
- `apps/api/src/store.ts`
- `apps/api/test/persistence.test.ts`
- `apps/api/test/server.test.ts`
- `apps/miniprogram-cq-talent/utils/api.ts` (only if normalization drops fields)
- `apps/miniprogram-cq-talent/utils/api.test.mjs` (only if the normalizer changes)

No migration is planned. Before coding, inspect `0002_data_capability_foundation.sql` and confirm the existing assessment tables and foreign keys can represent every required row.

## Data flow

```text
coach assessment POST
  -> assessment service validation/authorization
  -> PersistentApiStore.recordAssessment
  -> SQLite repositories
     player_assessments
     assessment_raw_results
     assessment_scores
     player_metric_records
     metric_lineages
  -> parent growth-summary / ability-metrics reads
  -> API response and (unchanged) mini-program normalizer
```

The repository owns snake_case column mapping, transactions, club/student scoping, seed replay, and conversion to the existing domain objects. `PersistentApiStore` remains the service-facing boundary; route handlers keep authorization, status codes, and payload contracts.

## Persistence rules

- Seed rows are inserted in dependency order with insert-if-absent semantics. Seed must never replace an existing assessment, raw result, score, metric record, or lineage.
- A real assessment request creates the rows required by that request and preserves each request's assessment relationships. Existing table `id` columns remain the row identity; no synthetic natural-key idempotency is introduced.
- There is no `Idempotency-Key` contract for assessment POST today. Repeated requests are therefore not described as idempotent, and the repository must not collapse distinct requests merely because values match.
- All reads and writes carry the club and student scope already enforced by the API. Parent reads return only guardian-authorized children.
- Transactions must leave no partially persisted assessment graph. On failure, no final parent readback is accepted.

## Compatibility and rollback

The app-client and generic assessment routes, coach/parent authorization, response fields, and parent metric projections remain unchanged. If the mini-program normalizer currently drops `status` or `note`, update only `utils/api.ts` and its test while retaining legacy fallbacks.

Rollback is a single persistence-logic change set plus an outside-repository temporary SQLite file. Reverting the repository/platform/store changes restores the former in-memory behavior; no schema rollback is required. Production deployment is a separate approved plan.

## Figma boundary

The current Figma authority is `zZ6wKyOHKcO4UYXDd9jGwv`. Only method-page nodes `0:1/89:37` are currently available. No trustworthy P5 radar or metric-entry node/screenshot has been found, so Batch B visual implementation and visual acceptance are blocked until those concrete sources are supplied.

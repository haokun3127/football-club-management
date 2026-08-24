# Technical design — durable coach session plans

## Data flow

`PUT /coach/events/:eventId/training-projects`
→ route validates project IDs and builds a `SessionPlan`
→ `PersistentApiStore.saveSessionPlan`
→ `SessionPlanRepository.save`
→ SQLite `session_plans` row with JSON columns for nested arrays
→ `PersistentApiStore` startup merge
→ event detail / training-project response reads the persisted plan.

## Boundaries

- Domain model remains `SessionPlan`; no new public API type is needed.
- Repository owns snake_case SQL mapping and JSON serialization.
- `PlatformRepositories` exposes `sessionPlans`.
- `PersistentApiStore` merges persisted plans over seed plans by ID and writes through the repository on save.
- In-memory store behavior remains unchanged for tests and local non-persistent usage.

## Storage

Migration `0015_session_plans.sql` creates:

- `id` primary key
- `catalog_scope`, nullable `catalog_club_id` foreign key to `clubs`, and optional `base_item_id`
- `name`, `objective_ids_json`, `metric_ids_json`
- `blocks_json`, `estimated_minutes`
- `created_at`, `updated_at`

The repository queries system rows or the requested `catalog_club_id`, upserts by stable `id`, and validates JSON array payloads while mapping rows back to the domain type.

## Error and compatibility behavior

- Existing seeded rows are inserted only if absent.
- A persisted row with an existing seed ID replaces the seed during startup merge.
- Invalid persisted JSON throws during startup/read instead of silently returning partial training data.
- The existing route response shape and status codes remain unchanged.

## Verification

- Migration runner test includes the new migration.
- Persistence regression covers store save/list/get and file close/reopen; the existing route test covers the training-project PUT contract.

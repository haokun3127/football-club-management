# API Database Guidelines

The API currently uses SQLite persistence with ordered SQL migrations and repository adapters.

## Migration Rules

- Add migrations under `apps/api/db/migrations/` with a zero-padded numeric prefix.
- Migration names are part of expected test output; update `apps/api/test/persistence.test.ts` when adding a migration.
- Migrations must be idempotently tracked by the migration runner: first run applies files, second run skips the same files.
- Keep database column names snake_case and translate to TypeScript shapes in repository code.

## Repository Rules

- Put SQL access in `src/persistence/*`, not directly inside route handlers.
- Keep store-level behavior behind `ApiStore` / `PersistentApiStore` in `src/store.ts`.
- Preserve club scoping in every query that touches tenant data.
- Seeded repositories with a database natural-key `UNIQUE` constraint must upsert both by stable `id` and by that natural key. Generated fixture ids can change while the real record identity remains the same; re-seeding an existing development database must update the existing row instead of failing startup.
- Tests should use `openSqliteDatabase(":memory:")` for persistence behavior.

## Calendar Attendance Persistence

- `calendar_events` and `event_participants` already live in migration `0002_data_capability_foundation.sql`; do not add a migration merely to persist attendance status or notes.
- Calendar seed data is an exception to generic reseed-upsert behavior: use insert-if-absent for events and participants so reopening a seeded file database cannot overwrite a coach's saved attendance status or note.
- Attendance writes use `UNIQUE (club_id, event_id, student_id)` and update only `status`, `note`, and `updated_at`; preserve the original participant `id` and `created_at`.
- Calendar and participant list/natural-key reads must include `club_id`; `PersistentApiStore` may merge associated seed-backed event details, but persisted participant state remains authoritative when the natural key exists.
- Cover both an in-memory repository regression and a file-database close/reopen regression. The latter must verify status, non-empty note, an unchanged participant, and exactly one natural-key row.

## Catalog Session Plan Persistence

### 1. Scope / Trigger

- Trigger: Persisting coach-selected `SessionPlan` data across API restarts without changing the mini-program route contract.

### 2. Signatures

- `SessionPlanRepository.listByClub(clubId)` returns system catalog plans plus plans whose `catalog_club_id` equals `clubId`.
- `SessionPlanRepository.getById(clubId, id)` applies the same visibility rule.
- `SessionPlanRepository.save(plan)` upserts by stable `id` and returns the mapped domain object.
- `SessionPlanRepository.insertIfAbsent(plan)` seeds without overwriting user-edited data.

### 3. Contracts

- `catalog_scope = 'system'` stores `catalog_club_id = NULL`; `catalog_scope = 'club'` requires a valid `catalog_club_id`.
- Nested `objectiveIds`, `metricIds`, and ordered `blocks` are stored as JSON columns and reconstructed as the domain arrays.
- `PersistentApiStore` merges persisted plans over seed plans by `id`, then writes `saveSessionPlan` through the repository.

### 4. Validation & Error Matrix

- Unknown catalog scope or invalid scope/club combination → SQLite `CHECK` failure.
- Cross-club `getById` or `listByClub` → no row returned for another club's plan.
- Invalid persisted JSON array → repository read throws instead of returning partial training content.

### 5. Good/Base/Bad Cases

- Good: save a club-scoped plan, close the file database, reopen, and read the same block order, notes, and duration.
- Base: seed an existing plan with `insertIfAbsent`; preserve the persisted user edit on reopen.
- Bad: query `session_plans` without the system-or-club visibility predicate.

### 6. Tests Required

- Migration idempotency includes `0015_session_plans.sql` and the `session_plans` table.
- File-backed persistence regression asserts repository and `PersistentApiStore` readback after close/reopen.
- API route tests continue to assert the training-project PUT response contract.

### 7. Wrong vs Correct

#### Wrong

```ts
this.data.sessionPlans = nextPlans;
```

#### Correct

```ts
const saved = this.repositories.sessionPlans.save(sessionPlan);
upsertById(this.data.sessionPlans, saved);
```

## Examples

- Migration runner test: `apps/api/test/persistence.test.ts`
- SQLite helper: `apps/api/src/persistence/sqlite.ts`
- Repository assembly: `apps/api/src/persistence/platform-persistence.ts`
- Natural-key reseed regression: `apps/api/test/persistence.test.ts`

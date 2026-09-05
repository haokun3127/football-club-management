# Coach training plan persistence design

## Scope

The existing `session_plans` table stores selected drill blocks, but `TrainingSession` rows are still kept only in `SeedBackedStore.data`. Add a repository-backed `training_sessions` table and make the persistent store use it for event/workbench reads and writes. The app-client route and response shape stay unchanged.

## Data model

```text
training_sessions
  id TEXT PRIMARY KEY
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE
  event_id TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE
  kind TEXT NOT NULL CHECK (kind IN ('team','small_group','private','specialty'))
  session_plan_id TEXT NULL REFERENCES session_plans(id) ON DELETE SET NULL
  intensity TEXT NULL CHECK (intensity IS NULL OR intensity IN ('low','medium','high'))
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
  UNIQUE (club_id, event_id)
```

`session_plan_id` is nullable because the domain permits a training session before content is selected. The unique club/event key makes repeated saves update the same training session rather than creating another association.

## Data flow

```text
coach PUT training-projects
  -> PersistentApiStore.saveSessionPlan()
  -> PersistentApiStore.saveTrainingSession()
  -> session_plans + training_sessions
  -> coach workbench read
  -> close database
  -> migrate + seed insert-if-absent
  -> PersistentApiStore merges persisted training sessions
  -> coach workbench returns same sessionPlanId/intensity/projects
```

The current route performs two store writes. Keep that route contract and make each write durable; the restart regression proves the externally visible result. No seed data is invented and no route-level SQL is added.

## Components

- `apps/api/db/migrations/0016_training_sessions.sql`: schema and constraints.
- `apps/api/src/persistence/training-session-repository.ts`: club-scoped list/get/save/insert-if-absent mapping.
- `apps/api/src/persistence/platform-persistence.ts`: repository registration and seed replay.
- `apps/api/src/store.ts`: persistent merge and `saveTrainingSession` override.
- `apps/api/test/persistence.test.ts`: migration and close/reopen HTTP readback coverage.
- `.trellis/spec/api/backend/database-guidelines.md` and `app-client-bff-contracts.md`: executable persistence contract.

## Error and rollback boundaries

- Invalid kind/intensity or invalid event/club foreign keys fail at the database boundary and do not create a partial row.
- Cross-club reads return no row through the repository predicate.
- Existing seed rows use `insertIfAbsent`; saved rows are never overwritten on restart.
- If the focused regression fails, do not alter the mini-program or production database; fix the repository/store boundary first.

## Verification

1. Add the failing file-backed restart regression before implementation.
2. Run the focused persistence test and confirm it fails because `training_sessions` is absent/not restored.
3. Implement migration, repository wiring, seed insertion and persistent-store merge/save.
4. Run focused persistence and server tests, API typecheck, then `pnpm run check` and `git diff --check`.
5. Record the exact results. This batch has no new 375x812 visual evidence and must not be described as visual acceptance.

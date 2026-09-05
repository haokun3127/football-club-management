# Coach training plan persistence implementation plan

## Files

- Create `apps/api/db/migrations/0016_training_sessions.sql` with the schema in `design.md`.
- Create `apps/api/src/persistence/training-session-repository.ts` with `listByClub`, `getByEvent`, `save`, and `insertIfAbsent`.
- Modify `apps/api/src/persistence/platform-persistence.ts` to register the repository and seed training sessions insert-if-absent.
- Modify `apps/api/src/store.ts` to merge persisted training sessions in `PersistentApiStore`, override `saveTrainingSession`, and keep inherited reads backed by merged data.
- Modify `apps/api/test/persistence.test.ts` to assert migration/table registration and close/reopen workbench readback.
- Modify `.trellis/spec/api/backend/database-guidelines.md` and `.trellis/spec/api/backend/app-client-bff-contracts.md` with the durable training-session contract.
- Modify `docs/current/progress.md` with exact verification results.

## TDD sequence

1. Add a file-backed test that saves the real training-project route payload, closes the API/database, reopens with seed replay, and expects `training.session.sessionPlanId`, `training.session.intensity`, and `training.selectedProjectIds` to remain unchanged.
2. Run only that test; expected failure is a missing table or a `null` training session after reopen.
3. Add the migration and repository mapping; keep SQL out of routes.
4. Wire repository registration, seed insert-if-absent, persistent merge, and save override.
5. Rerun the same test, then the existing session-plan repository test and server training-project contract test.
6. Run `pnpm --filter @football-club/api typecheck`, `pnpm --filter @football-club/api test`, `pnpm run check`, and `git diff --check`.
7. Stage only task-scoped files and commit one logical batch with a `fix(api): persist training session associations` message.

## Rollback point

Before staging, inspect `git diff --name-only` and stage only the migration, repository, persistence wiring, tests, spec updates and progress entry. Leave all existing unrelated dirty files untouched.

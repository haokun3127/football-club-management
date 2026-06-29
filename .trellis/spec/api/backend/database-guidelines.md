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
- Tests should use `openSqliteDatabase(":memory:")` for persistence behavior.

## Examples

- Migration runner test: `apps/api/test/persistence.test.ts`
- SQLite helper: `apps/api/src/persistence/sqlite.ts`
- Repository assembly: `apps/api/src/persistence/platform-persistence.ts`

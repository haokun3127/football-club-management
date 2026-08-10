# API Quality Guidelines

API changes must preserve route contracts, OpenAPI coverage, persistence behavior, and deterministic tests.

## Required Checks

- Run `pnpm --filter @football-club/api typecheck` for API-only changes.
- Run `pnpm --filter @football-club/api test` when changing routes, store, persistence, integrations, schemas, or seed data.
- Run root `pnpm check` before broad cross-package changes.

## Implementation Rules

- Keep TypeScript explicit; avoid `any` except at JSON boundary points where existing code already accepts unknown external data.
- Preserve `additionalProperties: false` in JSON schemas unless a response intentionally allows flexible domain payloads.
- Update `apps/api/test/server.test.ts` when adding OpenAPI paths or route behavior.
- Update `apps/api/test/persistence.test.ts` when persistence schema, migrations, or repository behavior changes.
- Keep WPS connector behavior deterministic in tests by injecting `fetch`, `sleep`, `now`, and credential resolvers.

## File-Backed Restart Integration Tests

- Keep Vitest's global 5-second default. Do not relax it for the whole API package.
- A test that intentionally performs file SQLite migration, complete seed, close/reopen, and HTTP readback may declare its own explicit timeout after measuring the focused and full-suite runtime.
- Use the smallest measured budget that covers normal full-suite contention (currently `15_000` ms for the attendance and assessment restart regressions in `test/persistence.test.ts`).
- The quality gate must still run the full API suite without a command-line timeout override; an explicit local budget is not permission to hide a deadlock or widen unrelated tests.

## Forbidden Patterns

- Do not bypass role checks in route handlers.
- Do not put SQL directly in route files.
- Do not leak secret-bearing config in API responses.
- Do not hand-edit generated `dist/` files.

## Examples

- Route contract regression: `apps/api/test/server.test.ts`
- WPS connector regression: `apps/api/test/wps-connector.test.ts`

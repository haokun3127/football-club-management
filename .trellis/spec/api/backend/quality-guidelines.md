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

## Forbidden Patterns

- Do not bypass role checks in route handlers.
- Do not put SQL directly in route files.
- Do not leak secret-bearing config in API responses.
- Do not hand-edit generated `dist/` files.

## Examples

- Route contract regression: `apps/api/test/server.test.ts`
- WPS connector regression: `apps/api/test/wps-connector.test.ts`

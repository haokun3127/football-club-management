# Domain Package Directory Structure

The domain package lives in `packages/domain` and exports pure TypeScript domain types and services.

## Layout

- `src/index.ts` is the public export barrel. New public domain modules must be exported here.
- Entity/type modules use feature names such as `clubs.ts`, `calendar.ts`, `metrics.ts`, `privacy.ts`, `training.ts`, and `match.ts`.
- Service modules use `*-services.ts`, for example `assessment-services.ts`, `match-services.ts`, and `metric-services.ts`.
- `src/primitives.ts` contains shared primitives such as entity IDs.
- Tests live in `packages/domain/test/*.test.ts`.

## Rules

- Keep domain code independent of Fastify, SQLite, HTTP schemas, and API route concerns.
- Represent storage dependencies as TypeScript interfaces passed into service factories.
- Keep generated `dist/` out of manual edits.

## Examples

- Public exports: `packages/domain/src/index.ts`
- Service factory style: `packages/domain/src/match-services.ts`
- Pure calculation: `packages/domain/src/metrics.ts`

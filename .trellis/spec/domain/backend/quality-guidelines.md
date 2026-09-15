# Domain Quality Guidelines

Domain changes must be pure, deterministic, and covered by focused Vitest tests.

## Required Checks

- Run `pnpm --filter @football-club/domain typecheck` for domain-only changes.
- Run `pnpm --filter @football-club/domain test` when changing domain behavior.
- Run root `pnpm check` when API contracts also depend on the change.

## Implementation Rules

- Use deterministic `now` strings and injected ID generators in tests.
- Keep multi-tenant filtering explicit: records from another `clubId` must not affect results.
- Preserve lineage metadata for computed metrics and assessment-derived records.
- Export new public APIs from `packages/domain/src/index.ts`.
- Add regression tests for new validation rules, graph behavior, service factories, or filtering rules.

## Forbidden Patterns

- No Fastify/HTTP imports in domain.
- No SQLite/database imports in domain.
- No hidden global clocks or random IDs in service behavior that needs test determinism.

## Examples

- `packages/domain/test/metric-services.test.ts`
- `packages/domain/test/metric-graph-services.test.ts`
- `packages/domain/test/match-services.test.ts`

## Score Display Contract

Use `withScoreMaxima` with formula/dependency weights and `scorePercent`/`overallScore` for assessment display. Standard scores already use their standard scale; computed score measurements require an explicit maximum. Round overall only after combining dimensions. Keep raw results and normalized graph inputs distinct; normalization is not confidence.

# Domain Error Handling

Domain code currently uses plain `Error` throws for invalid domain inputs and returns explicit result objects for successful operations.

## Rules

- Throw `Error` with actionable messages for invalid domain configuration such as metric graph cycles or bad formulas.
- Keep HTTP status codes and response error shapes out of domain modules.
- Prefer returning `null` from lookup methods at API/store boundaries when absence is expected.
- Preserve test coverage for thrown domain validation errors.

## Examples

- Metric graph validation tests expect cycle errors in `packages/domain/test/metrics.test.ts`.
- API routes translate store/service exceptions into structured HTTP errors.

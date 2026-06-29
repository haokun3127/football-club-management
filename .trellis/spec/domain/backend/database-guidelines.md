# Domain Persistence Boundary Guidelines

The domain package does not own a database. Persistence belongs to the API package.

## Rules

- Do not import SQLite, Fastify, or repository implementations into `packages/domain`.
- Define minimal store/catalog interfaces near the service that needs them.
- Keep persistence identity fields explicit in domain records: `id`, `clubId`, `createdAt`, `updatedAt` where applicable.
- Use caller-injected `clock` and `ids` providers for services that create records.

## Examples

- `createMatchService` accepts `store`, `catalog`, `clock`, and `ids`.
- `createMetricService` reads records through a `MetricRecordStore` interface.
- API persistence adapters live under `apps/api/src/persistence/*`.

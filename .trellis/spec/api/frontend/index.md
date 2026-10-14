# Backoffice Frontend Guidelines

The browser management application lives in `apps/backoffice`, using React, Umi Max, Ant Design and ProComponents. Fastify serves its build under an environment-specific prefix. The original `apps/api/backoffice` client remains a compatibility fallback.

- [Directory Structure](./directory-structure.md)
- [Component Guidelines](./component-guidelines.md)
- [State Management](./state-management.md)
- [Quality Guidelines](./quality-guidelines.md)
- [Type Safety](./type-safety.md)
- [Backoffice Authentication](../backend/backoffice-authentication.md)
- [Management Contracts](../backend/backoffice-management.md)
- [Integration Contracts](../backend/backoffice-integration.md)

Read each relevant guide before changing the browser application. Quality gate: backoffice typecheck/test/build, affected API tests, rendered browser verification, and root `check:delivery` for changes crossing application boundaries.

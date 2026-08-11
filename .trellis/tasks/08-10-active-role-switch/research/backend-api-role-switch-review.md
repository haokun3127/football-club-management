# Research: backend API role-switch review

- Query: Review the uncommitted backend/API role-switch diff against HEAD for task compliance, security semantics, persistence, schema/OpenAPI coverage, tests, and unrelated changes.
- Scope: internal
- Date: 2026-08-11

## Findings

### Files found

- `apps/api/src/auth/session-registry.ts` — hashes generated opaque bearer tokens and delegates durable lookup/rotation to the session repository.
- `apps/api/src/routes/context.ts` — resolves a bearer only through the persistent session, then revalidates the current user, exact membership, active app client, and currently available roles.
- `apps/api/src/routes/app-client.routes.ts` — adds the pending-session BFF guard, role-selection endpoint, capability-gated login behavior, and authoritative response construction.
- `apps/api/src/persistence/app-client-session-repository.ts` and `apps/api/db/migrations/0009_app_client_sessions.sql` — persist session binding, expiry, revocation, and SHA-256 token hash; rotation uses a SQLite transaction.
- `apps/api/src/server.ts` and `apps/api/src/store.ts` — wire persistent stores to a repository-backed session registry; `store.ts` makes the existing repository aggregate accessible to this composition root.
- `apps/api/src/http/schemas.ts` and `apps/api/src/http/openapi.ts` — register the role-selection path but leave login and role-session successful responses as flexible objects.
- `apps/api/test/app-client-role-switch.test.ts` — covers role mapping, pending-session denial, token rotation, authority revalidation, and cross-instance operation.

### Code patterns

- Tokens are random `wx-session-<uuid>` values and only SHA-256 hashes are stored (`apps/api/src/auth/session-registry.ts:68-96`; `apps/api/db/migrations/0009_app_client_sessions.sql:1-13`).
- Any bearer-shaped `Authorization` header is terminal: malformed/unknown bearer sessions return `401` before header membership resolution (`apps/api/src/routes/context.ts:43-70`).
- Revalidation binds route club/client, current active user/membership, exact membership ID, active client, and entrypoint-filtered active role (`apps/api/src/routes/context.ts:45-69`).
- Pending sessions are denied on BFF routes and role mismatch is rejected before route handlers (`apps/api/src/routes/app-client.routes.ts:57-77`, `apps/api/src/routes/app-client.routes.ts:2617-2633`).
- The selection route revalidates before calling transactional rotation (`apps/api/src/routes/app-client.routes.ts:387-420`; `apps/api/src/persistence/app-client-session-repository.ts:33-55`).
- Exposing `PersistentApiStore.repositories` is task-owned and necessary for `buildServer` to construct a durable `SessionRegistry` from `appClientSessions` (`apps/api/src/server.ts:36-40`; `apps/api/src/store.ts:2407-2413`).

### Review blockers

1. `apps/api/test/app-client-role-switch.test.ts:141` uses `file:...mode=memory&cache=shared` and retains the second database connection while closing/reopening the first at lines 287-298. This proves two live connections can share an in-memory URI, not the required durable database-file restart behavior after all API instances have stopped. Use a temporary on-disk SQLite path, close both server/database instances, reopen a fresh instance, and assert the issued active token still works.
2. `apps/api/src/http/schemas.ts:477-505` and `apps/api/src/http/openapi.ts:114-124` do not document the new `X-App-Client-Capabilities: active-role-switch-v1` protocol or the additive successful response fields (`availableRoles`, `session.activeRole`, rotated token). Add the optional header schema and explicit 200 response schemas for login and role selection so OpenAPI remains the authoritative contract.

## External references

- None consulted; this review is against the repository task artifacts and API specifications.

## Related specs

- `.trellis/spec/api/backend/app-client-bff-contracts.md`
- `.trellis/spec/api/backend/database-guidelines.md`
- `.trellis/spec/api/backend/directory-structure.md`
- `.trellis/spec/api/backend/quality-guidelines.md`

## Caveats / Not Found

- Per provided evidence, focused API tests passed 81/81, API type-check passed, and `git diff --check` passed; they were not rerun.
- The backend/API task diff is limited to task artifacts and the role-session implementation. Unrelated dirty mini-program configuration, icons, documentation, and workbook files are outside the task-owned diff and must remain excluded from staging.

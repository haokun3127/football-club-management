# Add secure parent and coach role switching

## Goal

For a real membership whose roles contain both parent and coach, let the user select and later switch their active mini-program experience without creating additional authority.

## Requirements

- Before any selector UI, define a persistent/shared session strategy that rechecks active membership and app-client role availability after API restart and across instances.
- After that decision, login must return a membership- and app-client-derived `availableRoles` array in addition to the existing compatibility `role` field.
- A role switch must be server-confirmed and must refresh or replace the role-scoped session; a client-local `activeRole` cannot be an authorization change.
- One-role users retain direct post-login routing and see no switch control.
- Parent BFF guardian checks and coach BFF scope checks remain the authority boundary.

## Acceptance Criteria

- [x] A parent-only membership receives `availableRoles: ["parent"]`; a coach-only membership receives `["coach"]`.
- [x] A parent+coach membership receives `["parent", "coach"]` after app-client entrypoint filtering.
- [x] A dual-role login creates a pending session and does not route or call either role's BFF until a permitted role is selected by a server-confirmed session flow.
- [x] A role switch remains valid after an API restart and across two API instances sharing one database, and refuses a role outside `availableRoles`.
- [x] A successful switch rotates the bearer token; the old token is refused and a removed role, membership, user, or entrypoint is refused on the next request.
- [x] An edited local active-role value cannot grant access to an otherwise forbidden parent or coach endpoint.
- [x] Existing phone-authorization single-flight tests continue to pass.

## Verification record

- 2026-08-17: `apps/api/test/app-client-role-switch.test.ts` passed `2/2`, including two live API instances, pending-session denial, token rotation, authority revalidation, and closing all instances before reopening a file-backed SQLite database.
- 2026-08-17: OpenAPI and app-client login contract tests passed `2/2`; the capability header and successful `availableRoles`/`session.activeRole` schemas are registered.
- 2026-08-17: Mini-program role transport, login chooser, parent entry, child entry, and coach entry tests passed `44/44`.

## Out of Scope

- Treating `roleHint`, local storage, or a phone number as authorization.
- A quick client-only workaround or duplicated memberships.
- Cross-device "last chosen role" preferences.
- Claiming multi-instance support unless all API instances use the same durable database volume with correct SQLite locking semantics.

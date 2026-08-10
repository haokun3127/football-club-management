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

- [ ] A parent-only membership receives `availableRoles: ["parent"]`; a coach-only membership receives `["coach"]`.
- [ ] A parent+coach membership receives `["parent", "coach"]` after app-client entrypoint filtering.
- [ ] A dual-role login does not route until a permitted role is chosen by a server-confirmed session flow.
- [ ] A role switch remains valid after an API restart and across two API instances, and refuses a role outside `availableRoles`.
- [ ] An edited local active-role value cannot grant access to an otherwise forbidden parent or coach endpoint.
- [ ] Existing phone-authorization single-flight tests continue to pass.

## Out of Scope

- Treating `roleHint`, local storage, or a phone number as authorization.
- A quick client-only workaround or duplicated memberships.
- Cross-device "last chosen role" preferences.

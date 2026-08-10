# Active Role Switch Design

## Status

Planning only. Terra review returned implementation until durable/shared session semantics are designed and accepted.

## Authorization Model

The server must calculate mini-program `availableRoles` from the active membership and enabled app-client entrypoints, with the admin/operator-to-coach mapping made explicit in one implementation. It preserves the existing scalar `role` as a compatibility default. The client never turns a `profile.roles` value or `roleHint` into permission.

## Session and Navigation Model

A durable/shared session or signed-token design must be chosen before implementation. Each bearer resolution must revalidate active membership and role availability. A server-confirmed switch then issues or refreshes an active-role session. Local navigation state may mirror that result but must never be the source of a permission change.

## Compatibility

An old session with no `availableRoles` is treated as `[role]`. A single-role login keeps the current direct route. The API addition is backward compatible because older clients ignore it.

## Risks and Rollback

The phone authorization guard task has related login-page changes and must be used as the baseline rather than overwritten. The additive API field can land first; session semantics must land before any selector UI. Revert UI slices before the session/API compatibility layers if rollback is required.

# Active Role Switch Design

## Status

Sol xhigh research and Terra xhigh review accepted this design on August 10, 2026. The former in-memory session registry must not be extended for this feature.

## Authorization Model

The server calculates mini-program `availableRoles` from the active membership and enabled app-client entrypoints through one shared mapper. Its fixed order is `parent`, then `coach`: `parent` requires a parent membership role and a parent entrypoint; `coach` accepts coach, owner, admin, or operator membership roles and a coach entrypoint. Finance alone maps to neither app role. The existing scalar `role` remains a compatibility default (coach first) but is never an authorization source. The client never turns a `profile.roles` value or `roleHint` into permission.

## Persistent Session and Navigation Model

Use a new SQLite `app_client_sessions` table and random bearer tokens. Store only a SHA-256 token hash, session ID, club ID, app-client ID, user ID, membership ID, nullable active role, expiry, revocation timestamp, and audit timestamps. The raw `wx-session-<uuid>` token is returned only once and never contains membership or role data.

Every bearer request hashes the token and reads the persistent session. It then rechecks the exact club and app client, active user, the exact active membership ID, current entrypoint-filtered available roles, and the session active role. Expired, revoked, inactive, changed-membership, removed-entrypoint, or removed-role sessions fail with `401 authentication_required`; no bearer request falls back to a development header or another role.

A dual-role login from a client that sends `X-App-Client-Capabilities: active-role-switch-v1` creates a pending-role session (`activeRole = null`). Pending sessions can only call the role-selection endpoint and are denied by parent and coach BFF routes. The login response keeps the compatible scalar default role but the new client must not route or persist a navigable session until selection. Every selection, including the compatible default role, atomically revokes the pending token and creates a new active-role token. The authoritative server response is the only source used to persist the session and navigate.

A client that does not send that capability header receives the legacy, active compatibility-default session for a dual-role membership. This is a deliberate rollout boundary for already-published clients that do not render a chooser; their existing server-side role scope remains unchanged. The new mini-program must always send the capability header, and tests must cover both paths.

`POST /clubs/:clubId/app-clients/:clientId/session/role` takes `{ role: "parent" | "coach" }`, fully revalidates the pending or active bearer, verifies that role is currently available, atomically revokes the old token and creates a new active-role token, then returns it. This rotation happens even when the requested role matches the legacy compatibility default. The old bearer must return 401. Switching to parent returns guardian-scoped children; switching to coach returns an empty children list.

## Compatibility and Deployment

An old mini-program storage entry with no `availableRoles` is treated as `[role]`. A single-role login receives an active session and keeps current direct routing. The new client capability header separates the pending-session protocol from the old dual-role login contract, so older clients continue receiving their legacy active compatibility-default session while new clients render the selector.

The persisted session is shared only when all API instances use the same durable `DATABASE_URL`/database volume with SQLite-compatible locking. The task adds an integration test using two server instances against one database file; it does not claim safe shared state over arbitrary NFS or across separate database files. API restart invalidates old process-memory sessions and requires those users to log in once again.

## Persistent In-App Entry Design

The role switch must not be discoverable only through account settings. The online Figma authority now contains the reusable `RoleSwitchEntry` component set at `304:14`: parent variant `304:2`, coach variant `304:8`. It appears on `93:336 / P7 Parent Profile Hub` as `305:340`, immediately after the child card, and on `93:1182 / C16 Coach Me` as `305:430`, immediately after the coach profile card. Both entries show the server-confirmed current role and a compact `切换 ›` action.

The mini-program renders either entry only when the restored authenticated session's `availableRoles` includes the opposite role. Tapping it keeps the same server-confirmed `switchActiveRole` flow: request the desired role, persist the complete rotated session response, then route to that response's role. A client never exposes a switch for a single-role session and does not locally assign a role.

## Production Acceptance Demo Scenario

The existing acceptance-family user is the only production demo identity for this task. Its source-controlled seed becomes an active `parent` + `coach` membership, retains the same parent profile and two guardian-scoped children, and gains one active coach profile and a non-primary `双角色体验队`. All scenario IDs are stable so boot seeding is idempotent and a container restart re-applies the intended membership rather than undoing a direct database-only patch.

The scenario adds explicitly labelled August 2026 data: one completed training with present/late attendance, one completed friendly match with roster, goal, assist, and coach notes, one upcoming training using the existing `session-plan-finishing`, one scheduled friendly match reserved for tactical-board saving, and current eight-dimension assessment records for the two existing children. A tactical board is deliberately saved through the deployed coach route after deployment, then read back after an API restart; it is not faked in mini-program state. Before deployment, take a timestamped backup of the production SQLite database volume. Do not alter any other family, existing coach, or unrelated event.

## Risks and Rollback

The phone authorization guard task has related login-page changes and must be used as the baseline rather than overwritten. The additive API field and durable session semantics land before any selector UI. `coach/account` remains unmodified because it has an existing visual contract; the coach switch control belongs in `coach/me`. Roll back the mini-program selector and switching controls before API layers if necessary; do not drop the additive session table in production.

The demo seed writes persistent records when the acceptance-seed flag is explicitly `1`; restoring an older image alone does not remove those rows. The only data rollback is the fixed-ID, transaction-based `rollback-cq-talent-acceptance-demo` operation, which first requires all four demo events and the acceptance membership to exist, then deletes only their tactical board, participants, metric records, match records, demo team/coach, and active sessions for that demo user before restoring that user and membership to `parent` only. It must run from the deployed demo release with its confirmation argument before switching to a release that omits the demo seed. Verify fixed demo IDs are absent and the membership is parent-only afterwards. A volume backup is a last-resort recovery mechanism: do not restore it over normal production writes without explicit approval.

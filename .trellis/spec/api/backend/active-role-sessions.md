# Active Role Sessions

## Scenario: Durable Parent/Coach Switching

### 1. Scope / Trigger

- Trigger: a mini-program signs in through `POST /clubs/:clubId/app-clients/:clientId/wechat-login` or changes its active experience through `POST /clubs/:clubId/app-clients/:clientId/session/role`.
- This is the authentication boundary for a membership that can use both the parent and coach experiences.

### 2. Signatures

- Optional header: `X-App-Client-Capabilities: active-role-switch-v1` (legacy chooser) or `auto-active-role-v1` (current automatic login/switch).
- Login response adds `availableRoles: ("parent" | "coach")[]` and `session.activeRole: "parent" | "coach" | null`.
- Role selection request: `{ role: "parent" | "coach" }` with `Authorization: Bearer <token>`.

### 3. Contracts

- `availableRoles` is calculated once from the current active membership plus current app-client entrypoints. Its fixed ordering is parent then coach; owner/admin/operator map to coach, finance maps to neither.
- The raw bearer is random and opaque; SQLite stores only its SHA-256 hash along with club, client, user, membership, active role, expiry, and revocation data.
- An `active-role-switch-v1` dual-role login creates a pending session (`activeRole: null`). It cannot use parent or coach BFF routes until role selection. A legacy client without the header keeps the existing scoped compatibility-default session.
- Every selection, including the compatibility default, atomically revokes the presented token and returns a fresh token. The client persists and routes only from that response.
- Every bearer request rechecks route club/client, active user, exact active membership, app-client status, current `availableRoles`, and active role. A missing, expired, revoked, stale, or pending session returns `401 authentication_required`; bearer-shaped headers never fall back to development header authentication.
- Parent children are projected only for an active parent session. Coach responses return no parent child projection.

### 4. Validation & Error Matrix

- Unsupported capability header -> `400` request validation error.
- Requested valid app role not in current `availableRoles` -> `403 forbidden`.
- Unknown, expired, revoked, pending, inactive-user, inactive-membership, inactive-client, or stale-role token -> `401 authentication_required`.
- A malformed or unknown bearer is terminal and cannot fall back to `X-User-Id` or phone resolution.

### 5. Good/Base/Bad Cases

- Good: a parent+coach capable client receives `["parent", "coach"]` and a pending token, chooses parent, then receives a rotated parent token plus guardian-scoped children.
- Base: a coach-only membership receives `["coach"]` and an immediately active coach token.
- Bad: write `role: "coach"` in mini-program storage while holding a parent token. The server still rejects coach BFF requests.

### 6. Tests Required

- Contract tests cover parent-only, coach-only, dual-role, operator, finance-only, header-gated pending sessions, token rotation, old-token rejection, and guardian child projection.
- A file-backed SQLite test closes every API/database instance, reopens the database, and verifies a current active token remains valid; it separately proves a role removed from membership is rejected.
- OpenAPI tests assert the capability header and successful login/role-selection schemas include `availableRoles` and `session.activeRole`.

### 7. Wrong vs Correct

#### Wrong

```typescript
setSession({ ...session, role: "coach" });
```

#### Correct

```typescript
const switched = await api.switchActiveRole("coach");
setSession(switched);
```

## Automatic protocol (2026-10-21)

`auto-active-role-v1` first derives authorized roles from current membership/client entrypoints and real parent/active-coach profiles, then removes parent without a bound operational child. Choose a valid lastActiveRole, valid backend defaultRole, or the sole enterable role, in that order. Multiple enterable roles without configuration return role_configuration_required and no session; never create a null-activeRole automatic session. A blocked parent must not block a valid coach.

Migration0044 stores nullable default_role and last_active_role uniquely by club/client/user. Do not infer a default from existing sessions. Admin changes default only through audited/versioned app-role-preferences; successful scoped login/rotation writes last. New-mode session/role validates the same enterable set; legacy headers retain their original contracts. Tests cover persistence/restart, removed membership, unbound parent with valid coach, invalid new-mode switch, audit and409.

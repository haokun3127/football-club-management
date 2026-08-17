# Dual Role Switching — Backend Foundation

Date: 2026-08-11

This batch adds the server-side foundation for one real membership to use the parent and coach mini-program experiences safely. SQLite now persists hashed opaque app-client session tokens, selection atomically rotates tokens, and every bearer request revalidates the active user, exact membership, app client, entrypoint-filtered roles, and active role.

The capability-aware login protocol is `X-App-Client-Capabilities: active-role-switch-v1`. A capable dual-role client receives a pending session and cannot call either role BFF before selection; a legacy client retains its old compatibility-default active session. `POST /session/role` is the sole authority for changing active role.

The backend contract was followed by the mini-program batch: the login chooser keeps capable dual-role sessions pending until a server-confirmed selection, and parent/coach in-app entries switch only through the rotating role endpoint. The authoritative contract is now recorded in `.trellis/spec/api/backend/active-role-sessions.md`; production test-account import and device-side login remain separate deployment/runtime work and are not implied by repository tests.

Verification on this checkout: API role-switch integration `2/2`, OpenAPI/login contract checks `2/2`, mini-program role-switch checks `44/44`; the full repository gate is run during task closeout.

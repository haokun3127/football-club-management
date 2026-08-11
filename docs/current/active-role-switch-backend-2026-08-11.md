# Dual Role Switching — Backend Foundation

Date: 2026-08-11

This batch adds the server-side foundation for one real membership to use the parent and coach mini-program experiences safely. SQLite now persists hashed opaque app-client session tokens, selection atomically rotates tokens, and every bearer request revalidates the active user, exact membership, app client, entrypoint-filtered roles, and active role.

The capability-aware login protocol is `X-App-Client-Capabilities: active-role-switch-v1`. A capable dual-role client receives a pending session and cannot call either role BFF before selection; a legacy client retains its old compatibility-default active session. `POST /session/role` is the sole authority for changing active role.

Verification on this checkout: full API test suite 81/81, API typecheck, and `git diff --check` all passed. Terra xhigh reviewed the corrected backend diff and approved it. The remaining work is a separate mini-program batch: login chooser, persisted `availableRoles`, and parent/coach in-app switch controls.

# Research: miniprogram role-switch final review

- Query: Terra xhigh read-only final review of the active role-switch mini-program source, templates, and tests.
- Scope: internal
- Date: 2026-08-11

## Findings

### Files found

- `apps/miniprogram-cq-talent/utils/types.ts` — models the additive `availableRoles` and server-confirmed nullable `session.activeRole` response fields.
- `apps/miniprogram-cq-talent/utils/store.ts` — accepts only an authenticated response with an active role present in `availableRoles`, then persists the full server response; supports legacy stored sessions.
- `apps/miniprogram-cq-talent/utils/api.ts` and `utils/request.ts` — advertises the capability header and sends the pending bearer only to the selection endpoint.
- `apps/miniprogram-cq-talent/pages/login/index.ts` and `index.wxml` — holds a dual-role session in page memory, displays explicit choices, and persists/routes only after the selection response.
- `apps/miniprogram-cq-talent/pages/parent/account/index.ts` and `index.wxml` — conditionally exposes the coach switch from `availableRoles` and rechecks before switching.
- `apps/miniprogram-cq-talent/pages/coach/me/index.ts` and `index.wxml` — conditionally exposes the parent switch from `availableRoles` and rechecks before switching.
- `apps/miniprogram-cq-talent/{utils,pages/**}/**/*.test.mjs` — covers capability transport, bearer override, storage compatibility, dual-role selection, default-role selection, single phone authorization, and availability-gated controls.

### Code patterns

- The mini-program always sends `X-App-Client-Capabilities: active-role-switch-v1` at login and its role API sends the role-selection request to `/session/role` with an optional bearer override (`apps/miniprogram-cq-talent/utils/api.ts:44-61`). The request layer prefers that override to the stored token (`apps/miniprogram-cq-talent/utils/request.ts:32-35`).
- A pending dual-role response is retained only in `pendingRoleLogin`; the login page neither persists nor routes it (`apps/miniprogram-cq-talent/pages/login/index.ts:103-114`). `chooseRole` requires the pending `activeRole` to be null, calls the server with the pending token, and only then calls `finishAuthenticatedSession` (`apps/miniprogram-cq-talent/pages/login/index.ts:147-162`).
- Session persistence requires `status === "authenticated"`, an active server role, profile/client data, and membership of that role in `availableRoles`; local compatibility `role` is not used as the persisted authorization role (`apps/miniprogram-cq-talent/utils/store.ts:45-68`). Older stored sessions receive `[role]` only as storage compatibility (`apps/miniprogram-cq-talent/utils/store.ts:99-112`).
- Single-role responses retain direct post-login persistence/routing because only an inactive session with more than one available role enters the chooser (`apps/miniprogram-cq-talent/pages/login/index.ts:103-115`).
- Default-role selection still invokes the same selection endpoint with the pending token; the test asserts the returned rotated coach token is persisted and routed (`apps/miniprogram-cq-talent/pages/login/index.test.mjs:194-237`).
- The chooser has no second phone action; it operates after exactly one `wechatLogin`, and its test asserts the initial selection has no persistence or routing before the response (`apps/miniprogram-cq-talent/pages/login/index.test.mjs:149-192`). The existing native-callback single-flight guard remains covered (`apps/miniprogram-cq-talent/pages/login/index.test.mjs:133-147`).
- Parent and coach controls are derived from `session.availableRoles` and are rechecked in their handlers (`apps/miniprogram-cq-talent/pages/parent/account/index.ts:32,55-62`; `apps/miniprogram-cq-talent/pages/coach/me/index.ts:48,76-82`); their templates gate rendering with `wx:if` (`pages/parent/account/index.wxml:18`; `pages/coach/me/index.wxml:27`).
- The full mini-program WXML scan found no `.map(`, `.filter(`, `.slice(`, or `.indexOf(` call. The login template renders fixed, precomputed boolean role choices (`apps/miniprogram-cq-talent/pages/login/index.wxml:11-17`).
- The inspected role-switch source/template/test set contains no `project.config.json` or icon asset. Existing task instructions also explicitly exclude them (`.trellis/tasks/08-10-active-role-switch/implement.md:7`).
- Provided evidence reports mini-program tests passing 276/276, typecheck passing, and `git diff --check` passing; these checks were not rerun for this read-only review.

## External references

- None consulted; this review is based on the active task artifacts and repository source.

## Related specs

- `.trellis/tasks/08-10-active-role-switch/prd.md`
- `.trellis/tasks/08-10-active-role-switch/design.md`
- `.trellis/tasks/08-10-active-role-switch/implement.md`
- `.trellis/spec/api/backend/active-role-sessions.md`

## Caveats / Not Found

- `python3 ./.trellis/scripts/task.py current --source` exited with no active runtime-session output, so the user-provided active-task path was used.
- The researcher role forbids Git operations; the source/template/test scope was inspected directly and the supplied diff-check evidence was accepted as stated.

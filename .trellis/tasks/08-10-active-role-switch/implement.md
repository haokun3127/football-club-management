# Active Role Switch Implementation Plan

## Global constraints

- No client-local role mutation grants authorization. `roleHint`, storage, profile roles, and phone numbers are not authorization sources.
- WXML contains no `.map()`, `.filter()`, `.slice()`, or `.indexOf()` calls; view models are precomputed in TypeScript.
- Preserve phone-authorization single-flight behavior and all guardian/coach BFF scope checks.
- Use path-limited staging; exclude `project.config.json`, unreferenced icon files, `docs/superpowers/`, the WPS workbook, and unrelated working-tree changes.

1. **API durable-session foundation (TDD).** Add failing repository and server tests for a hashed persistent token surviving database reopen and a second server instance, then add the SQLite migration/repository and replace the in-memory auth snapshot with async revalidation. A token must bind club, app client, user, membership, expiry, revocation, and nullable `activeRole`; protected parent/coach routes reject pending or stale active-role sessions.

2. **API role contract and switching (TDD).** Add failing tests for entrypoint-filtered parent-only, coach-only, dual-role, admin/operator-to-coach, and finance-only memberships. Add the shared mapper, compatible login `availableRoles`, and `X-App-Client-Capabilities: active-role-switch-v1`: a capable dual-role client receives a pending session; a non-capable legacy client receives the scoped compatibility-default active session. Add guardian child projection whenever parent is available and the server-confirmed role endpoint. Cover token rotation for both default and non-default selections, old-token 401, unavailable-role 403, and revalidation after user/membership/app-client changes.

3. **Mini-program session transport and state (TDD).** Add failing unit tests for `availableRoles` storage compatibility, a request-specific bearer override for choosing the non-default role, and accepting only full server-confirmed session responses. Implement the minimal types/store/API changes; old stored sessions fall back to `[role]`.

4. **Login chooser (TDD).** Add tests showing single-role users retain direct routing, while dual-role users authorize their phone only once, do not route before choosing, and route only after the role endpoint responds. Implement a focused selector in the login page without changing the existing 10-second authorization guard.

5. **In-app switching controls (TDD).** Add parent-account, parent-child-hub, and coach-me visibility/routing tests. Show the daily switch entry on P7 immediately after the child card and C16 immediately after the coach profile only if the opposite role is in `availableRoles`; call the server endpoint, replace the stored session with its complete response, then relaunch the selected home. Keep coach-account untouched.

6. **Full verification and documentation.** Run focused API and mini-program tests after each task; then run `npx.cmd --yes pnpm@10.33.0 run check` and `git diff --check`. Update the app-client BFF contract and progress/task records with SQLite sharing constraints, token rotation, and exact test evidence. Commit coherent API/session and mini-program/UI batches only after Terra review.

7. **Production acceptance demo seed (TDD).** Add a failing acceptance-seed regression for the existing acceptance user as a parent+coach, its coach profile, demo team, two child memberships, three dated events, training-plan linkage, completed-match records, and current radar records. Implement only fixed-ID, explicitly labelled scenario data in `cq-talent-acceptance.ts`; run the focused API suite and typecheck. Review the diff before deployment.

8. **Production backup, release, and readback.** Build the approved API release, back up the named production SQLite volume before writing, deploy the release without copying user credentials into the repository, and restart only `cq-talent-api`. Verify HTTPS health; then use the deployed authentication/coach paths to confirm the acceptance membership exposes both roles, parent calendar returns only its two children and new events, coach home returns the demo events, and a saved tactical board survives one API restart. Record only identifiers, dates, status codes, and backup location class in the progress log; never record a bearer token, password, or phone number.

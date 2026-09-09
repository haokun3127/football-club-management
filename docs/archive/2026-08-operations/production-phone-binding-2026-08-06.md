# Production parent phone binding — 2026-08-06

## Outcome

- Deployed `9720b40` (`fix(api): preserve bound phones across seed restart`) as an isolated API release.
- The production API is healthy after the release and after a second explicit restart.
- The authorized target phone (kept out of this repository) is bound to the existing acceptance parent user/profile only.
- Restart readback confirmed the same masked phone mapping in both `user_accounts` and `parent_profiles`.
- The target user remains an active `parent` membership for `club-chongqing-talent`; the existing acceptance guardian mapping remains intact.

## Safety controls used

- A private SQLite snapshot was created before the production transaction.
- Production preflight confirmed the target phone had no existing owner in either phone column, and verified the fixed user/profile IDs and active parent membership.
- One SQLite transaction updated exactly one user-account row and one parent-profile row, limited to `phone` and `updated_at`.
- No user, role, membership, child, guardian binding, session, or API response was created or changed.
- No full phone number, secret, database contents, or session token is recorded here.

## Verification

- API `/health` returned `{"status":"ok","service":"@football-club/api"}` after deployment and restart.
- Local API full test: 67/67 passed; API typecheck and build passed.
- Full workspace check was not green because the unchanged mini-program screenshot test failed to load with `SyntaxError: Invalid or unexpected token` before collecting tests; it is outside this hotfix scope.
- Historical API fixture failures at `apps/api/test/server.test.ts:688` and `apps/api/test/server.test.ts:1344` were not reproduced in this hotfix baseline and are documented as not reproduced, not waived.

## Remaining manual acceptance

The owner must perform a real WeChat phone authorization in the mini-program. Expected result: authenticated `parent` flow with the existing two children. Do not simulate a session or role to complete this check.

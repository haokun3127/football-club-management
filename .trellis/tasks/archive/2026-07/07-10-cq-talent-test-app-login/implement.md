# Implementation Plan

1. Add envVersion-aware runtime configuration and WeChat typings.
2. Add LoginResult/session expiry types and API client.
3. Add independent login page and launch routing.
4. Add request 401/expiry handling and non-dev identity guard.
5. Add backend connector interface/config status and login contract tests.
6. Update app routes, docs and manual acceptance checklist.
7. Run full checks, 200-person smoke and DevTools CLI open/preview.

## Validation

- `pnpm check`
- `pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client`
- `pnpm --filter @football-club/miniprogram-cq-talent devtools:preview`
- `python3 ./.trellis/scripts/task.py validate 07-10-cq-talent-test-app-login`

## Risk Gates

- Never authorize from roleHint.
- Never use dev headers outside develop mode.
- Never claim production login without official credentials.

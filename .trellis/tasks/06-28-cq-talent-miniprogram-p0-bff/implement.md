# Implementation Plan

1. Harden `wechat-login` so production identity comes from WeChat phone binding and club records, not `roleHint`.
2. Add parent family calendar aggregation route and schema.
3. Add coach training project tree route and schema, derived from existing CQ talent assessment/training catalog.
4. Add event training project save route and persistence/service layer.
5. Update OpenAPI and server tests.
6. Run API typecheck/tests.
7. Re-run mini-program smoke against local API.

## Validation Commands

```bash
pnpm --filter @football-club/api typecheck
pnpm --filter @football-club/api test
pnpm --filter @football-club/miniprogram-cq-talent typecheck
```

Smoke:

```bash
curl -fsS 'http://127.0.0.1:3000/app-clients/resolve?clientKey=cq-talent-wechat-main'
curl -fsS -H 'X-User-Id: user-parent-cq-talent-acceptance' \
  'http://127.0.0.1:3000/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/calendar?from=2026-06-28&to=2026-07-05'
curl -fsS -H 'X-User-Id: user-coach-1' \
  'http://127.0.0.1:3000/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/training-project-tree'
```

## Mini-Program Handoff Evidence

2026-06-28, FCM-G verified the current mini-program against local API with `/tmp/fcm-cq-talent-smoke.sqlite`:

- `resolve`, `capabilities`, parent children/home/schedule/growth passed for `user-parent-cq-talent-acceptance`; parent children returned 200 imported CQ Talent students.
- Coach `home` and `workbench` passed for `user-coach-1`; `event-cq-talent-u10-dev-training` returned 25 roster participants.
- Existing app-client writes passed: attendance PUT, lesson confirmation POST/PATCH, match summary POST, assessment POST with 62 template input fields.
- `pnpm --filter @football-club/api typecheck`, `pnpm --filter @football-club/api test`, `pnpm --filter @football-club/miniprogram-cq-talent typecheck` passed.
- WeChat DevTools CLI `islogin/open/preview` passed with test AppID `wx3df49f3b936ab2ed`; preview package size `94.8 KB / 97054 Byte`.

This task is therefore scoped to the remaining P0 BFFs only: production `wechat-login`, parent family calendar, coach training project tree, and event training project save.

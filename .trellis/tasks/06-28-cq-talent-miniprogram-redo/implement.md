# Implementation Plan

1. Write project context and Trellis artifacts.
2. Replace global config, types, store, auth, request, and BFF client.
3. Add shared `role-tabbar` and `status-view` components.
4. Rewrite launch flow with resolve + dev identity + role routing.
5. Rebuild parent pages and details around BFF data and pending states.
6. Rebuild coach pages and workflow entries around workbench data and pending write states.
7. Update docs and README to remove visible mock-login guidance and add imported-data test plan.
8. Run typecheck, static grep checks, API smoke where possible, and WeChat DevTools CLI open/preview.

## Validation Commands

- `pnpm --filter @football-club/miniprogram-cq-talent typecheck`
- `rg -n "mock 登录|家长 mock|教练 mock|club-demo|张小明|王教练" apps/miniprogram-cq-talent`
- `curl http://127.0.0.1:3000/health`
- `/Applications/wechatwebdevtools.app/Contents/MacOS/cli islogin`
- `/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent`
- `/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/dongjun/Documents/football-club-management/apps/miniprogram-cq-talent`

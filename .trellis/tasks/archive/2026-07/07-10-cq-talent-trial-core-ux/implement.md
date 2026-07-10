# Implementation Plan

1. Extend coach home/store/OpenAPI types and tests for date range, summary and tasks.
2. Update mini-program types, API normalization and coach schedule/workbench rendering.
3. Change parent schedule to all-children default with compact child filtering.
4. Normalize and render differentiated activity detail cards.
5. Fix match assist/capability validation and role-tabbar stack replacement.
6. Return and restore selected training projects; add activity selection, search, collapse and selected-project summary.
7. Replace technical user copy with plain-language pending/error states.
8. Run full checks, API contract tests, static UX grep, 200-person smoke and Trellis spec update.

## Validation

- `pnpm check`
- `pnpm --filter @football-club/miniprogram-cq-talent typecheck`
- `pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client`
- `python3 ./.trellis/scripts/task.py validate 07-10-cq-talent-trial-core-ux`
- `rg -n "BFF|app-client|Idempotency-Key|P1|P2|/clubs/:clubId" apps/miniprogram-cq-talent/pages apps/miniprogram-cq-talent/components`

## Risk Gates

- Preserve `date` query behavior while adding date ranges.
- Do not infer coach permission in the client.
- Do not generate assist records from a default roster index.
- Do not clear existing training selection until the workbench backfill is loaded.

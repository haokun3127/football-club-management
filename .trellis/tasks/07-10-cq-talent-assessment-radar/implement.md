# Implementation Plan

1. Add MetricView, MetricDetail and AssessmentDraft types/API normalizers.
2. Add assessment draft storage utilities and deterministic grouping/progress helpers.
3. Rebuild assessment page around item navigation and roster rows.
4. Add partial-submit result handling and successful-draft cleanup.
5. Extend RadarCanvas selection/highlight behavior.
6. Rebuild growth page view selector, selected metric summary and on-demand detail.
7. Implement metric detail trend/source page and event links.
8. Add contract/helper tests, run full checks and 200-person smoke.

## Validation

- `pnpm check`
- `pnpm --filter @football-club/miniprogram-cq-talent typecheck`
- `pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client`
- `python3 ./.trellis/scripts/task.py validate 07-10-cq-talent-assessment-radar`

## Risk Gates

- Never clear failed or unsubmitted drafts.
- Never map a radar point by array index; metricId is the sole identity.
- Never display a zero for a missing metric record.

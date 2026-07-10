# Technical Design

## Assessment Draft

- Storage key namespace: `cqTalentAssessmentDraft:<eventId>:<templateVersionId>`.
- Draft map key: `<studentId>:<testItemId>` with status `empty|recorded|missing`, rawValue, missingReason and updatedAt.
- Current UI is test-item-first. Final submit groups recorded values by student and calls the existing assessment endpoint sequentially, recording per-student results.

## Metric Views and Detail

- Growth normalizer reads `assessment.views/viewNodes` and maps active view nodes to radar metrics by metricId.
- Page owns `selectedViewId`, `selectedMetricId`, and a cached MetricDetail map.
- Radar emits metricId; page selection updates the highlighted point and fetches detail on demand.
- Detail page uses the same API and links source event ids to the parent event page.

## Compatibility

- Existing assessment POST and metric detail GET remain unchanged.
- Draft storage is local-only and versioned by templateVersionId.
- Existing growth payload without views falls back to the current radar order.

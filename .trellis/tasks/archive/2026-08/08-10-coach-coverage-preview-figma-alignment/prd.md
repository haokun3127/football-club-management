# C10.1 Coach Coverage Preview

## Goal

Align the existing `/pages/coach/coverage/index` route with Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:983 / C10.1 Coverage Preview` using only the real read-only coach training-coverage projection.

## Requirements

- Require the coach role before the sole `getCoachTrainingCoverage()` read; a non-coach makes no request.
- Present only returned student names, dimensions, `coveredCount`, `totalCount`, `covered`, and `scorePercent`. This data is the coach's near-30-day activity union, not the current C10 selection.
- Treat `scorePercent: null` as unsynchronized data. Do not invent a nonzero bar, examples, dimension names, or student names.
- Retain Figma's local pink 88px navigation, page/card geometry, coverage rows, and coach training tab state. Do not retain `app-header`.
- The Figma confirm footer has no corresponding write contract. It must not perform a write, claim a save, or hard-code its example count.
- Do not change C10, API helpers, types, app configuration, backend, shared components, or assessment WIP.

## Acceptance Criteria

- [ ] Coach load, empty, safe-error, retry, and stale-result behavior are focused-test covered.
- [ ] Student and dimension view models are derived only from the real response, including truthful null/zero handling.
- [ ] The template has no JavaScript helpers, sample facts, or interactive confirmation action.
- [ ] Focused tests, Mini Program typecheck, task validation, and diff check pass.

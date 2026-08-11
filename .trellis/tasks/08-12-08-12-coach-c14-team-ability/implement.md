# C14 Implementation Plan

1. Add a failing focused test that locks the 1040rpx hero, non-overlapping radar composition and mutually exclusive empty/radar branches.
2. Adjust the C14 template and page-local WXSS only; keep its controller and API contract intact unless a view-model flag is necessary.
3. Run focused tests and typecheck, then the root quality gate and diff check.
4. Record the data boundary and validation outcome in progress, then commit only task/C14/docs files.

## Execution record

- RED: C14's existing focused test failed because it still encoded the half-height hero and no exclusive radar-state container.
- GREEN: C14's focused test passed `5/5` after the card was restored to 1040rpx, the radar composition became vertical, and the empty branch was separated from score/trend.
- Gate: root `check` passed with domain `19/19`, mini-program `306/306`, API `85/85`; TypeScript and `git diff --check` passed. No new runtime screenshot was captured.

# C10.1 Implementation Plan

## Allowlist

- `apps/miniprogram-cq-talent/pages/coach/coverage/index.{json,ts,wxml,wxss,test.mjs}`
- A direct Figma back-arrow asset only if the existing chevron cannot be reused unchanged.
- This task directory and the parent task child pointer.

## TDD

1. Add focused RED coverage for non-coach zero requests; single successful read; real response normalization; null and zero score behavior; empty and safe error states; retry and stale success/failure protection; and static template safety.
2. Replace the page's app-header and raw error path with page-owned Figma layout and state handling. Do not add writes or modify API helpers.
3. Run focused tests, Mini Program typecheck, task validation, and diff check.

## Review Boundary

The page is an historical near-30-day coverage view. It must not claim to preview the current C10 selection, persist a confirmation, or display Figma sample values.

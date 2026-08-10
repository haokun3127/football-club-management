# C6.2 Implementation Plan

## Allowlist

- `apps/miniprogram-cq-talent/utils/{api.ts,types.ts,api.test.mjs}`.
- New `apps/miniprogram-cq-talent/utils/match-event-draft.{ts,test.mjs}`.
- `apps/miniprogram-cq-talent/pages/coach/match-event-add/index.{json,ts,wxml,wxss,test.mjs}`.
- `apps/miniprogram-cq-talent/pages/coach/match/index.{json,ts,wxml,wxss,test.mjs}` and direct C6.2 Figma assets only.
- This task directory and its already-created parent child pointer.

## TDD Order

1. Helper RED: valid schema and scoped keying, malformed values ignored, only material user changes persisted, and clear-on-exact-201 behavior.
2. C6.1 RED: valid local save/restore, no save before user change, preservation through rejected/network/unknown submit, and exact-201 clear.
3. C6 RED: real detail/capability intersection, no modal for invalid drafts, Continue/Exit navigation, stale detail guard, and static Figma safety.
4. Client GREEN: add only page-owned state and local helper calls, with no WXML helpers and no false live-match content.

## Verification

- Focused helper, C6, C6.1, and API-helper Mini Program tests.
- Mini Program typecheck and package test, task validation, and `git diff --check`.

## Protected Boundaries

Do not edit or stage API/domain/store/persistence, assessment WIP, shared components, project configuration, or any existing WIP outside the listed Mini Program files.

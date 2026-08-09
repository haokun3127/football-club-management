# Align C10 training content select to Figma

## Goal

Implement C10 Training Content Select (`93:952`) from Figma file `zZ6wKyOHKcO4UYXDd9jGwv` with the existing real project-tree, event-workbench, and training-project APIs. Correct C2's training action to route to C10.

## Requirements

- Route: `/pages/coach/content-select/index?eventId=<eventId>`.
- A real event ID is required. With it, load the existing project tree and event workbench in parallel; workbench must match the route event ID, be a non-cancelled training activity, and preselect only its returned `selectedTrainingProjectIds`. Any mismatch/invalid event has no save surface.
- Merge every real group membership for a duplicate project ID. Save a deduplicated, stable ordered real ID set through the existing training-project PUT and compare readback with the same set semantics. Only an exact match permits success and navigation; request/readback failure or mismatch retains selection with a safe error state.
- Search, grouping, deduplication, selection count, and duration total are TypeScript view-model work. Missing/unknown duration is not invented.
- C2's training action navigates to C10 with its real event ID; it no longer points at C8.
- Do not fabricate Figma sample categories, names, difficulty, duration, selected items, or fixed counts. Fixed target colors are presentation only, never inferred business categories.
- This batch does not claim the existing non-transactional training plan/session write persists after an API restart.
- WXML has no JS array/string helper calls. No API, backend, shared component, or app configuration change is permitted.

## Acceptance Criteria

- [x] Missing event ID makes no API request or save.
- [x] Parallel real reads restore selections; filters/search/deduplication/count/duration use actual project fields only.
- [x] Zero selection and double tap are blocked; failure/mismatch preserves state; only matched readback returns.
- [x] C2 routes the training action to C10 with a real ID.
- [x] Focused C10/C2 tests, package checks, typecheck, and diff check pass.
- [ ] Device screenshot comparison is non-blocking under the current all-pages goal and is not claimed as complete.

## Notes

- Figma: `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-952`.
- Page allowlist: `pages/coach/content-select/index.{json,ts,wxml,wxss,test.mjs}`, `pages/coach/event/index.{ts,test.mjs}`, direct Figma C10 icon assets only if each has no faithful local equivalent, and this task directory. C10 replaces `app-header` with a page-local pink `176rpx`/`border-box` navigation bar.

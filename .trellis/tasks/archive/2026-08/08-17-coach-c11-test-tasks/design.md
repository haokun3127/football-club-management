# Technical design — Coach C11 assessment task list restoration

## Boundary

This batch changes only `pages/coach/test-tasks` and its focused test, plus the C11 task/progress/spec records. `utils/api.ts`, API routes, domain models, and stored assessment data remain unchanged.

## Presentation model

The existing `TaskCard` view model continues to calculate labels, status class, date range, progress label, safe percentage, and entry availability from the canonical response. It gains only presentation-safe fields needed to render a Figma-style track state and an honest disabled creation action. The WXML receives no array or string method calls.

The header follows the shared C10 pattern: content-box `176rpx` page nav plus the dynamic safe-area top inset. The title stays left of the native capsule, while the right “新增” action receives the dynamic menu inset as right padding. The body keeps the Figma 16px/22px geometry. Cards show a chevron for every task because C11’s design does, but controller guards preserve the existing rules before navigating.

## Unavailable create affordances

Both Figma add affordances dispatch the same page-local handler. It uses `wx.showToast` with an explicit unavailable message. It does not call `getCoachAssessmentTasks` again, call an unimplemented API, mutate `tasks`, or claim a task was created. This retains visual fidelity without violating the real-data boundary.

## Compatibility and rollback

The task-list response and test-entry URL are unchanged. A rollback is a revert of the isolated C11 commit; no production record needs repair.

## Verification

The focused Vitest test proves real-data derivation, filters, role/status routing, unavailable add behavior, Figma source hooks, and the WXML restriction. After implementation, run mini-program typecheck, whitespace validation, and the repository gate. A DevTools screenshot is attempted only after a fresh IDE compilation and is reported separately from test evidence.

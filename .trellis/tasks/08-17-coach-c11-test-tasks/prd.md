# Coach C11 assessment task list Figma restoration

## Goal

Restore the coach assessment-task list to online Figma C11 while preserving its existing read-only task-list and assessment-entry contracts.

## Confirmed facts

- The sole visual authority is Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1002` (C11 Test Task List). The checked-in geometry record is `docs/design/specifications/coach/design-spec-C11-test-tasks.md`.
- The page reads real tasks through `getCoachAssessmentTasks()`. Returned status values are `not_started`, `in_progress`, and `completed`; task title, date range, student progress, and `templateId` are all response-derived.
- Only real `in_progress` tasks with a `templateId` may enter `pages/coach/assessment-entry`. `not_started` and `completed` tasks must continue to explain why they cannot enter.
- The Figma top-right “新增” and circular FAB have no matching create API. They may remain as visual affordances only if their tap result clearly states that creation is not available in this mini-program. They must not create local records, call a write endpoint, or show a fabricated success state.
- This is an inline Codex task under the user-authorized coach-restoration goal. It must not touch the unrelated uncommitted files named in the current handoff.

## Requirements

1. C11 shall use the Figma soft-pink, content-box 88px top navigation with left back/title group, a right “新增” affordance protected by the native menu-capsule inset, and an equivalent Figma FAB above the coach tab bar.
2. C11 shall retain its 16px page gutter, 32px filter chips, 12px-radius/16px-padding task cards, 4px progress tracks, status hierarchy, card spacing, and chevron layout from node `93:1002`.
3. Every displayed task field must remain derived from the real API response. Figma sample titles, dates, progress counts, and statuses must never be embedded in WXML, TypeScript, or test fixtures used by production.
4. The Figma chevron is present on every card. Its existing role/status routing behavior remains unchanged: only a currently in-progress task with a real template opens score entry.
5. WXML shall not contain JavaScript array methods; presentation arrays, labels, status classes, widths, and accessibility state must be precomputed in TypeScript.

## Acceptance Criteria

- [x] Focused C11 tests first assert the expected Figma structural hooks, real-data-only rendering, non-fabricated creation handling, and task-route guard behavior.
- [x] The page uses the online C11 top nav/body/card/FAB hierarchy while preserving real list loading, filters, retry, status guards, and assessment-entry navigation.
- [x] Both “新增” affordances show an honest unavailable message and make no write request or in-memory task mutation.
- [x] The focused mini-program test, mini-program typecheck, `git diff --check`, and repository gate pass before commit.
- [x] Screenshot availability is documented precisely. Static/test verification is not described as a 375x812 visual acceptance result.

## Out of scope

- Creating assessment tasks, changing server contracts, seeding production tasks, or changing authentication/role behavior.
- Hardcoding Figma demo task data or pretending the unavailable create flow completed.
- Changes to any unrelated uncommitted handoff file.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.

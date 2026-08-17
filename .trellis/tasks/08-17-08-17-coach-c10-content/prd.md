# Coach C10 training content and C10.1 coverage Figma restoration

## Goal

Restore the coach-side training-content selection and coverage-preview screens to the current online Figma layouts while preserving their existing real-data and persistence contracts.

## Confirmed facts

- The design authority is Figma file `zZ6wKyOHKcO4UYXDd9jGwv`: C10 node `93:952` and C10.1 node `93:983`. The checked-in geometry records are `docs/design/specifications/coach/design-spec-C10-content-select.md` and `docs/design/specifications/coach/design-spec-C10.1-coverage.md`.
- C10 reads `getCoachTrainingProjectTree()` and `getCoachWorkbench(eventId)`, then saves through `saveCoachTrainingProjects(eventId, ids)`. The event ID, API data, selection validation, readback verification, and error boundary are existing behavior and must remain real.
- C10.1 reads `getCoachTrainingCoverage()`. Its response is per coach-visible student and contains the actual dynamic ability dimensions, each with `covered` and `scorePercent`; it has no write or confirmation API.
- The task is an inline Codex task. The user explicitly authorized continuous implementation under the active coach-restoration goal; no sub-agent dispatch is in scope.

## Requirements

1. C10 shall use the Figma soft-pink 88px top-nav geometry, left-aligned back/title group, menu-capsule clearance, 44px search control, horizontally scrollable 32px category pills, 64px compact project rows, and 70px selection bottom bar.
2. C10 shall continue to display project names, difficulty, duration, categories, selected count, and duration only from the real project/workbench response. It shall not add Figma sample project names, durations, selections, or API results.
3. C10.1 shall use the Figma soft-pink 88px top-nav geometry, section title, 12px-radius student coverage cards, 6px tracks, and the Figma spacing/color hierarchy while retaining every returned real student and real dimension.
4. C10.1 shall not introduce a fake save/confirm request. If a Figma-shaped footer is rendered, its copy must be derived from the real coverage response and its action must be an honest local navigation action only.
5. Both pages shall retain role checks, loading/empty/error states, TypeScript-precomputed WXML view models, SVG asset usage, `role-tabbar`, and no WXML JavaScript methods.

## Acceptance criteria

- [x] Focused tests first prove the expected C10/C10.1 structure and real-data-derived labels; each test fails before its matching production change.
- [x] C10 passes real project-tree/workbench selection through the unchanged save + exact readback workflow and matches the Figma header/body/card/bottom-bar hierarchy.
- [x] C10.1 renders only actual returned students/dimensions, with Figma card/track/top-nav hierarchy, and never sends a confirmation write.
- [x] The affected mini-program tests, mini-program typecheck, `git diff --check`, and repository gate pass.
- [x] Any available screenshot evidence is recorded precisely; static/test evidence is not described as runtime visual acceptance.

## Out of scope

- API contract, database, production data, authentication, and session changes.
- Hardcoded Figma demo names, numbers, project choices, coverage values, or a fake C10.1 confirmation API.
- Changes to unrelated uncommitted files listed in the current handoff.

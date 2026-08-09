# Coach private interest Figma alignment

## Goal

Align C16.2 coach private-interest to the read-only private_lessons feature capability.

## Requirements

- Align the coach page to Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1238 / C16.2 Private Interest` without inventing a coach private-lesson workflow.
- Read only `requireRole("coach")` and `session.capabilities.features?.private_lessons`; make no API request or capability write.
- Render three honest states: `true` means the club has opened private lessons but coach acceptance status and availability are not integrated; `false` means the club has not opened private lessons; a missing flag means the service status is pending sync.
- Delete page-local storage, default weekday/time-slot data, local toggles, and all write interactions. Do not display weekday, `17:00` to `20:00`, fee, price, coach-assignment, or booking examples.
- Preserve only a back action. The Figma switch is a non-interactive pending-status marker, never a claim about the current coach's acceptance state.
- Use the Figma local 176rpx soft-pink top bar, 44rpx content gutters, 32rpx section gaps, 24rpx cards, coach role tabbar, and the direct chevron-left export.
- Do not modify API, utilities, store, persistence, project configuration, shared tabbar, or protected work in progress.

## Acceptance Criteria

- [x] Focused RED-to-GREEN tests cover `true`, `false`, missing feature, and non-coach zero request/zero storage behavior.
- [x] No page-local storage, weekday/time-slot/sample values, coach write action, API call, or interactive switch remains.
- [x] The Figma header and static pending states have the required geometry, safe wording, direct asset, and WXML safety.
- [x] Focused test, miniprogram typecheck, package test, task validation, and scoped diff check pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

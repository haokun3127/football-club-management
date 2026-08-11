# Coach C11 test tasks visual audit

## Goal

Restore the C11 test-task list header to the online Figma safe-area geometry
without changing task status, filtering, availability or entry behavior.

## Requirements

- Design authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1002 / C11 Test Task List`.
- Keep the existing authenticated assessment-task BFF as the only data source.
  Do not add the Figma “新增” control because no task-creation contract exists.
- Retain real filters, status labels, date ranges, progress and the existing
  entry guard; only correct the page-local header's safe-area box model.

## Acceptance Criteria

- [ ] Focused regression fails for the former compressed header and passes for
  the 88px content-box header.
- [ ] No sample task, person, date, count or task-creation action is added.
- [ ] Focused test, typecheck, root check and diff check pass before commit.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

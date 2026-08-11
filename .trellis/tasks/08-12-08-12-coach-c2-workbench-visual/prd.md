# Coach C2 workbench visual restoration

## Goal

Restore the coach activity workbench to online Figma C2 while preserving the
existing authenticated event/workbench actions and truthful backend data.

## Requirements


- Use only `zZ6wKyOHKcO4UYXDd9jGwv / 93:606 / C2 Activity Workbench` as the
  design source.
- Match C2's 88px white top navigation, 70px in-flow three-tab strip,
  22px content inset, 16px content gap, dark 16px-radius session card and
  white 12px-radius data cards. The tab strip belongs directly below the C2
  header; it is not the global fixed bottom tab bar.
- The in-flow tabs must navigate only to the existing coach schedule,
  training, and profile root routes. Retain the activity back behavior.
- Keep every action based on actual `CoachWorkbench` capabilities. Do not
  introduce the Figma sample timer, finish-session action, roster count,
  attendance names, course credits, or progress states when the API does not
  supply them.
- Render action cards as neutral, icon-led 100px tiles. The number and labels
  remain real dynamic actions and may wrap; they must not overlap or become
  clipped when a training workbench exposes more than three actions.
- Do not alter API routes, authenticated role checks, action routing, or
  unrelated files.

## Acceptance Criteria

- [ ] A focused regression fails against the old C2 bottom-tab/multi-colour
  action-card structure and passes after the Figma page structure is restored.
- [ ] C2 preserves real workbench states: long titles, cancelled activities,
  training/match action availability, and unsupported Figma sample values are
  still absent.
- [ ] The focused C2 suite, mini-program typecheck, `git diff --check`, and
  root check pass before the batch commit.
- [ ] A current Figma read and runtime-capture boundary are recorded. No
  visual completion is claimed without an authenticated 375x812 capture.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

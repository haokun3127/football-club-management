# Coach C9 team detail data semantics

## Goal

Restore C9 Team Detail against the online Figma node while keeping all
displayed values sourced from existing authenticated BFF responses.

## Requirements

- Design authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:924 / C9 Team Detail`.
- The dark hero must label its second value as cumulative training and use
  the existing `completedTrainingCount` field; it must not mislabel the
  rolling 30-day `trainingCount` as cumulative training.
- The Figma coach-group section stays hidden: the existing `/coach-team`
  content slice is club-scoped rather than the current coach's team-scoped
  roster, so it cannot truthfully populate C9.  Do not hard-code Figma names,
  roles or biographies.
- Preserve the existing coach-team scope, student-radar navigation, empty and
  error states, and global coach training tab bar.
- Do not change API routes, backend contracts, role checks, or unrelated
  user-owned working-tree changes.

## Acceptance Criteria

- [ ] A focused regression is red against the former rolling-30-day label and
  passes when the cumulative field is used.
- [ ] C9 does not embed the Figma coach cards until a team-scoped coach-group
  BFF contract exists.
- [ ] Focused page tests, mini-program typecheck, root check, and
  `git diff --check` pass before commit.
- [ ] The Figma node, data source and runtime screenshot boundary are recorded
  in task documentation.  No visual completion is claimed without an
  authenticated 375x812 capture.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

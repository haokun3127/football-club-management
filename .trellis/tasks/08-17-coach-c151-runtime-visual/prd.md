# Coach C15.1 assessment submit runtime visual verification

## Goal

Runtime Figma verification for coach assessment-submit C15.1 node 93:1163 with real route input and trusted 375x812 evidence.

## Requirements

- Visual authority: Figma `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1163` (C15.1 Assessment Submit).
- Preserve the authenticated coach guard, decoded route title, positive confirmed count, team-ability navigation, and return action.
- Do not display Figma-only claims such as 24-hour sync, fixed processing state, or a fabricated student count.
- At real 375×812, align the 88px soft-pink navigation, success state, summary card, action geometry, and fixed coach tab bar. Native status bar/capsule are system differences.

## Acceptance Criteria

- [ ] Page renders from a real coach session and valid C15-generated title/count route input.
- [ ] A trusted 375×812 DevTools capture is compared with current online Figma and material non-data differences are corrected and recaptured.
- [ ] Targeted test, typecheck, `git diff --check`, and root check pass before a scoped commit.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

# Coach C8 training header safe-area regression

## Goal

Repair the C8 training-management custom header safe-area box model against online Figma node 93:896 without changing real coach-home, team, or training-plan contracts.

## Requirements

- Treat online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:896` (`C8 Training Management`), as the visual authority for the page shell.
- Preserve existing real data and behavior: the page continues to read the current coach-home/team data, uses only real event IDs for navigation, and does not restore removed C10 writes or design-sample training data.
- The custom C8 top navigation receives `navInset` through WXML. Its declared 176rpx visual content height must survive dynamic safe-area padding unchanged.
- Make the smallest scoped source and regression-test change; do not modify unrelated in-progress files.

## Acceptance Criteria

- [x] `c8-nav` uses a safe-area-compatible box model so `navInset` does not reduce the 176rpx Figma content region.
- [x] The targeted C8 regression first fails against the old layout contract and then passes after the minimal correction.
- [x] Existing real data projection, navigation scope, and removed-write boundary remain unchanged.
- [x] Targeted test, mini-program typecheck, `git diff --check`, and repository quality gate pass.
- [x] Progress and task records state Figma/source/test validation only, not a fresh runtime 375×812 pixel acceptance.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

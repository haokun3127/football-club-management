# Coach C16.3 account header geometry

## Goal

Align the C16.3 coach-account top navigation with online Figma node 93:1262 while keeping account data and actions constrained to the real session and coach-home contracts.

## Requirements

- Treat online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1262` (`C16.3 Coach Account`), as the visual authority for the account page shell.
- Preserve existing real data boundaries: the profile remains derived from the signed-in coach session and current coach-home response. Do not manufacture the design sample's name, team, phone, binding/verification state, password, device state, cache state, or editable actions.
- The custom pink top navigation receives `navInset` through WXML. Its declared 176rpx visual content height must survive dynamic safe-area padding unchanged.
- Make the smallest scoped source and regression-test change; do not modify unrelated in-progress files.

## Acceptance Criteria

- [x] `c163-nav` uses a safe-area-compatible box model so `navInset` does not reduce the 176rpx Figma content region.
- [x] The targeted C16.3 regression first fails against the old layout contract and then passes after the minimal correction.
- [x] Existing real profile projection and the read-only account-action boundary are unchanged.
- [x] Targeted test, mini-program typecheck, `git diff --check`, and repository quality gate pass.
- [x] Progress and task records state Figma/source/test validation only, not a fresh runtime 375×812 pixel acceptance.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

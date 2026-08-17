# Coach C16.4 help header geometry

## Goal

Align the C16.4 coach-help top navigation with online Figma node 93:1286 while preserving real help content, local search/filter behavior, and unavailable support configuration boundaries.

## Requirements

- Treat online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1286` (`C16.4 Coach Help`), as the visual authority for the help page shell.
- Preserve existing help-content and interaction boundaries: categories and FAQ items remain projections of the real coach-help response, while local search/filter/open state remains functional. Do not insert the Figma sample categories, questions, support hours, online consultation, official-account action, or contact data when the service does not provide them.
- The custom pink top navigation receives `navInset` through WXML. Its declared 176rpx visual content height must survive dynamic safe-area padding unchanged.
- Make the smallest scoped source and regression-test change; do not modify unrelated in-progress files.

## Acceptance Criteria

- [x] `c164-nav` uses a safe-area-compatible box model so `navInset` does not reduce the 176rpx Figma content region.
- [x] The targeted C16.4 regression first fails against the old layout contract and then passes after the minimal correction.
- [x] Existing real help loading, filtering, FAQ interaction, and unavailable-support boundaries remain unchanged.
- [x] Targeted test, mini-program typecheck, `git diff --check`, and repository quality gate pass.
- [x] Progress and task records state Figma/source/test validation only, not a fresh runtime 375×812 pixel acceptance.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

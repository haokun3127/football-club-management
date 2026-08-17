# Coach C16.2 private interest header geometry

## Goal

Align the C16.2 private-interest custom top navigation with online Figma node 93:1238 while preserving the real capability-only private_lessons contract and avoiding unimplemented acceptance or availability data.

## Requirements

- Treat online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1238` (`C16.2 Private Interest`), as the visual authority for the C16.2 page shell.
- Preserve the existing data contract: `session.capabilities.features.private_lessons` is the only available private-lesson input. Do not add a local toggle, sample weekdays, sample time slots, pricing, storage, or an API request for unavailable coach acceptance/availability data.
- The custom pink top navigation receives `navInset` through WXML. Its declared 176rpx visual content height must remain intact after that dynamic safe-area padding is applied.
- Make the smallest scoped source and regression-test change. Do not change unrelated uncommitted files.

## Acceptance Criteria

- [x] `c162-nav` uses a safe-area-compatible box model so `navInset` does not reduce the 176rpx Figma content region.
- [x] The targeted C16.2 test first demonstrates the old layout contract is wrong, then passes with the corrected contract.
- [x] Existing enabled, disabled, and pending `private_lessons` capability states remain honest and no unsupported scheduling/acceptance data is introduced.
- [x] Targeted test, mini-program typecheck, `git diff --check`, and the repository quality gate pass.
- [x] Progress and task records describe the result as Figma/source/test validation, not a new runtime 375×812 pixel acceptance.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

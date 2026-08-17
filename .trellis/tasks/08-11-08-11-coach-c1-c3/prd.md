# Coach C1-C3 Figma Restoration

## Goal

Bring the coach schedule, training workbench, and event-change pages into alignment with online Figma nodes `93:578`, `93:606`, and `93:634`.

## Requirements

- Use the existing coach data and event IDs; do not alter API responses or insert fixture UI content.
- Preserve the date/week navigation behavior and coach workbench actions.
- Restore the Figma hierarchy, top navigation clearance, dark summary card, attendance/progress presentation, action-card grid, form card geometry, and bottom tab bar.
- Keep all changes limited to C1-C3 page files or a justified shared coach primitive.

## Acceptance Criteria

- [x] C1, C2 and C3 have online-Figma/source/test validation against nodes `93:578`, `93:606` and `93:634`; the user explicitly waived a new runtime screenshot as a completion prerequisite for this goal.
- [x] C1's safe-area top navigation preserves its 176rpx design content height after `navInset` is applied.
- [x] Focused tests, mini-program type/test checks, and `git diff --check` pass.
- [x] The batch is reviewed and committed without including unrelated dirty files.

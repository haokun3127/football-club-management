# Fix training history view navigation

## Goal

Make the Parent Growth page's "训练历程 📊" "查看›" action open the existing lesson-and-safety detail page for the active student.

## Requirements

- Reuse the existing registered route `/pages/parent/status/index`; do not create a training-history route or change the destination page.
- Bind only the Growth page's "训练历程 📊" "查看›" action to `openTrainingHistory`.
- `openTrainingHistory` must navigate through `openPage` to `/pages/parent/status/index?student=<activeStudentId>`.
- If `activeStudentId` is empty, the handler must not navigate.
- Do not change visual styling, API contracts, persistence, project configuration, assets, or unrelated dirty files.

## Acceptance Criteria

- [x] The training-history "查看›" node has `bindtap="openTrainingHistory"`.
- [x] A non-empty active student ID opens `/pages/parent/status/index?student=<activeStudentId>` through `openPage`.
- [x] An empty active student ID does not navigate.
- [x] Growth-page tests, mini-program package tests, mini-program typecheck, and `git diff --check` have been run and their results are recorded accurately.

## Notes

- This is a lightweight, PRD-only navigation task.

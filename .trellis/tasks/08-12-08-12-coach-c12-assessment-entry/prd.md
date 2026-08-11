# C12 Coach Assessment Entry Figma Restoration

## Goal

Restore the coach assessment-entry page against online Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1030 / C12 Project Score Entry`, while retaining the existing real assessment form, per-student write contract, and device-local draft recovery.

## Requirements

- Use the current Figma structure: 88px soft header, 96px dark task summary, compact per-student white cards with a maximum of four visible field cells, a fixed summary/submit area, and the existing coach tab bar.
- Obtain event, roster, template and fields only from the existing workbench/form requests. Never insert Figma sample names, results, deadlines, total scores, or field labels.
- For a form with more than four fields, use the existing actual group/field navigation to choose the visible field window. Each visible cell must be a real field and bind to the existing local draft keyed by student and test item.
- Retain all current role guards, validation, partial-submit behavior, exact existing `submitCoachAssessment` calls, local draft resume/exit state, and no-JS-method WXML rule.
- Do not add an API endpoint, seed an assessment result, change persistence, or touch unrelated user files.

## Acceptance Criteria

- [ ] Every rendered student, field, input value, missing state, progress count and write uses real workbench/form/draft data.
- [ ] The initial content viewport has C12 header, summary, compact student-card and fixed submit geometry; field data is compact and not clipped at 375px logical width.
- [ ] More than four real fields remain reachable without misrepresenting unshown fields as submitted or absent.
- [ ] Existing local-draft and partial-write guarantees continue to pass, with focused tests for the four-column projection and real-field binding.
- [ ] Focused test suite, mini-program typecheck, full repository check, and `git diff --check` pass before commit.
- [ ] This task reports Figma-read/static validation separately from any unavailable runtime screenshot comparison.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

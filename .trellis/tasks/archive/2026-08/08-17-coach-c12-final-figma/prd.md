# Coach C12/C12.1 final Figma correction

## Goal

Finish the C12 project-score entry and C12.1 local-autosave presentation alignment against the current online Figma while preserving all existing score-entry, validation, partial-submit, and local-draft contracts.

## Confirmed facts

- C12 is `pages/coach/test-entry`, not `pages/coach/assessment-entry` (the latter is C15). The route is registered in `app.json` and opened from coach event/schedule assessment actions.
- Online visual authority is Figma file `zZ6wKyOHKcO4UYXDd9jGwv`: C12 node `93:1030` and C12.1 node `93:1061`. The corresponding checked-in references are `c12-project-score-entry.png` and `c12-1-autosave-state.png`.
- C12 already uses real `getCoachWorkbench(eventId)` and `getAssessmentForm(templateId)` data, device-local `assessment-draft` entries, and existing per-student `submitCoachAssessment` calls. The compact card's real-field projection and C12.1 draft-resume guard are covered by its focused test.
- The current custom nav has `box-sizing: border-box`, which consumes part of the intended 88px content area when the runtime status inset is applied. Its C12 body and fixed submit bar use 16px horizontal gutters while the Figma cards use 22px gutters.
- C12.1's online Figma overlay uses the copy “成绩录入”; normal C12 uses “项目评分录入”. This is a page-state presentation label, not an assessment-data value.

## Requirements

1. The C12 navigation shall use the shared custom-nav form: 88px content-box height plus the dynamic status inset, left 22px Figma gutter, and existing menu-capsule clearance for the submission action.
2. The C12 body task card and the fixed submit composition shall align to the Figma 22px horizontal gutter without changing their real-data content or actions.
3. When the existing, valid local draft-resume overlay is visible, its underlying nav title shall match C12.1 “成绩录入”; continuing the existing draft shall restore the normal C12 “项目评分录入” title.
4. C12 must continue to retain all real score field/roster values, >4-field navigation, input-to-real-`testItemId` binding, local draft preservation, validation, partial-write behavior, and WXML precomputed-view-model restrictions.

## Acceptance Criteria

- [x] Focused tests first fail for nav box-model/gutter source constraints and the C12.1 title-state transition, then pass with no data-contract changes.
- [x] C12 header/body/fixed action follow the two online Figma references at the stated measurements while retaining the existing task header, real student field projection, submit action, and coach tab bar.
- [x] C12.1 remains device-local draft recovery; it never claims server autosave or adds an API call.
- [x] Focused test, mini-program typecheck, `git diff --check`, and repository gate pass before commit.
- [x] Runtime screenshot availability is recorded distinctly from static/test evidence.

## Out of scope

- API, assessment template schema, data seed, server persistence, real-score submission behaviour, and role/auth changes.
- Invented Figma names, deadlines, team names, numeric scores, or total scores.
- Changes to the unrelated uncommitted paths identified by the current handoff.

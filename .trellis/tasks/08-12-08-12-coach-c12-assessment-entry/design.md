# C12 Technical Design

## Authority and data flow

The sole visual authority is Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1030 / C12 Project Score Entry`, read on 2026-08-12. The page continues to load `getCoachWorkbench(eventId)` followed by `getAssessmentForm(workbench.assessmentTemplateId)`. No server contract changes.

`test-entry/index.ts` owns a view model that projects the selected real-field window into each roster row. A row contains a precomputed `metricCells` array of at most four items, each with the real field/test-item IDs, label, input constraints, draft value, missing state and display class. WXML only iterates and binds this view model; it does not calculate columns or call methods.

The selected field window is still chosen through the existing actual group/field state, so large forms remain fully reachable. The window is a presentation projection, not a claim that only four fields exist. Existing individual submission remains the write boundary and continues to clear only server-confirmed students' local-draft entries.

## Truthful visual states

- Blank value cells show a neutral input affordance, not the Figma sample numeric result.
- Any shown field label is copied from the returned template; a missing or unavailable score stays visibly unrecorded.
- Summary completion/remaining labels derive from the page's draft progress and current reachable roster/field set; no Figma sample totals are used.
- The C12.1 modal remains explicitly device-local draft recovery. It does not become server autosave.

## Risks and rollback

The highest risk is losing an existing field through a compact projection. Tests must exercise a form with more than four fields and cross-group navigation before and after editing. Rollback is limited to C12 page, test and task files; no persisted record or API shape changes occur.

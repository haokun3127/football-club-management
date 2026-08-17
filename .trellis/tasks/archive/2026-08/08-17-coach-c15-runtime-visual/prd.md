# Coach C15 assessment entry runtime visual verification

## Goal

Restore the coach assessment-entry page to the online C15 design while retaining the existing real assessment-form, team, draft, and submission contracts.

## Requirements

- Design authority: Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1132` (C15 Assessment Entry).
- The page must use real `getAssessmentForm`, `getCoachTeam`, and `submitCoachAssessment` results. Figma sample names, scores, and team labels are visual reference only.
- Preserve local, versioned assessment drafts and the existing partial-submit behavior.
- At a 375×812 runtime viewport, align the top navigation, group chips, student cards, numeric sliders, in-flow save action, and coach tab order with C15. Native WeChat capsule is excluded from visual comparison.
- Follow repository WXML and styling constraints; do not introduce raw API errors or fabricated client data.

## Acceptance Criteria

- [x] C15 is loaded with a real coach session and a real template id, and renders only real form/team data.
- [x] A trusted 375×812 simulator capture is compared against current Figma node `93:1132`; material implementation discrepancies were corrected and recaptured.
- [x] Group selection, slider draft persistence, and submit paths retain their existing tests and behavior.
- [x] Targeted tests, miniprogram typecheck, `git diff --check`, and repository `run check` pass before commit.

## Out of scope

- C15.1 submit-success page and C16-series pages are separate verification batches.
- Changing assessment API/data contracts is out of scope unless runtime evidence proves an existing contract defect.

# C15 Coach Assessment Entry Figma Alignment

## Goal

Align the coach assessment-entry page with the current online design source
`zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15 Assessment Entry` while retaining
the existing authenticated assessment form, coach-team, and assessment-write
contracts.

## Requirements

- The entry route accepts only the existing `templateId` and `title` query
  values. It must not invent an event relationship or submit `eventId`.
- A non-coach or a missing template id sends no form, team, or write request.
- Load the real assessment form and coach team concurrently. Stale successes
  and failures cannot replace the most recent page state.
- Render only real team members and form fields, grouped by `groupId` with
  `groupLabel` used only for display. Never use Figma sample names, teams,
  categories, scores, or ages.
- A field is writable only when its real `testItemId` is present. Never
  substitute a field id as a test item id.
- Submit only the existing app-client assessment body: `studentId`,
  `templateId`, `templateVersionId`, `assessedAt`, `summary`, and `rawResults`
  with real test item ids. The client must not send `assessedByCoachId`; the
  BFF derives it from the authenticated coach.
- `submitCoachAssessment` requires HTTP `201`. Other `2xx`, HTTP failures,
  and request failures are unconfirmed and the page displays only safe local
  error copy.
- Existing callers without `expectedStatus` retain the request layer's normal
  `2xx` success behavior.
- Keep a page-local draft scoped by `templateId` and `templateVersionId`.
  Restore only values in the current team/form intersection. The draft
  signature is local validation only and makes no server idempotency claim.
- Submission is single-flight and sequential by student. Clear a student's
  local draft only after its confirmed `201`; retain failed or unknown rows and
  do not navigate. Navigate once to the existing C15.1 route only when every
  selected student receives `201`, using the real selected count.
- Keep WXML free of JavaScript method calls. Raw API errors, server messages,
  and fabricated assessment facts must not be rendered.

## Constraints

- Allowed production and test paths are the C15 page, `utils/request.*`,
  `utils/api.*`, an optional direct C15 Figma icon, this task directory, and
  the parent task child reference created by Trellis.
- Do not modify API routes, persistence, shared components, app configuration,
  C15.1, or unrelated working-tree changes.
- This batch has no device or screenshot acceptance claim.

## Acceptance Criteria

- [ ] Focused RED tests fail before the implementation for `expectedStatus`,
  safe C15 request payloads, stale loading, draft validation, and submit
  outcomes.
- [ ] `RequestOptions.expectedStatus` accepts exactly the requested status
  while existing callers still accept normal `2xx` responses by default.
- [ ] C15 renders and submits only authenticated, real form/team data and
  never sends a coach id or invented event id.
- [ ] Confirmed `201` rows are cleared individually; partial or unknown
  results preserve their drafts and remain on C15.
- [ ] Focused tests, mini-program package test and typecheck, task validation,
  and `git diff --check` pass, subject to clearly reported pre-existing test
  failures.

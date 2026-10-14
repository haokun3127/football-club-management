# Team Student Evaluations

## 1. Scope / Trigger
REQ-EVA-001 / ACC-13; user closed O-08 on 2026-10-05: one current evaluation per club/team/student, not one shared across teams. Communication content never contributes to scores or financial ledgers.

## 2. Signatures
- GET `/clubs/:clubId/app-clients/:clientId/students/:studentId/evaluations`: `{ studentId, studentName, phrases, teams: [{ id, name, canEdit, evaluation }] }`.
- PUT `.../evaluations/:teamId`: `{ expectedRevision, phraseIds, note }` → `{ evaluation }` (null for untouched empty state).
- Migration `0027_student_evaluations.sql`: composite natural key, positive revision, serialized snapshots; composite foreign keys enforce same-club team/student identity.
- `StudentEvaluationRepository.list/get/compareAndSave`; SQLite updates current+history in one statement, never memory-first.

## 3. Contracts
Active authenticated coach role plus active coach, active team membership for the child and `coachTeamRole` authorization. Parent reads require guardian binding; parent cannot write even if also a coach/admin. Parent can read historical team evaluations after the child leaves. Author ID/name and time come from server. Responses omit actor user IDs. Current options retain the three approved built-ins and active club-scoped backoffice evaluation-phrases (`configured:<record-id>`). The native editor uses the active catalog plus only the selected team's retired current phrases; another team cannot newly select retired wording. Saves recheck the current catalog, preserve wording snapshots, and allow a retired choice only when retained in this evaluation. Removing it prevents subsequent reselection. Snapshots preserve historical wording. Emptying an existing evaluation preserves history; unchanged content does not add a revision. Legacy per-course comments remain untouched and are not silently promoted.
Parent growth summary returns evaluation snapshots and an `evaluation` timeline kind with teamId/evaluationRevision; it must not be labeled an ability-score update. Mini-program uses environment-aware request transport and displays a save only after matching student/team/revision/content. Unknown result/conflict retains input and requires explicit reread. Loading/unloading invalidates pending callbacks.

## 4. Validation & Error Matrix
Unauthenticated/pending role: 401/403 from auth boundary. Foreign guardian/team, revoked assignment, parent write: 403. Unknown/duplicate phrases, >500-character note, extra actor fields: 400. Stale version: 409 evaluation_conflict. Database failure: 500 generic evaluation_save_failed, no SQL leak. No change: 200 unchanged revision.

## 5. Good / Base / Bad Cases
Good: authorized collaborator changes team A; parent reads A's new snapshot, team B stays untouched. Base: unchanged save returns the original snapshot. Bad: infer an evaluation from an assessment score, reuse another team's revision, or drop an old snapshot while clearing text.

## 6. Tests Required
`student-evaluations.test.ts`: BFF role/guardian/team scope, concurrent revision, unknown phrase, actor spoof, team isolation, revocation, no score/ledger changes, OpenAPI, file restart and SQL failure. `student-evaluation-client-integration.test.ts`: actual mini page controller + request transport + environment guard + authenticated BFF + SQLite + parent readback (only wx transport replaced with loopback HTTP transport). Mini controller tests cover mismatch/unload/failure input retention/readonly parent/history delta. Native Automator covers C12/C13/parent rendering with synthetic fixtures, separately from integration proof.

## 7. Wrong vs Correct
Wrong: trust a query parameter to make the parent an editor, or show success just because PUT returned 200. Correct: server authorizes active role/team each request; client matches returned student/team/version/content and keeps uncertain input until reread.

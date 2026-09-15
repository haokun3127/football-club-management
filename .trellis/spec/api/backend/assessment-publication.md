# Project Drafts and Explicit Assessment Publication

## 1. Scope / Trigger

Use this contract for the existing CQ Talent standard-score assessment workflow. It supersedes legacy completed-task immutability and arithmetic-average badge rules only where the task response includes `workflow`. Age conversion tables and classroom/match score fusion are out of scope.

## 2. Signatures

Base: `/clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks/{taskId}`.

- `GET /workflow`: roster completion, pinned template version, editability, per-student revision/publication state.
- `PUT /students/{studentId}/entries`: `{ expectedRevision, entries: [{ testItemId, metricId?, value }], reason? }`.
- `POST /publications`: `{ students: [{ studentId, expectedRevision }] }`; returns per-student `results` with `success`, publication metadata or an error.
- `GET /students/{studentId}/history`: changes and publication links with revision, actor and time.
- Existing `GET /projects/{projectId}/entries` adds `studentStates` and returns current working values for managed tasks.
- Form reads accept `templateVersionId`; explicitly pinned archived versions remain readable and usable. Draft versions are not selectable.
- Migration `0020_assessment_workflow.sql`: task/version pins and per-student JSON working states. Existing assessment/raw-score/metric/lineage tables retain published facts.

## 3. Contracts

- `FCM_ASSESSMENT_PUBLICATION_CLUBS` is a comma-separated club allowlist, empty by default. Disabling it leaves adopted tasks readable but forbids edits and publication. Legacy assessment POST routes cannot bypass this guard.
- Current active team membership determines roster and access; recent calendar events do not determine task completion or radar access.
- Task dates use Asia/Shanghai, inclusive of startsOn and dueOn. After publication, actual changes require a non-empty reason. The previous publication remains visible until explicit republication.
- Input values match configured standard score kinds. Zero is valid; missing is absent. No raw-to-age-standard conversion is invented.
- Drafts never create metric facts. Publication requires all configured inputs, runs the existing full graph once, and saves the publication pointer inside the assessment transaction.
- Revision conflicts reject stale edits. Identical saves are no-ops. Publishing an already-published revision returns its previous identity. A batch failure does not undo another student's successful publication.
- SQLite async transactions use `persistence/transaction.ts`, queued by database connection, shared by match and assessment repositories.
- Task creation validates the version before saving; first adoption of old tasks uses their single historical version. Mixed/missing historical versions require a new task.
- Mini-program local edits are scoped by club, coach, task, template version and project, and retain their original student revisions on restoration. Server conflicts keep those edits until the coach explicitly discards/reloads them. Read-only pages show server data.
- Computed score maxima follow formula and dependency weights. The current total maximum is 90. Shared `overallScore` converts the sum to percentage and rounds once; raw standard scores remain percentages. Unknown measurement maxima are not guessed.
- Coach and parent aggregate responses supply `overall`; radar labels come from actual metric definitions. Parent history groups each publication into one core-dimension update.

## 4. Validation & Error Matrix

| Condition | Result |
|---|---|
| Wrong role, client role, team or student | 403/404 before working data is returned |
| Flag off, outside task window | 409, data remains readable |
| Stale revision | 409 `assessment_revision_conflict` |
| Wrong project/kind/range/duplicate input | 400 |
| Change to published state without reason | 400 `correction_reason_required` |
| Missing required inputs at publication | 409 `assessment_incomplete` in that student's result |
| Ambiguous legacy template versions | 409 `assessment_legacy_versions` |
| Publication pointer write fails | Roll back assessment, metrics and lineage; retry remains possible |
| Unknown score measurement maximum | Null aggregate / non-renderable dimension, not a made-up percentage |

## 5. Good / Base / Bad Cases

- Good: save one project, resume another, complete 62 inputs, publish ready students, correct with a reason, republish. Earlier publications remain in history.
- Base: partial save failure retains failed rows locally; a lost publication response is safe to retry.
- Bad: project save invokes full legacy assessment POST; changing a draft updates parent metrics; completion counts any assessment; a 10/10 computed score renders as 10/100.

## 6. Tests Required

- `assessment-workflow.test.ts`: incremental/full equivalence (99 records), scopes, cutoff, disabled mode, stale/no-op edits, partial batch, retry, correction isolation, rollback, archived pinned version and cross-interface scale agreement.
- `assessment-workflow-repository.test.ts`: reopen persisted draft/publication/correction state and facts; replay after restart; shared transaction queue recovery.
- `score-display.test.ts`: explicit measurement maxima, graph edge weight precedence and one-time aggregate rounding.
- Mini-program bulk/project controller tests: zero/range checks, pinned form, retained conflict revisions, reason requirement, disabled mode, confirmation cancellation and partial result reporting.
- Mini-program API normalization test: measurement maximum versus legacy standard score, unknown maximum and server aggregate.
- Root typecheck, API suite, domain suite and mini-program suite. WeChat runtime validation remains a separate acceptance step; controller tests do not replace it.

## 7. Wrong vs Correct

```ts
// Wrong: a project save immediately changes published facts.
await submitCoachAssessment({ rawResults: currentProjectEntries });

// Correct: persist only this project, then publish a complete expected revision.
await saveCoachAssessmentEntries(taskId, studentId, { expectedRevision, entries });
await publishCoachAssessments(taskId, [{ studentId, expectedRevision: savedRevision }]);
```

```ts
// Wrong: computed score measurement implicitly has a maximum of 100.
const percentage = record.value.value;

// Correct: use the shared catalog/formula-derived scale.
const percentage = scorePercent(record.value, metric);
```

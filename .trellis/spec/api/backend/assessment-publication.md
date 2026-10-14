# Project Drafts and Explicit Assessment Publication

## 1. Scope / Trigger

Use this contract for the existing CQ Talent standard-score assessment workflow. It supersedes legacy completed-task immutability and arithmetic-average badge rules only where the task response includes `workflow`. Age conversion tables and classroom/match score fusion are out of scope.

## 2. Signatures

Base: `/clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks/{taskId}`.

- `GET /workflow`: roster completion, pinned template version, editability, per-student revision/publication state.
- `PUT /students/{studentId}/entries`: `{ expectedRevision, entries: [{ testItemId, metricId?, value, eventId? }], reason? }`.
- `POST /publications`: `{ students: [{ studentId, expectedRevision }] }`; returns per-student `results` with `success`, publication metadata or an error.
- `GET /students/{studentId}/history`: changes and publication links with revision, actor and time.
- Existing `GET /projects/{projectId}/entries` adds `studentStates` and returns current working values for managed tasks.
- Form reads accept `templateVersionId`; explicitly pinned archived versions remain readable and usable. Draft versions are not selectable.
- Migration `0020_assessment_workflow.sql`: task/version pins and per-student JSON working states. Existing assessment/raw-score/metric/lineage tables retain published facts.

## 3. Contracts

- `FCM_ASSESSMENT_PUBLICATION_CLUBS` is a comma-separated club allowlist, empty by default. Disabling it leaves adopted tasks readable but forbids edits and publication. Legacy assessment POST routes cannot bypass this guard.
- New task selections use the active authorized team roster. A stored `studentIds` selection is fixed and does not shrink after attendance or team membership changes. Legacy tasks without a selection still derive the active roster. Default head coach or an explicit team-scoped coach assignment grants collaboration; course planning remains restricted to head coaches.
- Task dates use Asia/Shanghai, inclusive of startsOn and dueOn, to validate the selected course. Late entry after dueOn is allowed. New entries require a real authorized, non-cancelled training course within the period and a participating student. Course choices exclude absent/leave/excused participation and future courses. Course-only changes are revisions, too. After publication, actual changes require a non-empty reason. The previous publication remains visible until explicit republication.
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
| Flag off or task not started | 409, data remains readable |
| Missing course or inaccessible / cancelled / outside-period course | 400; no working revision is written |
| Course rescheduled since entry | 409 on publication; explicitly review and save the new association |
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

## 2026-09-28 Course provenance and review

- `GET .../assessment-tasks/:taskId/courses` returns authorized eligible courses with participant IDs. Project-entry reads add `entrySourcesByStudent` for each test item.
- Migration `0022_assessment_course_provenance.sql` adds nullable event/occurred/recorded columns to raw results. Historical rows are not assigned invented courses. Each metric fact retains its own selected course and occurrence time; the working-state change time is distinct from publication time. The assessment envelope uses the latest contributing course time; publication time remains explicit in workflow publications.
- Source date changes are never silently accepted at publication. A coach reviews and re-saves; the course-only change increments revision and records previous/new course and timestamp.
- The mini-program project page opens per-student review, showing each raw value/unit and course/recorded date. Missing is not zero. Confirmation sends the revision actually shown, never a freshly fetched revision after the coach has reviewed older values. Conflict/error retains the reviewed values.
- Bulk entry supports a course choice for eligible students plus per-student/per-field exceptions. Choices are stored with revisioned local drafts and remain scoped to account/club/task/version/project. A selection-only correction sends the unchanged score with its new course.
- Test evidence includes API course-only correction, two course dates in one publication, persisted raw provenance, missing-course rejection and late entry; mini-program tests cover course selection, retained drafts, zero/missing, per-student confirmation, cancellation and conflict.

## 2026-10-04 Task objects and attendance

1. **Scope:** C15 / REQ-ASM-003 / DEC-12. Task membership and eligibility to enter a score against a course are separate contracts.
2. **Signatures:** `GET .../coach/assessment-tasks?sourceEventId=...` returns `sourceCourse.studentIds`, optional `attendance: [{studentId,status}]`, and course `startsAt`/`endsAt`; `POST .../coach/assessment-tasks` accepts optional `studentIds` and `sourceEventId`.
3. **Contract:** source-course choices intersect the active authorized team roster with the course participant list, regardless of `absent`, `leave_requested` or `excused`. Attendance projection includes only those authorized students and never participant notes. POST uses the same scope; omission selects that entire scope. Attendance does not mark these objects completed. Subsequent writes still use the selected actual-course participation check. C15 retains one `Idempotency-Key` per unchanged creation payload across uncertain-response retries, using the existing HTTP replay contract (30-minute TTL); editing the payload creates another key. A valid 201 response with task ID is required before success/navigation. This does not establish atomic concurrent-create or indefinite/offline replay guarantees.
4. **Errors:** inactive/out-of-scope student selection -> 400 `invalid_task_students`; wrong role -> 403; entry against an absent/leave/excused course -> 400 `invalid_assessment_course`, no working revision saved.
5. **Cases:** good: retain a missing student until valid entry or explicit handling; base: default and explicit selections contain the same eligible absent student; bad: silently drop absentees to make completion appear higher.
6. **Tests:** `assessment-workflow.test.ts` parameterizes all three attendance statuses, verifies options, explicit/default creation, unchanged working data on invalid entry, unfinished progress and stable roster after membership changes. It also verifies inactive roster exclusion and wrong-role rejection. Legacy September fixture tests in `server.test.ts` pin only `Date` and restore timers; wall-clock passage must not change their success expectations.
7. **Wrong vs correct:** wrong: reuse `workflow.courses(...).studentIds` as C15 task objects. Correct: derive task objects from authorized roster/course membership, and call the stricter course validation only for actual score provenance.

- Course eligibility uses the shared effective training fact when present (including a coach/parent correction), with participant status used only before a fact exists. A corrected attendee can be selected despite an old leave status; a corrected absence cannot. This does not change the fixed assessment task roster or erase existing working revisions.

## Explicit raw-to-integer and grade mapping extension
Migration 0033 stores scoped versioned mapping definitions; 0034 preserves project metadata; 0035 pins both mapping versions on input bindings and preserves the mapped result on the published raw fact. Unmapped legacy tasks retain standard-score behavior. For mapped bindings, workflow entries use the project's typed original value and unit; strict shared metric-value schemas allow the numeric variants. `mapAssessmentValue` validates the original type/range and pinned active/archived formal definitions. Publication retains raw precision, integer score, grade, both version IDs and mapping time. Client normalized scores cannot override those rules, and direct score inputs cannot bypass mapped raw projects. Graph inputs use integer score measurements; raw facts remain untouched.
Mapping draft editing/trials do not publish player facts. Publication of a mapping configuration requires valid complete intervals and an explicit formal reference; no production demo thresholds are seeded. Active/archived definitions require copying for content changes; deactivation preserves pinned historical use. Project and metric content become protected after references exist, with status changes still available. API constructor and postcommit refresh load persisted catalogs, not only seed definitions.
Tests: domain score-mapping and assessment-mappings suites; management API grant/immutable version/trial/fact-isolation tests; canonical workflow raw precision/grade/lineage and SQLite reopen. The browser model/template and task adapter remain required before declaring the entire configuration flow complete.

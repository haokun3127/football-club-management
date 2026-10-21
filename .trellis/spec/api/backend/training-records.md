# Training Records and Corrections

## 1. Scope / Trigger
Training participation facts shown by parent and coach clients. They are independent of lesson-credit finance and require active authenticated app roles.

## 2. Signatures
- `GET /clubs/:clubId/app-clients/:clientId/students/:studentId/training-records` returns `{ studentId, total, records }`.
- `PATCH .../training-records/:eventId` requires `{ expectedRevision, counted, reason }`; returns `{ record }`. Authorized coaches/admins may initialize an explicit correction before course end with revision 0; parents can only correct an existing fact.
- `POST .../training-records/:eventId/leave` accepts `{ action: "request" | "revoke", expectedRevision, reason? }`.
- Migration `0021_training_records.sql`: composite club/event/student identity, positive revision, JSON history, participant foreign key.
- Repository `get` / `compareAndSave` implement atomic revision comparison in memory and SQLite.

## 3. Contracts
Runtime startup catches up missed records and runs a non-overlapping reconciliation every 60 seconds, with a retry on error and shutdown cleanup. The runtime entrypoint runs the sweep through the shared SQLite transaction queue. Read-time reconciliation remains an idempotent fallback. Cutoff is the event end instant (`now >= endsAt`), following the confirmed 2026-09-22 C03-01 clarification. This supersedes the earlier unapproved next-business-day assumption; compare timestamps, not server calendar dates. Matches are excluded. Cancelled, leave_requested, excused and absent participation does not count. A manual correction wins over later automatic reconciliation. Each change appends a history entry; actor comes from authentication, never request input. Parent access requires guardian binding; coach access requires an authorized event. Parent and coach show the same stored fact. Attendance writes no longer debit the financial ledger. Legacy app-client lesson-confirmation GET/POST/PATCH returns 410 after access checks.

## 4. Validation & Error Matrix
| Condition | Result |
| --- | --- |
| Missing or pending active-role session | 401 |
| Foreign guardian or inaccessible coach event | 403 |
| Parent correction before event end without an existing fact | 409 training_record_not_ready |
| Stale expectedRevision | 409 training_record_conflict, current record returned |
| Missing reason, extra actor field, invalid revision | 400 |
| Successful correction | Revision increases once, reason and actor retained |

## 5. Good / Base / Bad Cases
Good: guardian corrects a missed absence; authorized coach sees the updated fact and history. Base: repeated GET produces no extra revision. Bad: attendance confirmation debits a lesson-credit account, or retry overwrites another editor's correction without checking revision.

## 6. Tests Required
`training-records.test.ts` covers end-instant cutoff, exclusions, manual precedence, scope, SQLite reopen and unchanged financial ledger. `training-record-routes.test.ts` covers shared reads, role/guardian boundaries, strict request payload, 409 and OpenAPI. Mini-program parent/coach record tests preserve input on network failure or conflict and require explicit latest-record refresh before retry.

## 7. Wrong vs Correct
Wrong: use a financial ledger balance as training count, or send a client-selected actor ID. Correct: derive count from training records, pass `expectedRevision`, and resolve actor on the server. The UI must link the record screen from the event workbench, including a cancelled training event for historical inspection.

Cancellation supersedes a previous counted correction: reconcile a cancelled course to not-counted and append history, preserving the original human change. The correction endpoint rejects setting counted=true on a cancelled event. Verify the independent financial ledger remains unchanged.

## 2026-10-04 C03/C07/C08 integration
- Workbench GET includes `trainingRecords` for the authorized event only. C03 quick toggles and C07/C08 use the same per-student PATCH and revision; never replace the entire roster for a training correction. Missing workbench records capability fails closed, not a fallback to legacy attendance.
- Server resolves actor ID and display name; new history includes `previousCounted` (null on initialization). Existing histories can infer preceding state from the previous entry. Clients cannot submit actor metadata.
- Manual facts created before end are readable immediately and survive scheduled reconciliation. Cancellation overrides them immediately even before end; cancelled courses reject counted=true.
- C03 reflects a change only after a matching student/event/revision/count response. Unknown outcomes and conflicts require fresh read and explicit retry; unloading invalidates pending view updates.
- C07 reads the whole authorized roster once, includes members without generated records, filters locally, and performs no mandatory whole-class confirmation. C08 retains edits after failure and compares the latest revision before saving.
- Acceptance-demo rollback must delete only its fixed club/event training-record dependencies before participants, within the existing transaction. This code is exercised only with synthetic test databases here; it is not permission to run rollback against a server.

## Parent growth consistency (2026-10-05)
Parent growth total/monthly training counts use the same reconciled `trainingRecords` as the correction screen and coach profile. Expected/attended/rate denominator remains ended non-cancelled courses; counted future manual facts appear in total/monthly history with their actual event date. Timeline includes formed training facts even if the event status has not been manually marked completed. Its subtitle distinguishes counted/not-counted and planned content; planned drills are not proof of completed drills. Regression: `training-record-routes.test.ts` corrects a fact, compares parent growth total to record count and checks the same event's non-counted timeline wording.

## Leave withdrawal audit contract (2026-10-21)
1. **Scope:** request/withdrawal must preserve REQ-ATT-002 history, including before the course ends.
2. **Signatures:** existing leave POST; optional history `action: "leave" | "leave_revoke"`; no database schema migration (history JSON).
3. **Contracts:** withdrawal appends a revision, never deletes the fact. Before end restore the state preceding consecutive marked leave entries, or automatic/not-counted pending reconciliation. After end append a counted correction. Participant and record views refresh together; UI says “请假已撤回”, not an unconditional counted success.
4. **Errors:** stale expectedRevision → 409 including when current record already counts; forbidden object → existing 403; cancelled training → existing conflict. Previous unmarked legacy histories lack an unambiguous action: do not rewrite historical records by guessing from custom reason text; review them explicitly before rollout.
5. **Cases:** base leave→withdraw→course end produces revisions 1→2→3; good prior manual correction survives leave/withdraw; bad delete→revision0 allows stale editors and loses the audit trail.
6. **Tests:** `training-leave-history.test.ts`, `training-records.test.ts` SQLite reopen/stale revision/ledger isolation, route leave tests and parent event pending label.
7. **Wrong / correct:** `repository.remove(scope)` is wrong; compare-and-save the restored fact with the previous history plus one withdrawal entry is correct.

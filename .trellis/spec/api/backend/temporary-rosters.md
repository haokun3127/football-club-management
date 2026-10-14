# Temporary Event Rosters

## 1. Scope / Trigger
SC01 confirmed direct-operation rule: event-authorized head/assistant/collaborating coaches maintain a single activity roster without another approval. Formal enrollment and existing assessment-task scope editing remain separate increments.

## 2. Signatures
GET/POST `/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/temporary-roster`.
POST `{expectedRevision,action:add|remove,players:[{studentId,participated?}],note?}`. Response includes event summary, hashed roster revision, active participant IDs and temporary change histories. Migration 0029 retains metadata alongside existing participants.

## 3. Contracts
Require active Bearer coach session and current event ownership/team authorization; check again inside the shared SQLite transaction. Hash covers event, participant state and temporary histories. A save must use the latest hash. Participant natural identity remains stable on removal/readdition; inactive temporary rows are filtered from roster/calendar/match projections, not erased.

Late additions explicitly choose participated true/false with no default; training fact correction and roster change commit atomically. Automatic reconciliation must preserve that correction. Future match additions create a non-starting roster candidate with no minutes/events. No formal team, guardian, credit-ledger or identity changes result from roster membership.

Remove only future temporary participants without business facts. Training/measurement/raw-result/match facts and explicitly fixed assessment scopes block removal; preserve history and use fact correction. Repeated current-version no-ops append no duplicate history. Record server-resolved actor, time, action, revision, participation choice and optional note; response omits internal actor user IDs. New course-based assessment tasks may explicitly select temporary students; omitted selection defaults to formal students only. Existing task scopes never change automatically.

## 4. Validation & Error Matrix
Missing/wrong session: existing 401/403. Wrong event scope or cancelled event: denial. Missing late participation: 400. Stale revision or fact-bearing removal: 409. SQL failure rolls back participant, training fact and temporary metadata together; no success toast or memory projection before verified response.

## 5. Good / Base / Bad Cases
Good: add one selected scout to this event, then independently select them for a new task. Base: creation succeeded but roster request failed; preserve the identity and refresh roster rather than recreating the person. Bad: default late attendance to present, silently include all scouts in measurements, delete history or treat roster membership as actual attendance.

## 6. Required Tests
`temporary-rosters.test.ts`: revision/no-op/removal/readdition, transactional failure, explicit late attendance, automatic replay, financial/team isolation, assistant authorization/revocation, match visibility and fixed-scope protection. `scout-player-client-integration.test.ts`: real controller/request transport through loopback authenticated BFF to SQLite. Mini scout/task tests: cancellation, stale/unload callbacks, partial failure, explicit temporary selection. `verify-temporary-roster.cjs`: native local synthetic UI, restore session/request afterward; not phone or remote acceptance.

## 7. Wrong vs Correct
Wrong: change roster first and later patch training participation in a separate request. Correct: one versioned atomic server operation containing the explicit late participation choice, followed by a matching event/student readback.

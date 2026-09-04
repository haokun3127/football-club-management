# App Client BFF Contracts

## Scenario: Mini-Program P0 BFF

### 1. Scope / Trigger

- Trigger: any WeChat mini-program route under `/clubs/:clubId/app-clients/:clientId/...`.
- These routes are the only frontend-facing BFF surface for parent/coach mini-program flows.
- Mini-program code must not call admin APIs or infer business fields from WPS table shape.

### 2. Signatures

- `POST /clubs/:clubId/app-clients/:clientId/wechat-login`
- `GET /clubs/:clubId/app-clients/:clientId/parent/calendar?from=&to=`
- `GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree`
- `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects`

### 3. Contracts

- Login may accept `roleHint` as UI context only. It is never authoritative.
- Authoritative role comes from active club membership, and must be checked against `ClubAppClient.roleEntrypoints`.
- Parent calendar responses must be scoped by guardian binding and must not expose unrelated event participants.
- Parent calendar and student-schedule date-only queries use UTC whole-day bounds: `from` is inclusive at midnight and `to` is exclusive at the following midnight.
- Coach training project tree comes from the backend training catalog derived from assessment/training configuration.
- Training project writes must verify coach event access and should be sent with `Idempotency-Key`.

### 4. Validation & Error Matrix

- Missing or inactive app client -> `404 not_found`.
- Authenticated role not exposed by app client -> `403 forbidden`.
- Parent calendar requested by non-parent -> `403 forbidden`.
- Coach write without event access -> `403 forbidden`.
- Training project write on a non-training event -> `400 invalid_training_event`.
- Unknown training project id -> `400 invalid_training_project`.

### 5. Good/Base/Bad Cases

- Good: parent with two bound children receives one merged calendar list with only those children in `participants`.
- Base: coach saves two catalog project ids to a training event and receives `trainingSession.sessionPlanId`.
- Bad: frontend passes `roleHint: "parent"` for a coach membership and expects parent privileges. Backend must still return coach role or reject by app client entrypoint.

### Coach Team Detail Additive Response Fields

- `GET /clubs/:clubId/app-clients/:clientId/coach/team` remains coach-scoped by active app client, club role and membership scope.
- The response may include `coaches: [{ id, name, role }]`, derived only from the current scoped team's active default coach. It must not return the club-wide coach directory or phone/contact data.
- Additive fields are compatible with rolling deployment: mini-program clients must normalize an absent `coaches` field to an empty list and keep the real team/member content visible.

### 6. Tests Required

- OpenAPI path exists for each app-client BFF route.
- Parent calendar test asserts participant redaction to bound children.
- Training project tree test asserts catalog projects from CQ Talent assessment/training seed.
- Training project write test asserts event access, session plan id, block drill ids, and idempotency header.
- Login test asserts `roleHint` does not override membership-derived role.

### 7. Wrong vs Correct

#### Wrong

```typescript
const role = request.body.roleHint ?? "parent";
```

#### Correct

```typescript
const role = resolveAppRole(auth.membership.roles);
const entrypoints = client.roleEntrypoints?.[role];
```

## Scenario: Parent Event Participant Projection

### 1. Scope / Trigger

- Trigger: returning an event aggregate to a parent from `GET .../events/:eventId` or another parent BFF.
- Event-level authorization and response-level participant projection are separate checks; both are mandatory.

### 2. Signatures

- `GET /clubs/:clubId/app-clients/:clientId/events/:eventId`
- Parent response: `{ role: "parent", event: { participants: EventParticipant[] } }`.

### 3. Contracts

- A parent may read the event only when at least one participant is guarded by the authenticated user.
- For a parent response, `event.participants` contains only guarded students, even when the underlying team event has a full roster.
- Coach/admin responses may retain the role-authorized roster; the frontend must never perform the parent redaction.

### 4. Validation & Error Matrix

- Event has no participant guarded by the parent -> `403 forbidden`.
- Event exists and has one or more guarded participants -> `200`, with all unrelated participants removed.
- Missing event -> `404 not_found`.

### 5. Good/Base/Bad Cases

- Good: a two-child family sees both siblings on their shared activity and none of the other team members.
- Base: a one-child family receives one participant from a 25-player training event.
- Bad: authorize with `participants.some(isGuardian)` and then return the original unfiltered event.

### 6. Tests Required

- API contract test asserts every returned parent participant belongs to the authenticated guardian.
- Family-calendar and event-detail smoke must use a multi-player event so redaction is observable.
- Coach workbench regression test confirms its authorized roster is not parent-projected.

### 7. Wrong vs Correct

#### Wrong

```typescript
if (event.participants.some(isGuardian)) return { event };
```

#### Correct

```typescript
const participants = event.participants.filter(isGuardian);
if (!participants.length) return forbidden();
return { event: { ...event, participants } };
```

## Mini-Program Acceptance Fixture Convention

Acceptance dates and identities belong to the shared development configuration, not to page implementations. This keeps the imported-data fixture reproducible without shipping a historical date as production behavior.

```typescript
// Correct: a real page date by default; only an explicit develop-only override may pin a fixture.
const initialDate = resolveParentPageDate(new Date(), DEV_PARENT_PAGE_DATE_OVERRIDE);

// Wrong: a page-level fixture that silently becomes production behavior.
const selectedDate = "2026-06-28";
```

- Read `DEV_TEST_DATE` and dev user ids from `utils/config.ts` for local smoke/manual acceptance.
- Date-driven parent pages start from the user's current local date in every environment unless an explicit develop-only override is enabled in shared configuration.
- Smoke scripts may pin fixture dates explicitly, but production page defaults must not duplicate those literals.
- Static acceptance checks should search page code for duplicated fixture dates and demo identities.

## Scenario: Parent Calendar Date-Only Range

### 1. Scope / Trigger

- Trigger: a parent schedule, day view, activity summary, or parent calendar BFF request supplies `from` and/or `to`.

### 2. Signatures

- `GET /clubs/:clubId/app-clients/:clientId/parent/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD`

### 3. Contracts

- A date-only `from` includes activities from that UTC midnight.
- A date-only `to` includes the entire named UTC date by converting it to the next midnight and using an exclusive upper bound.
- ISO timestamp values preserve exact-time comparison semantics.
- A requested interval can span at most 31 calendar days. Guardian participant projection is applied after range filtering and remains mandatory.

### 4. Validation & Error Matrix

- Malformed date/date-time, reversed bounds, or a range longer than 31 days -> `400 invalid_date_range`.
- A Sunday date-only `to` includes Sunday afternoon and excludes the following Monday at `00:00:00.000Z`.

### 5. Good/Base/Bad Cases

- Good: `from=2026-08-10&to=2026-08-16` returns an authorized event at `2026-08-16T15:00:00.000Z`.
- Base: a parent with no matching activities receives a normal empty events array, not another family's activities.
- Bad: parsing `to=2026-08-16` as that day's `00:00:00.000Z` and using `<=`, which silently drops all later Sunday events.

### 6. Tests Required

- Contract test proves final-day inclusion, next-day exclusion, invalid-range `400`, and guardian participant redaction.
- Mini-program test proves a parent schedule derives and requests the selected Monday–Sunday range without embedding a historical fixture date.

### 7. Wrong vs Correct

#### Wrong

```typescript
const to = Date.parse(range.to);
return startsAt <= to;
```

#### Correct

```typescript
const endExclusive = Date.parse(`${range.to}T00:00:00.000Z`) + DAY_MS;
return startsAt < endExclusive;
```

## Scenario: Acceptance Data Identity and Family Privacy

### 1. Scope / Trigger

- Trigger: generating or changing the Chongqing Talent imported-data fixture used by parent/coach app-client smoke.
- The club-wide fixture size and a signed-in family's visibility are separate contracts. Never simulate a 200-player club by granting one parent access to all 200 players.

### 2. Signatures

- `createCqTalentSyntheticFixture(200)` -> 200 students and four 200-row business tables.
- `createCqTalentAcceptanceSeed()` -> users, memberships, parent/coach profiles, guardian bindings, teams, events and participants.
- Stable dev identity: `X-User-Id: user-parent-cq-talent-acceptance`.
- Privacy boundary: `GET .../parent/children` and `GET .../parent/calendar`.

### 3. Contracts

- The 200-player fixture contains 188 families: 178 single-child, 8 two-child and 2 three-child families, deterministically shuffled for reproducible tests.
- Every imported student has exactly one primary guardian binding; every generated family has one parent user, active club membership and parent profile.
- The stable dev parent is one real two-child family. It receives no extra guardian binding and must see only those two children.
- Every imported student has exactly one primary team; every referenced team, default coach, event owner, participant and account membership must exist.
- Club-wide 200-player coverage is asserted at the seed/fixture layer. Parent BFF smoke asserts family privacy and must not use child count as a proxy for club size.

### 4. Validation & Error Matrix

- Student without exactly one primary guardian -> fixture contract failure.
- Parent with more than three bound children -> fixture contract failure.
- Missing parent user/membership/profile or mismatched phone -> fixture contract failure.
- Missing team/coach/event/student reference -> fixture contract failure.
- Dev parent response includes an unrelated student -> parent smoke failure and privacy regression.

### 5. Good/Base/Bad Cases

- Good: the stable dev parent sees two siblings while coach rosters span their assigned teams and the seed still contains 200 students.
- Base: a single-child generated parent sees one child and only that child's calendar entries.
- Bad: add a non-primary guardian binding from the stable dev parent to every imported student so a smoke can count to 200.

### 6. Tests Required

- Fixture test asserts 200 students, four 200-row tables and exact `178/8/2` family-size counts.
- Seed test asserts one guardian per student, at most three students per parent, unique parent accounts/phones and valid user-membership-profile chains.
- Seed test asserts primary-team uniqueness and referential integrity for teams, coaches, events and participants.
- App-client smoke asserts stable parent `children.length === 2`, calendar returns both siblings and no unrelated child identifiers, while coach write flows remain green.

### 7. Wrong vs Correct

#### Wrong

```typescript
guardianBindings.push(...students.map((student) => ({
  studentId: student.id,
  parentId: "parent-cq-talent-acceptance",
})));
```

#### Correct

```typescript
guardianBindings.push(...students.map((student) => ({
  studentId: student.id,
  parentId: familyParentIds.get(student.familyId)!,
  isPrimaryContact: true,
})));
```

## Scenario: Coach Task Workbench

### 1. Scope / Trigger

- Trigger: coach mini-program daily/weekly workbench and training-content editing.

### 2. Signatures

- `GET /clubs/:clubId/app-clients/:clientId/coach/home?date=YYYY-MM-DD`
- `GET /clubs/:clubId/app-clients/:clientId/coach/home?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench`

### 3. Contracts

- `date` remains backward compatible; `from/to` selects an inclusive range of at most 31 days.
- `workbench.summary` returns `total/training/matches/pending`; `tasks[]` returns `eventId/eventType/action/label/dueAt`.
- Task priority is attendance, lesson confirmation after event end, match result, assessment, training content, then view.
- Event workbench training data returns `selectedProjectIds` and resolved `projects` from the current session plan.
- `rosterContext.participants[].status` is participation/RSVP state, not attendance. The client must join participant `studentId` to `rosterContext.students` for the real name and default missing attendance to `pending`, never `present`.
- All events remain membership-scoped on the backend.

### 4. Validation & Error Matrix

- Invalid, reversed, or longer-than-31-day range -> `400 invalid_date_range`.
- Coach without event access -> `403 forbidden`.
- Missing event -> `404 not_found`.

### 5. Good/Base/Bad Cases

- Good: a seven-day query returns only assigned events, a summary, and one next task per event.
- Base: a date-only query returns the original single-day shape plus additive summary/tasks fields.
- Bad: the client infers access or reconstructs selected training projects from local state.

### 6. Tests Required

- Contract test asserts inclusive range, summary, tasks, and membership redaction.
- Training save followed by workbench read asserts identical selected project ids.
- Legacy date query smoke remains green.

### 7. Wrong vs Correct

#### Wrong

```typescript
const selectedProjectIds = localDraft.projectIds;
```

#### Correct

```typescript
const selectedProjectIds = workbench.training.selectedProjectIds;
```

## Scenario: Coach Attendance Persistence

### 1. Scope / Trigger

- Trigger: a coach saves attendance from C4 through `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/attendance`.
- Request: `{ participants: [{ studentId, status, note? }] }`.
- Valid statuses remain `invited|confirmed|present|absent|late|leave_requested|excused`.

### 2. Contracts

- Only an active coach app client with access to the event may write; a parent or out-of-scope coach receives `403`.
- Writes are partial upserts by `(club_id, event_id, student_id)`. A missing `note` preserves the existing note; an explicit empty string clears it.
- The response remains `{ clubId, client, eventId, participants }`; the mini-program normalizes backend `participant.status` and `participant.note` before using legacy attendance field fallbacks.
- `Idempotency-Key` keeps its existing semantics: the same key and payload replays the stored response, while a different payload with the same key returns `409 idempotency_conflict`.
- `present` and `late` debit one lesson under source id `${eventId}-${studentId}`. Replays, duplicate submissions, and a process restart must not create a second debit.

### 3. Persistence Boundary

- Calendar events and event participants reuse the tables from migration `0002_data_capability_foundation.sql`.
- On seed/restart, existing calendar participant rows are insert-if-absent; seed data must never replace a saved attendance status or note.
- Persistence verification requires a file-backed `DATABASE_URL`: PUT a non-empty note, build, stop the confirmed API process, restart `dist/index.js` against the same database, then GET the event and lesson confirmation readback.

### 4. Tests Required

- File-database close/reopen regression asserts status/note preservation, another participant unchanged, and one natural-key row.
- App-client contract regression covers coach `200`, parent/out-of-scope coach `403`, idempotent replay, conflicting payload `409`, and one attendance debit source id.
- C4 visual acceptance is separate: a static or API test does not replace a trusted coach `375x812` DevTools/device screenshot.

## Scenario: Coach Match Detail (C6)

### 1. Scope / Trigger

- Trigger: coach match read view (`/pages/coach/match/index?id=<eventId>`).
- `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match`

### 2. Contract

- Authorization order is fixed: require an active coach app client, then require coach access to the event, then read the event and verify `type === "match"` before reading the match projection.
- `200` returns only `{ event, roster, match, events }`. `roster` is derived only from the event's participants. `event` does not include a second raw participant collection; there is no synthetic summary, inferred assist relation, or inferred half-time score.
- A match event without an existing match record returns `200` with `match: null` and `events: []`.

### 3. Validation & Error Matrix

- Missing/inactive/non-coach app client -> `404 not_found`.
- Parent or out-of-scope coach -> `403 forbidden` before the endpoint exposes event type or roster.
- Accessible unknown event -> `404 not_found`.
- Accessible non-match event -> `400 invalid_match_event`.

### 4. Client Rules

- The Mini Program sorts returned match events by recorded minute ascending. Ties use recorded `createdAt`, then event id; events without a minute sort last.
- The view renders only API-backed event, roster, match, and event data. It does not offer C6's retired inline write form or tactical controls; adding a match event remains the separate C6.1 flow.

## Scenario: Coach Lesson Correction Idempotency

### 1. Scope / Trigger

- Trigger: a coach saves one or more half-lesson corrections through `PATCH /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation`.
- Request body: `{ studentId, lessonDelta, reason? }`, where `lessonDelta` is exactly `-0.5` or `0.5`.

### 2. Contracts

- `Idempotency-Key` is required and constrained to the route's accepted header length. The same key and payload replays the original response; the same key with a changed payload returns `409 idempotency_conflict`.
- The client must not send `actorUserId`. The route requires an installed membership resolver and derives the actor from authenticated `auth.user.id`; an absent resolver receives `401`.
- The caller must retain coach access to the event, and `studentId` must be a participant of that event. Parent, out-of-scope coach, and non-roster writes do not create ledger records.
- The ledger source id is a deterministic SHA-256-derived value over club, event, student, authenticated actor, and idempotency key. Replays and process restarts therefore cannot create a second adjustment.

### 3. Client Read/Write Boundary

- C5.1 reads both coach workbench and lesson confirmation, shows only their participant-id intersection, and displays only returned balances.
- Each selected student is saved serially in fixed `-0.5` or `0.5` steps. A row keeps its idempotency key while its payload is unchanged; changing the row's sign or shared reason creates a new key.
- After a partial or unknown result, the client rereads both sources and stays on the correction page. It must not present sample names, synthetic balances, a system-difference diagnosis, or an unverified success state.

## Scenario: Coach Lesson Confirmation Ledger Projection

### 1. Scope / Trigger

- Trigger: coach C5 pending, history, detail, and correction pages read `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation`.
- This is a response-normalization boundary: the BFF returns one ledger wrapper per participant rather than a flat ledger row.

### 2. Signatures

- `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation`
- Response ledger item: `{ studentId, ledger: { balance, entries: [{ sourceId, ... }] } }`

### 3. Contracts

- The mini-program API layer unwraps `ledger.balance` and `ledger.entries` into the stable view model fields `balance`, `remainingLessons`, and `sourceIds`.
- `sourceIds` is derived from `entries[].sourceId`; an explicit `ledger.sourceIds` array is accepted when supplied by a compatible backend.
- The normalizer remains backward-compatible with a flat ledger item containing `balance`, `balanceAfter`, or `remainingLessons`.
- A completed training is eligible for history only when every returned confirmation participant has the event-specific source id `app-client-lesson-${eventId}-${studentId}`. A partial ledger must remain out of history.

### 4. Validation & Error Matrix

- Missing or empty `participants` -> the page renders its normal empty state; it does not fabricate a completed record.
- Missing ledger source id for any participant -> the history page omits that activity.
- Nested ledger with a finite balance -> pending/detail pages display the returned balance.
- Request/API failure -> pages render a generic retryable error and do not expose raw backend text.

### 5. Good / Base / Bad Cases

- Good: `{ studentId: "student-1", ledger: { balance: 8, entries: [{ sourceId: "app-client-lesson-event-1-student-1" }] } }` normalizes to balance `8` and that source id.
- Base: a flat legacy item with `balanceAfter` remains readable.
- Bad: checking only one participant's source id and presenting a partially settled activity as completed history.

### 6. Tests Required

- API normalization test asserts nested balance, participant balance propagation, and `entries[].sourceId` extraction.
- History page test asserts all-participant source validation and excludes a partial ledger.
- Detail page test asserts workbench/confirmation participant intersection and generic retry errors.

### 7. Wrong vs Correct

#### Wrong

```typescript
const balance = numberOrUndefined(ledger.balance ?? ledger.balanceAfter);
const sourceIds = [];
```

#### Correct

```typescript
const detail = asRecord(ledger.ledger) ?? ledger;
const balance = numberOrUndefined(detail.balance ?? detail.balanceAfter);
const sourceIds = entries.map((entry) => String(entry.sourceId));
```

## Scenario: Parent Metric Drilldown and Assessment Form Grouping

### 1. Scope / Trigger

- Trigger: parent radar selection/detail and coach test-item-first assessment entry.

### 2. Signatures

- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/growth-summary`
- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/ability-metrics/:metricId`
- `GET /clubs/:clubId/app-clients/:clientId/coach/assessments/templates/:templateId/form`

### 3. Contracts

- `metricId` is the identity shared by MetricView nodes, radar points, page selection, detail records and source links.
- Metric detail returns metric metadata, latest/records, trend and redacted source events.
- Assessment form fields return metric, development dimension and test-item protocol so clients can group by project without hardcoding the CQ Talent model.
- Device drafts are keyed by event, template version, student and test item; successful student submissions clear only that student's draft.

### 4. Validation & Error Matrix

- Guardian without student access -> `403 forbidden`.
- Unknown metric/template/version -> `404 not_found`.
- Missing metric record -> successful empty detail; clients must not render a synthetic zero.

### 5. Good/Base/Bad Cases

- Good: clicking a radar axis selects the same metric detail and links its source activity.
- Base: growth without a usable MetricView falls back to available numeric radar metrics.
- Bad: mapping radar axes to details by array index or drawing missing peer averages as zero.

### 6. Tests Required

- Contract tests assert metric identity, privacy redaction and assessment dimension metadata.
- Smoke asserts growth metric -> detail round-trip.
- UI type-check covers local draft and partial-submit result shapes.

### 7. Wrong vs Correct

#### Wrong

```typescript
openMetric(metrics[tappedIndex + 1].metricId);
```

#### Correct

```typescript
openMetric(tappedPoint.metricId);
```

## Scenario: Assessment Metric SQLite Persistence

### 1. Scope / Trigger

- Trigger: a coach submits a test-metric assessment and a parent later reads growth or metric detail after the API process has restarted.

### 2. Signatures

- `POST /clubs/:clubId/app-clients/:clientId/coach/assessments`
- `POST /clubs/:clubId/assessments`
- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/growth-summary`
- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/ability-metrics/:metricId`
- SQLite tables: `player_assessments`, `assessment_raw_results`, `assessment_scores`, `player_metric_records`, `metric_lineages`.

### 3. Contracts

- A successful assessment write persists the assessment graph in one transaction and preserves the existing response shape and coach `201` status.
- Seed replay uses insert-if-absent semantics and never replaces an assessment, result, score, metric record, or lineage already in the file database.
- Parent readbacks remain guardian-scoped and must return the submitted metric record and its `assessmentId`/`rawResultId` links after a same-database `dist/index.js` restart.
- Assessment POST has no `Idempotency-Key` contract; repeated requests are distinct relationships and must not be described as idempotent.

### 4. Validation & Error Matrix

- Parent or out-of-scope coach attempting assessment write -> `403 forbidden`.
- Parent without guardian access to the student -> `403 forbidden`.
- Invalid assessment template, version, item, or club/student scope -> the existing assessment validation error; do not bypass route authorization in the repository.
- SQLite transaction failure -> roll back the complete assessment graph; no partial readback is accepted.

### 5. Good/Base/Bad Cases

- Good: coach POST returns `201`; after closing and reopening the same SQLite file, parent `growth-summary` and `ability-metrics` return `200` with the submitted assessment relation.
- Base: seed data is present alongside the new records and retains both sets after restart.
- Bad: only the in-memory store contains the submitted score, or seed startup overwrites the saved record.

### 6. Tests Required

- File-backed close/reopen regression asserts all five persistence layers and parent readback.
- Contract tests cover coach `201`, parent/no-scope/cross-child `403`, authorized parent `200`, and both POST route forms.
- Build the API, restart `dist/index.js` against the same temporary database, then assert HTTP readback and confirmed PID/port cleanup.

### 7. Wrong vs Correct

#### Wrong

```typescript
const records = this.data.metricRecords;
```

#### Correct

```typescript
const records = this.repositories.assessments.listMetricRecords(clubId, studentId);
```

## Scenario: Match Tactical Board Snapshot

### 1. Scope / Trigger

- Trigger: a coach reads or writes a tactical board for a match event.
- Pixel positions are presentation state; the cross-layer contract stores only normalized coordinates.

### 2. Signatures

- `GET /clubs/:clubId/app-clients/:clientId/coach/tactical-board/formations`
- `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/tactical-board`
- `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/tactical-board`
- SQLite natural key: `UNIQUE (club_id, event_id)`.

### 3. Contracts

- Formation templates contain exactly 11 positions with finite `x/y` values in `0..1`.
- PUT accepts one unique entry per visible event-roster student; at most 11 entries may have role `starter`.
- Snapshot writes record `updatedByCoachId/updatedAt` and upsert by club/event, preserving `createdAt`.
- `completed/cancelled` matches are readable but not writable; parent clients have no route access.

### 4. Validation & Error Matrix

- Non-match event -> `400 invalid_tactical_board_event`.
- Unknown formation, duplicate/out-of-roster student, invalid role or coordinate -> `400 invalid_tactical_board_snapshot`.
- Completed/cancelled write -> `409 tactical_board_read_only`.
- Coach without event access or parent -> `403 forbidden`.

### 5. Good/Base/Bad Cases

- Good: 25-player roster yields 11 starters and 14 substitutes, then restores the saved relative positions after restart.
- Base: no snapshot returns a generated 4-3-3 board with `saved=false`.
- Bad: store `left/top` pixels or accept a student id that is not in the match roster.

### 6. Tests Required

- Domain tests assert templates and duplicate/range/roster validation.
- Repository test closes and reopens SQLite before asserting the saved snapshot.
- Contract test covers coach save/read, parent denial and completed-match read-only behavior.
- Client coordinate tests round-trip at small, regular and large pitch widths.

### 7. Wrong vs Correct

#### Wrong

```typescript
players: [{ studentId, left: 132, top: 284 }]
```

#### Correct

```typescript
players: [{ studentId, x: 0.42, y: 0.68 }]
```

## Scenario: Parent Reminders Feed

### 1. Scope / Trigger

- Trigger: parent mini-program reminder center (Figma P3).
- `GET /clubs/:clubId/app-clients/:clientId/parent/reminders`

### 2. Contracts

- Family-level feed: items are derived per bound child, using the same guardian filter as `parent/children`. No item may reference an unrelated student.
- Items are **derived, never stored or fabricated**: `event_upcoming` (starts within 48h, excludes cancelled/completed), `insurance_expiring` (expires within 30d; `urgent` when expired or <=7d), `lesson_credit_low` (balance <= 4; `urgent` at <= 0).
- A student without the underlying record produces no item; the client must not render synthetic empty states as business facts.
- Response is sorted by severity (`urgent` > `warning` > `info`), then by `dueAt`.
- Copy rendering is client-side; the BFF returns structured fields (`event`, `insurance`, `lessonCredit`), not composed UI strings.

### 3. Validation & Error Matrix

- Missing or inactive app client -> `404 not_found`.
- Authenticated role not parent -> `403 forbidden`.
- Student without operational records -> contributes no items (still `200`).

### 4. Tests Required

- Contract test asserts all three types derive from seeded sources, guardian scoping holds, severity ordering is stable, and coach access is denied.

## Scenario: WeChat Login Connector and Session

### 1. Scope / Trigger

- Trigger: non-develop mini-program login and every authenticated app-client request.

### 2. Signatures

- `POST /clubs/:clubId/app-clients/:clientId/wechat-login`
- Environment: `WECHAT_MINIPROGRAM_APP_ID`, `WECHAT_MINIPROGRAM_APP_SECRET`.
- Client runtime: `envVersion = develop|trial|release`.

### 3. Contracts

- Connector exchanges `wxLoginCode` and optional `phoneCode`; membership is resolved from the returned phone, never from `roleHint`.
- Authenticated login returns a random expiring bearer token; app-client routes resolve membership from that session.
- Missing connector or unmatched phone returns `binding_required` without a session or role.
- develop may send the explicit test user header; trial/release must use HTTPS and must never send dev identity headers.
- A synthetic `dev-*` client token is local state only: do not send it as `Authorization: Bearer`, because the API correctly rejects unknown bearer sessions before header-based development membership is evaluated. Real connector-issued tokens are always sent.
- The current registry is process-local; production deployment must replace it with shared durable session storage before horizontal scaling.

### 4. Validation & Error Matrix

- Missing credentials -> connector disabled, `binding_required`.
- WeChat exchange failure -> `400 wechat_login_failed`.
- Unmatched/stopped/multi-role-invalid account -> no authenticated session.
- Expired/unknown bearer token -> membership required; client clears its session.

### 5. Good/Base/Bad Cases

- Good: phone maps to a parent membership even when the payload suggests coach.
- Base: develop header login creates a test bearer session for local smoke.
- Bad: accepting roleHint, shipping localhost in trial/release, or retaining a 401 session.

### 6. Tests Required

- Fake connector test asserts phone-derived role and bearer session reuse.
- Contract test asserts roleHint cannot override membership.
- Client type-check covers expiresAt and environment configuration.
- DevTools preview is recorded separately from API smoke.

### 7. Wrong vs Correct

#### Wrong

```typescript
const role = body.roleHint;
```

#### Correct

```typescript
const identity = await connector.resolve(body.wxLoginCode, body.phoneCode);
const auth = await membershipResolver.resolveByPhone(clubId, identity.phone);
```

## Scenario: Parent Private Lesson Request

### 1. Scope / Trigger

- Trigger: parent mini-program private lesson booking form (Figma P9 / P9.1).
- `POST /clubs/:clubId/app-clients/:clientId/parent/private-lessons`
- `GET /clubs/:clubId/app-clients/:clientId/parent/private-lessons?student=<studentId>`

### 2. Contracts

- Guardian-scoped write: `studentId` in the body must resolve to a child of the authenticated guardian (same filter as `parent/children`). A request for an unrelated student is rejected, never silently re-targeted.
- Body: `{ studentId, coachName, date, timeSlot, goals, note? }`. `date` is `YYYY-MM-DD`; `goals` is a non-empty string array from the client's fixed vocabulary; `coachName` is a display name (coach identity resolution is a follow-up).
- Created requests are `pending` and returned in full; `201` on create. The BFF never confirms, prices, or schedules — coach confirmation is out of scope for this slice.
- `GET` lists only the guardian's own children's requests, newest first; `student` query narrows to one child.
- Storage: process-local seed-backed collection for this slice; durable persistence (SQLite repository) is a declared follow-up before production use.

### 3. Validation & Error Matrix

- Missing or inactive app client -> `404 not_found`.
- Authenticated role not parent -> `403 forbidden`.
- `studentId` not among the guardian's children -> `403 forbidden`.
- Missing/invalid `studentId`, `coachName`, `date`, `timeSlot`, or empty `goals` -> `400 validation_failed`.

### 4. Tests Required

- Contract test asserts create returns `201` with `pending`, guardian scoping holds (other guardian's child -> `403`), validation errors -> `400`, coach role -> `403`, and `GET` never leaks another guardian's requests.

## Scenario: Coach Team and Ability BFF

教练端球队详情 / 学员雷达 / 团队能力总览三个读端点（Figma C9/C13/C14）。

### 1. Scope / Trigger

当训练管理（C8）保存了 `coach-training-team-id`，C14 能力评估读取该队真实名单和雷达时使用本场景；教练日程不携带该筛选，仍展示权限内全部球队课程。

### 2. Signatures

- `GET /clubs/:clubId/app-clients/:clientId/coach/team?teamId=<optional assigned-team-id>`
- `GET /clubs/:clubId/app-clients/:clientId/coach/students/:studentId/radar`
- `GET /clubs/:clubId/app-clients/:clientId/coach/team/ability-overview?teamId=<optional assigned-team-id>`

### 3. Contracts / Response shape

```ts
// coach/team
interface CoachTeamDetailResponse {
  clubId: string;
  role: "coach";
  team: { id: string; name: string; season: string } | null;
  stats: {
    memberCount: number;
    trainingCount: number; // coach-visible rolling 30-day training events
    completedTrainingCount: number; // all completed events owned by this coach; used by C8's cumulative classes card
    attendanceRate: number | null; // 0-100; null when there is no decided attendance data
  };
  members: Array<{ id: string; name: string }>;
}

// coach/students/:studentId/radar（与 parent growth-summary 同构，客户端复用同一雷达计算）
interface CoachStudentRadarResponse {
  clubId: string;
  role: "coach";
  studentId: string;
  metrics: AbilityMetric[];      // 指标目录
  latest: LatestMetricRecord[];  // 每指标最新记录
}

// coach/team/ability-overview
interface CoachTeamAbilityOverviewResponse {
  clubId: string;
  role: "coach";
  studentCount: number;
  overall: number | null;               // 队均综合分(各维度均值再平均)
  trendDelta: number | null;            // 本评估期 vs 上一期综合分差
  dimensions: Array<{
    metricId: string;
    label: string;
    average: number | null;
    top: number | null;
    bottom: number | null;
  }>;
}
```

`teamId` 省略时保持既有默认可见队伍语义；提供时只可定位当前教练被分配的 active team。`members` 从持久化队伍成员读取，但必须以 `id.localeCompare(..., { numeric: true })` 稳定排序，不能把 SQLite 的姓名排序或无序读透传为接口排序。

### 4. Validation & Error Matrix

- client 不存在/未激活/角色不符 → 404 app_client_not_found
- 非 coach/admin 角色 → 403 forbidden
- `teamId` 不属于当前成员范围 → 403 forbidden，不能回退到默认队或泄露队伍统计
- radar：studentId 不在该教练执教学生集合内 → 403 forbidden（不泄露其他学生能力数据）
- 教练无执教事件 → team 返回空 members（200，不报错）

### 5. Good / Base / Bad Cases

- Good：训练管理选择已分配的 U10 队，C14 读取该队真实 roster 和每名学员的真实雷达；切换球员只改变选中学员的雷达。
- Base：未带 `teamId` 的旧客户端继续得到默认可见队伍和稳定成员顺序。
- Bad：客户端把权限外 `teamId` 作为普通空态处理，或把数据库按姓名的返回顺序直接作为 roster 合同。

### 6. Tests Required

- OpenAPI 测试覆盖两个读端点的可选 `teamId` query schema。
- API 路由测试断言可见队 `200`、不可见队 `403`，并覆盖两条端点。
- 受控双角色账号回归断言 `/coach/team` 返回成员集合按稳定的自然 ID 顺序，避免持久化存储排序改变页面/测试表现。
- C14 小程序控制器测试断言读取训练管理保存的队伍 id、真实 roster、直接球员选择以及过期请求不会覆盖最新雷达。

### 7. Wrong vs Correct

#### Wrong

```ts
const members = await context.store.listOperationalStudents(clubId, { teamId });
return { members };
```

#### Correct

```ts
const members = await context.store.listOperationalStudents(clubId, { teamId });
return {
  members: members
    .map((student) => ({ id: student.id, name: student.name }))
    .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true })),
};
```

## Scenario: Coach Event Change Request

教练对活动发起变更申请（Figma C3 变更活动：原因 chips + 新时间 + 新场地 + 备注，顶部"保存"提交）。
v1 为申请-受理语义：创建后 status=pending 等待管理员处理，不直接改活动。

### Request

`POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/change-requests`

```json
{ "reason": "venue|time|weather|other", "newStartsAt": "ISO8601(可选)", "newVenue": "string(可选)", "note": "string(可选,≤500)" }
```

### Response shape

201：`{ clubId, request: EventChangeRequest }`，`status = "pending"`。

### Error matrix

- client 不存在/未激活/角色不符 → 404
- 非 coach/admin 角色 → 403 forbidden
- eventId 不存在 → 404 not_found
- eventId 不在该教练可访问活动内 → 403 forbidden
- 缺 reason / reason 非枚举 / note 超长 → 400 bad_request

### Storage

v1 存储为进程内集合（同私教申请语义），SQLite 持久化是已声明的后续项。


## Scenario: Coach Training Coverage and Assessment Tasks

教练端训练覆盖面预览（C10.1）与测评任务列表（C11）。

### `GET /clubs/{clubId}/app-clients/{clientId}/coach/training-coverage`

- **200**：`{ clubId, role: "coach", students: [{ studentId, name, coveredCount, totalCount, dimensions: [{ dimensionId, label, covered, scorePercent }] }] }`
- 语义：学员范围为教练近 30 天执教活动并集（与 `coach/team` 一致）；维度来自发展维度目录；`covered` = 该学员在该维度下任一能力指标存在记录；`scorePercent` = 该维度最新记录归一化百分值（`score_0_100` 原值，`rating_1_5` ×20，`percentage` 原值），无记录为 `null`。
- **403**：非教练成员；无 active client → 404。

### `GET /clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks`

- **200**：`{ clubId, role: "coach", tasks: [{ id, title, templateId, startsOn, dueOn, status, completedStudents, totalStudents }] }`
- 语义：`status` = `not_started`（startsOn 晚于今天）/ `completed`（完成学员数 ≥ 总学员数且总学员数 > 0）/ `in_progress`；`completedStudents` = 窗口内（occurredAt ≥ startsOn）存在任一能力指标记录的学员数；`totalStudents` = 教练作用域学员数。
- 存储：SQLite `assessment_tasks`；开发验收种子仅以 `ON CONFLICT(id) DO NOTHING` 填充缺失记录，生产不依赖 `FCM_CQ_TALENT_ACCEPTANCE_SEED` 提供任务。
- **403**：非教练成员。

### `GET /clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks/{taskId}/projects/{projectId}/entries`

- **200**：`{ clubId, taskId, projectId, savedValuesByStudent: { [studentId]: { [testItemId]: MetricValue } } }`
- 语义：读取指定测评任务、项目下已保存的最新成绩，学员范围来自任务所属球队的 active team members；任务已通过教练授权后，不再叠加“近 30 天有活动”过滤。
- 客户端可把 `MetricValue` 归一化为输入框初始值，但不得把本机草稿当成服务端保存成功的证明。
- **403**：非教练成员或任务球队超出当前教练范围；**404**：任务、模板或有效模板版本不存在。

### 复用既有端点

- C10 训练内容选择：`GET /coach/training-project-tree` + `PUT /coach/events/{eventId}/training-projects`（已存在）。
- C15 测评录入提交：`POST /coach/assessments`（已存在，按学员逐条提交）。

## Scenario: Persistent Coach Assessment Task Lists

### 1. Scope / Trigger

- Trigger: C11 reads `GET /clubs/:clubId/app-clients/:clientId/coach/assessment-tasks` in a production API process where acceptance seeds are intentionally disabled.
- The task definitions are operational club data; a production empty list must reflect an empty persisted collection, not a frontend fixture or a production-only seed escape hatch.

### 2. Signatures

- Migration: `apps/api/db/migrations/0012_assessment_tasks.sql` creates `assessment_tasks(id, club_id, title, template_id, starts_on, due_on, created_at, updated_at)`.
- Repository: `AssessmentTaskRepository.listByClub(clubId)`, `.save(task)`, and `.insertIfAbsent(task)`.
- Store: `PersistentApiStore` merges persisted task rows over same-id development seed records before the existing C11 BFF computes status and progress.

### 3. Contracts

- Every task row is club-scoped and references an existing assessment template. Reads are ordered by `starts_on`, `due_on`, then `id`.
- Normal seed replay only inserts an absent fixed-id task. It never overwrites a persisted task edited by an operator.
- Production does not load the acceptance seed even if `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` is present; production test tasks, when explicitly authorized, are controlled SQLite rows after a backup and API restart.
- The BFF keeps its response shape and derives `status`, `completedStudents`, and `totalStudents` from the authenticated coach scope. A zero-row table returns `{ tasks: [] }`; it must not synthesize a Figma sample card.

### 4. Validation & Error Matrix

- Missing/inactive app client -> `404 not_found`; non-coach membership -> `403 forbidden`.
- Missing club or assessment-template reference on a task write -> SQLite foreign-key rejection and no partial task row.
- `due_on < starts_on` -> SQLite check rejection and no task row.
- No persisted tasks for the club -> `200` with an empty `tasks` array, not an API or rendering error.

### 5. Good / Base / Bad Cases

- Good: an authorized club task survives a database close/reopen and C11 returns its real title/template/date range.
- Base: a local acceptance seed inserts its two fixed tasks into a fresh SQLite database, then re-seeding preserves the same persisted rows.
- Bad: make C11 render static Figma tasks when `/assessment-tasks` returns `[]`, or bypass the production seed guard to make test data appear.

### 6. Tests Required

- Migration test asserts `0012_assessment_tasks.sql` is applied once and the table is present.
- File-backed persistence test saves one task, closes/reopens the SQLite database, and asserts both repository and `PersistentApiStore` return it.
- Existing C11 BFF contract test continues to assert coach access, task statuses, and non-empty seeded development task data.

### 7. Wrong vs Correct

#### Wrong

```ts
return { tasks: figmaExampleTasks };
```

#### Correct

```ts
assessmentTasks: mergeById(
  data.assessmentTasks,
  clubIds.flatMap((clubId) => repositories.assessmentTasks.listByClub(clubId)),
)
```


## Scenario: Coach Match Event Append

### Request

`POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match/events`

The body is exactly `{ studentId, type, minute?, note? }`. The client must send an `Idempotency-Key` between 8 and 128 characters. It must not send an actor, match id, player name, score, metric id, or roster data.

### Authorization and Validation

- Resolve the active coach client and authenticated coach membership before exposing payload validation results.
- Require coach access to the event, then verify the event exists and is a match.
- A writable student belongs to both the event participant list and the persisted match roster.
- `type` is the intersection of the domain match-event enum and `capabilities.match.eventTypes`.
- `minute` must be a JSON number and an integer from 0 through 300; a numeric string is invalid.
- Cancelled matches reject the append; completed matches remain available for retrospective facts.

### Persistence and Response

- Construct the event and any derived metric records before a single transaction writes them.
- Persistent ids are server-generated. An unexpected persistence or foreign-key error returns a generic `500 internal_error` and leaves both event and metric tables unchanged.
- The same key with the canonical payload replays the original `201`; a changed canonical payload returns `409 idempotency_conflict`.
- Only an exact `201` is a client-side success. C6 re-reads its match detail after C6.1 returns; it does not accept an opener-channel or optimistic event payload.

## Scenario: Coach Match Summary Save

### 1. Scope / Trigger

- Trigger: coach C6 match editor (`/pages/coach/match-edit`) saves the match summary through the existing app-client BFF.
- The summary write and the event append are separate operations; a summary save must not replace or rewrite the persisted roster/events.

### 2. Signatures

- `POST /clubs/:clubId/app-clients/:clientId/coach/matches`
- Request body: `{ eventId, matchType, status, opponentName?, homeScore?, awayScore? }` plus the existing server-supported roster/event fields when supplied by the route contract.
- Follow-up read: `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match`

### 3. Contracts

- The caller must be an active coach app client with access to the match event; role hints and client-side route access are not authorization.
- `matchType` and `status` use the existing domain enums. Scores are non-negative integers when present; a completed match requires both scores, while a cancelled match cannot carry score data or player events.
- The client treats the write as confirmed only after a fresh match-detail read returns the submitted summary. A successful POST response alone is not sufficient for navigation or a success toast.
- The server preserves existing match events and roster rows when updating the summary. A repeated save for the same event is an update, not a second match record.

### 4. Validation & Error Matrix

- Missing/inactive/non-coach app client -> `404 not_found`.
- Parent or out-of-scope coach -> `403 forbidden`.
- Unknown event -> `404 not_found`; accessible non-match event -> `400 invalid_match_event`.
- Negative, fractional, non-numeric, or incomplete completed-match scores -> `400 validation_failed`.
- Cancelled match with score or event payload -> `400 validation_failed`.

### 5. Good / Base / Bad Cases

- Good: save a completed 2–1 match, re-read the detail, and see the same opponent/status/scores plus the unchanged real roster/events.
- Base: save a scheduled match without scores; the detail remains readable and scores remain unavailable.
- Bad: navigate away after `POST 201` without re-reading, or create a new persistent match id for every edit of one event.

### 6. Tests Required

- API contract test asserts coach authorization, score validation, update idempotence by event, and preservation of existing roster/events.
- Persistence test closes and reopens the file-backed database, then reads the saved match summary from the same event.
- Mini-program controller test asserts initial real-data load, local validation without an API call, POST payload, fresh detail read, and navigation only after readback matches.

### 7. Wrong vs Correct

#### Wrong

```typescript
await saveCoachMatch(payload);
wx.navigateBack();
```

#### Correct

```typescript
await saveCoachMatch(payload);
const confirmed = await getCoachMatchDetail(eventId);
assertSummaryMatches(confirmed.match, payload);
wx.navigateBack();
```

## Scenario: Coach Training Session Association Persistence

### 1. Scope / Trigger

- Trigger: coach C10 saves catalog training projects and intensity for a real training event.
- The project catalog (`training-project-tree`), the selected `session_plan`, and the event's `training_session` association are distinct persisted facts.

### 2. Signatures

- `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects`
- Follow-up read: `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench`

### 3. Contracts

- The write is coach-scoped and accepts only real catalog project ids. It creates or updates one session plan for the event and one training-session association for `(clubId, eventId)`.
- `training.session.sessionPlanId`, `training.session.intensity`, `training.selectedProjectIds`, and `training.projects` are read from the persistent store, not reconstructed from mini-program local state.
- On API restart against the same file-backed database, the workbench must return the saved association and selected projects. Seed replay may fill absent rows but must not overwrite saved values.
- Repeated saves for one event update the existing training-session natural-key row and preserve its stable id.

### 4. Validation & Error Matrix

- Missing/inactive/non-coach app client -> `404 not_found`.
- Parent or out-of-scope coach -> `403 forbidden`.
- Unknown event -> `404 not_found`; accessible non-training event -> `400 invalid_training_event`.
- Unknown project id -> `400 invalid_training_project`.
- Invalid persistence state -> API returns an error without claiming the plan was saved; the client retains a retryable error state.

### 5. Good / Base / Bad Cases

- Good: save two real drills, restart the API, and read the same two project ids in the coach workbench.
- Base: a training event without selected projects returns a real session with no session plan or an explicit empty training projection.
- Bad: show a success toast from the PUT response while a restart loses `trainingSession`, or hardcode Figma sample drills in the page.

### 6. Tests Required

- API route test covers authorization, project-id validation and the existing response shape.
- File-backed restart test saves through the route, closes/reopens the API/database, and asserts session plan id, intensity, selected project ids and resolved project rows.
- Mini-program tests remain method-free in WXML; this persistence slice has no visual acceptance claim without a trusted 375x812 screenshot.

### 7. Wrong vs Correct

#### Wrong

```ts
const selectedProjectIds = localDraft.projectIds;
```

#### Correct

```ts
const selectedProjectIds = workbench.training.selectedProjectIds;
```

## Scenario: Parent Content Slices (articles / FAQs / venues / coach team)

家长端内容中心四切片由静态数据切换为真实 BFF，全部只读、按俱乐部隔离。

### GET /clubs/{clubId}/app-clients/{clientId}/content/articles

- 响应 `{ "articles": [{ "id", "title", "subtitle", "accent", "category" }] }`
- `category` ∈ `venue | help | coach | guide`；`accent` 为品牌色十六进制，供小程序卡片标题着色。
- 数据来自种子集合 `contentArticles`（俱乐部内容运营维护），无需分页（单俱乐部 < 50 条）。

### GET /clubs/{clubId}/app-clients/{clientId}/content/faqs

- 响应 `{ "questions": [{ "id", "q", "a", "category" }] }`
- `category` 对应帮助中心分类标签（训练规则/出勤说明/成长报告/账号设置/联系客服/更多问题）。

### GET /clubs/{clubId}/app-clients/{clientId}/venues

- 响应 `{ "venues": [{ "id", "name", "type", "address", "tags", "facilities", "monthlyCount", "latitude", "longitude" }] }`
- `tags` ∈ `outdoor | indoor | natural | artificial`；`monthlyCount` 由近 30 天该场地活动数实时聚合（非种子字段）。
- `latitude`/`longitude` 供 `wx.openLocation` 导航使用。

### GET /clubs/{clubId}/app-clients/{clientId}/coach-team

- 响应 `{ "teamName", "teamChips": [], "teamGoal", "coaches": [{ "id", "name", "role", "bio" }] }`
- 教练列表来自平台种子 `coaches`（角色：球队主教练优先，其余按专长）；`bio` 由 specialties 拼接。

### 错误与安全

- 四个端点均要求已登录会话（家长或教练均可读）；未知俱乐部 → 404。

## Scenario: Parent Notice Banner Article

### 1. Scope / Trigger

- Trigger: 家长日程首页需要展示俱乐部运营通知，但必须继续复用内容 BFF，不能在小程序中内置 Figma 示例文案。

### 2. Signatures

- `GET /clubs/{clubId}/app-clients/{clientId}/content/articles`
- `ContentArticle.category`: `venue | help | coach | guide | notice`
- 可选日期字段：`publishedAt?: string`、`expiresAt?: string`

### 3. Contracts

- 响应保持 `{ clubId, articles }`；每条文章至少包含 `id`、`title`、`subtitle`、`accent`、`category`。
- `notice` 是俱乐部范围内容，家长日程只选取未过期的通知，并在 TypeScript view model 中生成摘要和日期标签。
- WXML 只绑定 `NoticeBannerView` 的预计算字段，不调用字符串或数组方法；点击详情复用 `/pages/parent/article/index?id=...`。

### 4. Validation & Error Matrix

- 未登录、无效 app client 或越权俱乐部 -> 沿用内容 BFF 的 `401/403/404`。
- `expiresAt` 无法解析 -> 客户端不按过期处理，但展示“日期待同步”，不阻断日程。
- 没有有效 `notice` -> `noticeBanner = null`，不显示伪通知，日历与活动列表仍正常渲染。
- 内容请求失败 -> 日程页进入已有可重试错误态，不把本地示例文案当作回退数据。

### 5. Good / Base / Bad Cases

- Good: API 返回一条未过期 `notice`，Banner 显示真实标题、摘要和有效期，点击后打开真实文章详情。
- Base: API 返回空数组或全部过期，Banner 不渲染，页面仍显示日程。
- Bad: 在 WXML 使用 `body.slice(...)`，或把 Figma 示例通知硬编码为默认 Banner。

### 6. Tests Required

- API 内容契约测试断言 `notice` 类别能够返回且 OpenAPI 枚举覆盖它。
- 小程序 view-model 测试断言只选 `notice`、过滤过期内容、预计算摘要/日期和空态。
- 真实微信开发者工具截图必须分别验证有通知和无通知布局；静态测试不等于视觉通过。

### 7. Wrong vs Correct

#### Wrong

```typescript
const summary = article.body?.slice(0, 52) || "俱乐部最新通知";
```

#### Correct

```typescript
const noticeBanner = presentNoticeBanner(articles);
// WXML 只使用 noticeBanner.summary / noticeBanner.metaLabel
```

## Scenario: Training Content Scores and Semester Assessment Scope

### 1. Scope / Trigger

- Trigger: a coach records per-student classroom training scores, or creates/submits a semester assessment task through the mini-program BFF.
- This crosses `training_content_assessments`, `assessment_tasks`, `player_assessments`, the coach BFF, and parent growth summary projections.

### 2. Signatures

- `GET|PUT /clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-content-assessments`
- `POST /clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks` with `{ title, templateId, teamId, termLabel, startsOn, dueOn }`
- Semester assessment submission carries `assessmentTaskId`.
- Parent growth summary additive fields:
  - `trainingStats.lessonStats: { attendedLessons, expectedLessons, attendanceRate }`
  - `timeline: GrowthTimelineItem[]`, where every item is already scoped to the requested child and is one of `training | match | ability_update`.

### 3. Contracts

- A training-content assessment is uniquely `(clubId, eventId, studentId, trainingProjectId)` and an overwrite updates the same record.
- It is valid only for a training event, a project selected on that event, and a roster student whose current attendance is `present`.
- A semester task owns exactly one coach-accessible team, a nonblank `termLabel`, one template and one date window. Submissions must use its task id and satisfy its team/template/window scope.
- The task-list projection returns the accessible `teams: [{ id, name }]` options and each task's safe `teamName`; C11 uses them for task creation and display, rather than deriving a team from a default workbench.
- Classroom training assessment is a separate full-screen C2 flow. It may use only the GET scope's `selectedProjectIds` and `presentStudentIds`; the old activity-level stage-assessment shortcut must not bypass C11/C15 task ownership.
- `lessonStats` counts only completed, non-cancelled training events: expected is eligible trainings, attended is `present`; matches never contribute.
- `timeline.training` resolves the saved session-plan drills for one completed training and attaches only that child's persisted training-content scores/notes.
- `timeline.match` resolves one completed match's opponent, score, venue and only that child's match events. `timeline.ability_update` is derived from persisted training-content scoring or from an assessment metric record whose `assessmentId` maps to a real task-bound player assessment.
- P4 may render only the latest items, but the full-screen milestones page must reuse this BFF field rather than fetching calendar windows and rebuilding a second, client-side history.

### 4. Validation & Error Matrix

- Non-training event -> `400 invalid_training_event`.
- Project not selected for the event -> `400 invalid_training_project`.
- Student absent/not on roster -> `400 invalid_training_assessment_student`.
- Blank term label -> `400 invalid_term_label`.
- Inaccessible team, task-template mismatch, task-window mismatch, or student outside the task team -> `403 forbidden` or the route's explicit `400` scope error; no assessment row is written.

### 5. Good / Base / Bad Cases

- Good: coach marks a present student 91 for a selected drill, restarts file SQLite, and reads one persisted assessment back.
- Base: a task has no completed submissions and reports `0 / team roster size` rather than inferring progress from unrelated records.
- Bad: client sends a student id, template id, or `taskId` and the server trusts it without resolving the event/team scope.

### 6. Tests Required

- API regression covers present-only, selected-project-only, non-training rejection, and file-SQLite reopen.
- Task regression covers blank term rejection, team/template/window validation, and distinct-student task progress.
- Parent growth regression proves completed matches are excluded from `lessonStats`.
- Parent timeline regression saves a selected drill score, then proves the parent can read training, match and ability-update entries without another child's match events.
- Mini-program normalizer/view-model regression covers absent additive data and displays `已到/应到课时` from the server response.

### 7. Wrong vs Correct

#### Wrong

```typescript
const expectedLessons = trainingAndMatchEvents.length;
```

#### Correct

```typescript
const eligibleTrainings = events.filter((event) => event.type === "training" && event.endsAt <= now && !event.cancelled);
const expectedLessons = eligibleTrainings.length;
```

#### Wrong

```ts
const events = await getParentCalendar(from, to);
return makeGrowthMilestones(events);
```

#### Correct

```ts
const growth = await getParentGrowth(studentId);
return growth.timeline;
```

## Scenario: Completed Semester Assessment Readback

### 1. Scope / Trigger

- Trigger: a coach opens a semester assessment task after every scoped team member has submitted a result and the task projection reports `status: "completed"`.
- The task completion state means its scores are immutable through the mini-program entry flow; it does not mean the saved results become inaccessible.

### 2. Signatures

- `GET /clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks`
- `GET /clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks/{taskId}/projects/{projectId}/entries`
- Mini-program read helper: `getCoachAssessmentTasks({ forceRefresh?: boolean })`.

### 3. Contracts

- `in_progress` tasks open the normal project and batch-entry workflow.
- `completed` tasks may open the same project and batch-entry routes, but batch entry is strictly read-only: inputs and save writes are disabled, saved rows remain visible, and the primary action returns to the project list.
- `not_started` tasks remain non-enterable.
- After an assessment save, callers may request `{ forceRefresh: true }`; this appends a unique harmless query value so the DevTools HTTP cache cannot serve an obsolete task status. The BFF response shape is unchanged.

### 4. Validation & Error Matrix

- Task absent, template mismatch, or inaccessible -> existing empty/forbidden handling; never display another team's saved values.
- `not_started` -> client shows the existing "任务尚未开始" message and does not navigate.
- `completed` + attempted raw input/save -> client performs no write and displays the read-only explanation.
- Refresh request failure -> retain normal request error handling; do not synthesize task status or score rows.

### 5. Good / Base / Bad Cases

- Good: saving the final student's score turns the task into `completed`; reopening it shows every persisted row marked `已保存` and offers `返回项目`.
- Base: an in-progress task with partial scores still allows editing and submits only changed rows.
- Bad: filtering task navigation to `status === "in_progress"`, which prevents a coach from reviewing the scores just saved.

### 6. Tests Required

- Client request test asserts force refresh creates a distinct `/coach/assessment-tasks?refresh=<timestamp>-<sequence>` URL.
- Task list and project tests assert `completed` task navigation is allowed while `not_started` remains blocked.
- Batch-entry test asserts a completed task hydrates persisted values, exposes read-only labels, and never calls `submitCoachAssessment` after input/save attempts.

### 7. Wrong vs Correct

#### Wrong

```ts
if (task.status !== "in_progress") {
  return showUnavailable();
}
```

#### Correct

```ts
const isReadable = task.status === "in_progress" || task.status === "completed";
const readOnly = task.status === "completed";
if (!isReadable) return showUnavailable();
```

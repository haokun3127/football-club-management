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
// Correct: one fixture owner, current date outside dev mode.
const initialDate = DEV_MODE ? DEV_TEST_DATE : currentLocalDate();

// Wrong: a page-level fixture that silently becomes production behavior.
const selectedDate = "2026-06-28";
```

- Read `DEV_TEST_DATE` and dev user ids from `utils/config.ts` for local smoke/manual acceptance.
- In non-dev mode, date-driven pages start from the user's current local date.
- Smoke scripts may pin fixture dates explicitly, but production page defaults must not duplicate those literals.
- Static acceptance checks should search page code for duplicated fixture dates and demo identities.

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

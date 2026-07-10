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

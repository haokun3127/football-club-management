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

### Request

- `GET /clubs/:clubId/app-clients/:clientId/coach/team`
- `GET /clubs/:clubId/app-clients/:clientId/coach/students/:studentId/radar`
- `GET /clubs/:clubId/app-clients/:clientId/coach/team/ability-overview`

### Response shape

```ts
// coach/team
interface CoachTeamDetailResponse {
  clubId: string;
  role: "coach";
  team: { id: string; name: string; season: string } | null;
  stats: { memberCount: number; trainingCount: number; attendanceRate: number | null }; // attendanceRate 0-100, 无出勤数据时 null
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

### Error matrix

- client 不存在/未激活/角色不符 → 404 app_client_not_found
- 非 coach/admin 角色 → 403 forbidden
- radar：studentId 不在该教练执教学生集合内 → 403 forbidden（不泄露其他学生能力数据）
- 教练无执教事件 → team 返回空 members（200，不报错）

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
- 存储：进程内集合 + 种子数据（与私教申请/变更申请一致，持久化是已声明后续项）。
- **403**：非教练成员。

### 复用既有端点

- C10 训练内容选择：`GET /coach/training-project-tree` + `PUT /coach/events/{eventId}/training-projects`（已存在）。
- C15 测评录入提交：`POST /coach/assessments`（已存在，按学员逐条提交）。


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

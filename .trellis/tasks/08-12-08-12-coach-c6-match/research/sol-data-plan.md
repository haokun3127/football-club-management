# Research: C6/C6.1 coach match demo data plan

- Query: Inspect C6/C6.1 match pages, API contracts/routes, fixtures/seed/persistence, task Figma references, and the current on-disk worktree; plan a credible real-data demo without touching production data.
- Scope: mixed (internal repository plus online-Figma references)
- Date: 2026-08-12

## Findings

### Outcome and recommended sequence

The repository already contains the intended C6 read surface, C6.1 append surface, match seed/repository/migration files, and focused tests. The safest next step is not a production seed: extend the existing CQ Talent acceptance aggregate only for fresh isolated databases, prove GET -> POST -> replay -> changed-payload conflict -> GET -> close/reopen -> GET, and then point the development Mini Program at that isolated API instance. The three current Figma nodes have been refreshed; their sample facts remain visual only.

1. Implement/confirm the isolated fixture and API proof first.
2. Render C6 from the GET projection and C6.1 only from returned roster/capability values.
3. Submit one event with a stable idempotency key; accept only HTTP 201; navigate back and let C6 reread.
4. Restart against the same temporary database and prove the event is still present exactly once.
5. Compare the resulting states to Figma C6 `93:796`, C6.1 `93:827`, and C6.2 `93:858`; treat Figma sample names/scores/events as visual copy, not business truth.

### Exact real test data required

Use exactly one internally consistent demo aggregate (stable test-only IDs; no random IDs in assertions):

- 1 active club and 1 active app client whose coach entrypoint is enabled.
- 1 active coach user, active club membership, and coach profile; authenticate with the existing develop-only user-header/session mechanism.
- 1 coach-owned team and the existing 16 named CQ Talent acceptance students, each with a valid primary-team relationship and event participant row.
- 1 accessible calendar event with `type=match`, a real title, opponent, venue, ISO start/end timestamps, and a writable non-cancelled status.
- 1 persisted completed friendly-match row linked to that exact event, with its real 3:2 score and a roster containing the same 16 student IDs. The C6.1 writable set must be the intersection of event participants and persisted match roster.
- 4 pre-existing timeline facts using types actually returned by `capabilities.match.eventTypes`: existing goal and assist at minute 22 plus yellow-card and save facts at distinct minutes. Every event has a real roster student, stable ID, `createdAt`, and a short note. Never add a Figma-only enum.
- 1 C6.1 acceptance draft: a roster student, an allowed event type, minute 73, note `右路回防战术犯规`, and a stable 8-128 character idempotency key such as `c6-demo-event-73-student-04-v1`.
- Expected proof: first POST is 201; exact replay with the same key/payload returns the original 201 result and creates no duplicate; changed minute or note with the same key returns 409; C6's subsequent GET shows one new minute-73 row; the same GET after database close/reopen is identical.
- Negative companion rows should be created only inside tests: one non-match event, one cancelled match, one out-of-scope coach, one event-only student, and one match-roster-only student. These make authorization/type/roster-intersection failures observable without polluting the manual demo.

The existing shared development club/client/coach IDs should be read from `apps/miniprogram-cq-talent/utils/config.ts`; do not duplicate or guess those literals in page code. If an isolated harness needs independent IDs, use a `*-c6-demo` namespace and configure both the API process and Mini Program develop runtime explicitly.

### Data already present versus missing

Present in the current on-disk tree:

- C6 page and focused test: `apps/miniprogram-cq-talent/pages/coach/match/index.{ts,wxml,wxss,json}` and `index.test.mjs`. The focused test includes the C6-to-C6.1 navigation contract (`index.test.mjs:110`).
- C6.1 page and focused test: `apps/miniprogram-cq-talent/pages/coach/match-event-add/index.{ts,wxml,wxss,json}` and `index.test.mjs` (`index.test.mjs:63`).
- API match route/repository/seed surfaces: `apps/api/src/routes/match.routes.ts`, `apps/api/src/routes/app-client.routes.ts`, `apps/api/src/persistence/match-repository.ts`, `apps/api/src/seed/match.ts`, `apps/api/src/store.ts`, and migration `apps/api/db/migrations/0008_match_event_bundles.sql`.
- Focused contract coverage files: `apps/api/test/app-client-match-detail.test.ts` and `apps/api/test/app-client-match-event-create.test.ts`; persistence integration coverage also belongs in `apps/api/test/persistence.test.ts`.
- Domain match types/services: `packages/domain/src/match.ts`, `packages/domain/src/match-services.ts`, and `packages/domain/test/match-services.test.ts`.
- Historical task contracts already define the read projection, truthful null/empty behavior, real roster join, and removal of inline sample forms (`.trellis/tasks/archive/2026-08/08-10-coach-match-entry-figma-alignment/prd.md:10`, `:11`, `:12`, `:14`). They also define exact-201 append, draft retention, and C6 reread (`.trellis/tasks/archive/2026-08/08-10-coach-match-event-add-figma-alignment/prd.md:13`, `:16`, `:17`).

Missing or not yet demonstrated for this active task:

- Task PRD, design, implementation plan and curated context manifests now specify the 16-player/3:2 aggregate and explicit no-regression gates.
- The fresh-database restart test must still be extended with a resolved-temp-path assertion and captured GET/POST/replay/conflict/reopen evidence.
- The online Figma nodes `93:796`, `93:827` and `93:858` were refreshed on 2026-08-12. The current implementation must adapt their layout rather than copying any sample business fact.
- The implementer must inspect and preserve unrelated worktree changes before editing.

### Safe isolated-database seed/test strategy

- Automated domain/route tests: use `openSqliteDatabase(":memory:")` where restart is irrelevant, matching `.trellis/spec/api/backend/database-guidelines.md`. The acceptance-seed environment flag is accepted only for a non-production test process and must be ignored in production.
- Restart proof: create a unique OS temporary directory and a single SQLite file inside it; run the normal ordered migrations and only the deterministic C6 acceptance fixture against that explicit file; start the in-process API/store with the explicit database handle/path; close every handle; reopen the same file and reread through HTTP.
- Manual Mini Program demo: start a separate local API process whose database path/config is explicitly bound to that temporary file. Print/assert the resolved path before migration or seed. Abort if the path is empty, is the normal development/production database, or lies outside the created temporary directory.
- Never run a broad seed command against the default database merely to prepare this page. Never copy production data. Never reset/truncate a shared database. Cleanup is optional and must occur only after the API closes, after resolving and validating the exact temporary directory; preserving the temp file for evidence is safer during acceptance.
- Keep fixture creation idempotent by stable IDs/natural keys, but verify persistence with a fresh temp file per test. Do not let startup reseeding overwrite appended match events.

### API contracts, involved files, and code patterns

- Read: `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match` returns the authorized event, participant-derived roster, `match | null`, persisted events, and capability values needed by C6/C6.1. Parent/out-of-scope coach is 403 before event-type disclosure; authorized non-match is 400; missing event is 404; no match is truthful 200 with null/empty (`...coach-match-entry-figma-alignment/prd.md:10-12`).
- Append: `POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match/events` accepts exactly `{ studentId, type, minute?, note? }` plus `Idempotency-Key`; no player name, score, roster, actor, match ID, or metric ID is client-authoritative. See `.trellis/spec/api/backend/app-client-bff-contracts.md`, scenario `Coach Match Event Append`.
- Persistence must atomically write the match event and any derived metric record; an unexpected failure leaves both unchanged. Completed matches permit retrospective facts; cancelled matches reject append. Same canonical key/payload replays; changed payload conflicts.
- Client pattern: C6.1 derives controls from GET data, keeps a page-local draft and one stable operation key, treats only 201 as success, then `navigateBack`; C6 reloads the exact event in `onShow`. The archived design records this boundary at `.trellis/tasks/archive/2026-08/08-10-coach-match-event-add-figma-alignment/design.md:21`.
- Likely implementation touch set (only if verification shows a gap): the two page directories; Mini Program `utils/api.ts`, `utils/types.ts`, `utils/request.ts`, `utils/config.ts`; API app-client/match route, schemas/OpenAPI/store, match repository/seed/migration; domain match type/service; the focused tests listed above. Do not touch global `app.json` unless a missing route registration is independently proven.

### Figma nodes

- `93:796` — C6 Match Entry: 88px soft header; 16px content inset; dark, 16px-radius match hero; compact period chips; 12px-radius white event card and outlined add action. Sample score/name/timeline values are not client facts.
- `93:827` — C6.1 Add Match Event: 88px soft header; capability-backed chip group; white 12px-radius form card; 48px controls; 52px rounded red submit action. Sample `换人`/`其他` options are not added because the BFF capability enum does not provide them.
- `93:858` — C6.2 save-state overlay: dimmed page and 315px, 20px-radius two-action modal composition. The current BFF does not support the sample's in-progress state, remote autosave, clock or pause/end controls, so C6.2 remains a clear device-local unsent-draft prompt.

### Risks and verification

- Highest risks: authorization-order leaks; event-participant/match-roster mismatch; hardcoded Figma names/types; score/timeline inconsistency; unstable idempotency key; treating non-201 as success; optimistic C6 timeline mutation; non-atomic event/metric write; seed startup overwriting persisted events; accidental use of a shared database.
- Focused verification: domain validation/event creation tests; match-detail authorization/null/roster/timeline tests; append status matrix, idempotent replay/conflict, transaction rollback, and restart readback; C6 normalizer/sort/empty/onShow tests; C6.1 real-option/draft/single-flight/exact-201 tests.
- Package gates from specs: `pnpm --filter @football-club/domain typecheck`, `pnpm --filter @football-club/domain test`, `pnpm --filter @football-club/api typecheck`, `pnpm --filter @football-club/api test`, then the Mini Program package test/type-check commands declared in its `package.json` and root `pnpm check` for the cross-layer final pass.
- Manual acceptance evidence: record database path, coach/event IDs, pre-POST GET, POST status/body, post-return GET, reopened-database GET, and screenshots of C6/C6.1 at the verified 375x812 logical viewport. Never use a screenshot or seeded row as a substitute for the API/restart proof.

## Caveats / Not Found

- The restart-isolation assertions and final runtime visual verification are still pending implementation; neither should be reported as completed early.
- Existing unrelated worktree changes remain user-owned and must be preserved.

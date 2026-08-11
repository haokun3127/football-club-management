# Research: Coach demo persistent data and safe rollout

- Query: Identify the existing CQ Talent seed/rollback/production path and the minimum persistent data still needed to demonstrate coach C1-C16 without frontend fixtures, fake APIs, fake roles, or a public seed endpoint.
- Scope: internal
- Date: 2026-08-11

## Findings

### Existing safe path

- `apps/api/src/seed/index.ts:12` builds normal seed data; the CQ Talent acceptance extension is included only when `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` (`:22-26`, `:43-44`). The acceptance phone is read from the private runtime environment, not committed (`apps/api/src/seed/cq-talent-acceptance.ts:69-76`). API startup uses the configured SQLite file through `PersistentApiStore` (`apps/api/src/index.ts:7-12`); migrations have a separate CLI (`apps/api/src/migrate.ts:1-7`). There is no public seed API.
- The acceptance seed already supplies a dual-role acceptance user, a dedicated demo coach/team, 200 imported students, two guardian-scoped acceptance children, six fixed August demo events, participants, four training sessions, one completed match with two roster rows/two match events, metric records, assessment tasks, FAQs and content. Key definitions are at `apps/api/src/seed/cq-talent-acceptance.ts:69-220`, events at `:221-347`, participants at `:348-445`, training/match records at `:446-532`, and task/content records at `:612-647`.
- Production evidence says the acceptance identity retains exactly two parent-visible children while coach data includes labelled training, match, assessment and tactical-board objects; deployment used a restricted SQLite backup and private runtime variables (`docs/current/production-dual-role-demo-2026-08-11.md:3-12`).
- Rollback is an explicit private CLI requiring both `DATABASE_URL` and `--confirm-cq-talent-acceptance-demo` (`apps/api/src/ops/rollback-cq-talent-acceptance-demo.ts:4-16`). It runs one `BEGIN IMMEDIATE` transaction, deletes the six fixed demo-event graph, demo team/coach/match data and sessions, restores parent-only roles, and rolls back on error (`apps/api/src/ops/cq-talent-acceptance-demo.ts:36-84`). It is not an HTTP route.

### Minimum data still needed

| Pages | Minimum persistent addition | Existing write/read boundary |
| --- | --- | --- |
| C1-C4.2 | Keep the six dated events, but expand the demo team/event roster from two to a realistic 12-16 players by reusing existing imported students as non-primary demo-team members; preserve the acceptance parent's two-child guardian scope. Include varied pending/present/late/absent rows and notes. | Coach home/workbench; attendance uses `saveCoachAttendance` (`apps/miniprogram-cq-talent/utils/api.ts:132-202`) and persistent participant upsert (`apps/api/src/store.ts:2457-2460`). |
| C5/C5.1 | Two completed training cases: one untouched confirmation target and one already-confirmed correction target, with lesson-ledger rows and notes. | Confirmation/correction wrappers are in the lesson API block (`apps/miniprogram-cq-talent/utils/api.ts:176-202`); persistence remains server-side, never page fixture state. |
| C6/C6.1/C6.2 | Retain the completed match as readback evidence; add a match entity and 12-16 player match roster for the upcoming tactical match so add/save can be demonstrated without mutating the baseline completed match. | `getCoachMatchDetail`/`createCoachMatchEvent` (`apps/miniprogram-cq-talent/utils/api.ts:153-175`) write through the match transaction/repository (`apps/api/src/store.ts:2537-2588`). |
| C7 | One fixed, labelled tactical-board baseline for the upcoming match, with a full roster and formation coordinates. Prefer a one-time authenticated BFF write/readback over a new seed route. | `saveCoachTacticalBoard` (`apps/miniprogram-cq-talent/utils/api.ts:278-293`) -> persistent tactical-board repository (`apps/api/src/store.ts:2630-2631`). |
| C8-C10.1 | Full demo-team membership, current/upcoming training, selected training projects, and per-player project coverage with deliberate covered/partial/empty variation. | Team/home/coverage reads plus `saveCoachTrainingProjects` (`apps/miniprogram-cq-talent/utils/api.ts:262-303`, `:1078-1115`). |
| C11-C15.1 | Keep the current assessment catalog/tasks; attach one in-progress task/template to the enlarged demo team and provide prior metric history for radar/team aggregation. C12.1 autosave is intentionally local draft state and needs no fake backend row; C15.1 is reached after a real submit. | Task/form/team reads and `submitCoachAssessment` (`apps/miniprogram-cq-talent/utils/api.ts:305-313`, `:1123`); assessment writes are transactional (`apps/api/src/store.ts:2525-2533`). |
| C16-C16.4 | Existing dual-role coach profile, team, role capabilities and FAQs are sufficient. C16.2 currently has no API import/write path; if submission must persist, add a private authenticated BFF + repository contract, not a toast-only fake or public endpoint. | Coach home/session/FAQ reads (`apps/miniprogram-cq-talent/utils/api.ts:132`, `:1139`). |

### Deployment, rollback, files, risks, verification

1. Implement only in the existing acceptance seed/ops boundary: primarily `apps/api/src/seed/cq-talent-acceptance.ts`, `apps/api/src/ops/cq-talent-acceptance-demo.ts`, its focused API tests, and the production acceptance record. No mini-program fixture data and no public seed route.
2. Rehearse against a copy of the production SQLite database. Before production, stop concurrent writers, back up the named volume's database plus WAL/SHM into the restricted backup area, verify the backup, migrate, then start exactly one API instance with the opt-in seed and private phone variable. Verify fixed-ID counts, parent children remain exactly two, coach roster/events/tasks, and write/readback for attendance, lesson correction, match event, assessment and tactical board. Redeploy with the seed flag disabled after the one-time insertion so later restarts cannot reapply the acceptance extension.
3. Extend rollback's fixed-ID manifest and table coverage in the same change. Do not rely on the current targeted rollback alone for emergency recovery: it deletes every metric recorded by the acceptance coach (`apps/api/src/ops/cq-talent-acceptance-demo.ts:58`), so database-backup restore is the authoritative full rollback if that coach has made additional writes.
4. Verification commands: `pnpm check`; `pnpm build`; `DATABASE_URL=<staging-copy> pnpm --filter @football-club/api db:migrate`; start the API against that copy with secrets injected by the runtime; `pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client`; then repeat role/privacy and C1-C16 BFF read/write/readback checks after API restart. Never print environment values or raw account contact fields.

### Files found

- `apps/api/src/seed/index.ts` - opt-in acceptance seed gate.
- `apps/api/src/seed/cq-talent-acceptance.ts` - current 200-player, dual-role, fixed-ID demo graph.
- `apps/api/src/ops/cq-talent-acceptance-demo.ts` - transaction-scoped targeted rollback implementation.
- `apps/api/src/ops/rollback-cq-talent-acceptance-demo.ts` - guarded private rollback CLI.
- `apps/api/src/index.ts`, `apps/api/src/migrate.ts` - persistent SQLite startup and migration entrypoints.
- `apps/miniprogram-cq-talent/utils/api.ts` - coach BFF read/write client boundary used by C1-C16.
- `docs/current/production-dual-role-demo-2026-08-11.md` - production backup, rollout and privacy evidence.

### Related specs

- `.trellis/spec/api/backend/database-guidelines.md` - repository scoping, seed upsert rules, and insert-if-absent attendance protection.
- `.trellis/spec/api/backend/app-client-bff-contracts.md` - role authority, coach workbench, privacy, attendance and persistence contracts.
- `.trellis/spec/api/backend/active-role-sessions.md` - durable dual-role session contract.

### External references

- None. This conclusion is based on repository code/specs and the checked-in production acceptance record; no production secret or live private API was queried.

## Caveats / Not Found

- The existing rollback covers only the present six-event graph and must be extended atomically with any new fixed IDs/tables.
- C16.2 has no observed persistent client write boundary; implementation must either keep it display-only or add a properly authenticated private contract.
- No live production database was inspected, so exact current row counts beyond the checked-in production evidence remain to be revalidated during the guarded deployment rehearsal.

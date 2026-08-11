# Coach demo data coverage — 2026-08-12

## Evidence boundary

The listed records are API-backed acceptance/demo records, not mini-program
fixtures. They are valid for an isolated, explicitly named non-production
SQLite database that starts with both:

```text
NODE_ENV=development
FCM_CQ_TALENT_ACCEPTANCE_SEED=1
```

The seed is deliberately suppressed when `NODE_ENV=production`, including
when the flag is set. A production or shared database must not be targeted by
this startup path.

Focused evidence was run on 2026-08-12:

```text
npx.cmd --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/cq-talent-fixtures.test.ts test/server.test.ts
```

Result: 2 files, 59 tests passed. The server regression uses file-backed
SQLite and covers real login/session role selection, guardian redaction,
attendance write/readback, assessment writes, tactical-board save/readback,
and restart.

## Available records

| Coach capability/pages | Backend-backed data now available | Evidence status |
| --- | --- | --- |
| C1 schedule, C2 workbench | Six deterministic team events: three completed training sessions, one completed match, one scheduled training session, and one scheduled tactical match. | Data-ready; C1/C2 prior captures exist, but a fresh authenticated capture is still required for a current visual pass. |
| C4 attendance, C4.1 success, C4.2 correction | Sixteen event participants. Completed training includes present, late, absent, leave-requested, and excused states; scheduled training uses confirmed RSVP records for real coach input. | Data-ready; write/readback covered by the server suite. |
| C5 lesson confirmation/correction | The same sixteen roster members have real lesson balances. The scheduled training can produce an actual lesson-ledger write, then correction via its authenticated route. | Data-ready; still needs an interactive workflow capture for each success/correction state. |
| C6 match and event entry | One completed friendly match with a 3:2 score, sixteen roster records, one goal, one assist, one yellow card, one save, and player notes. | Data-ready; the existing idempotent create/readback regression is retained. |
| C7 tactical board | Scheduled tactical-match event plus the same sixteen-player roster and formation API. | Data-ready; save/restart/readback is covered by the server suite. |
| C8 training, C10 content select, C10.1 coverage | Three completed training sessions, one scheduled training session, selected session plan/training projects, and the real project tree. | Data-ready; C10.1 remains a read-only projection and must not invent missing coverage. |
| C9 team, C13 student radar, C14 team ability | One demo team with sixteen existing synthetic club students; each has eight evaluation metric records recorded by the acceptance coach. | Data-ready; the extra fourteen students have no guardian binding. |
| C11 task list, C12 score entry, C15 assessment states | Existing assessment catalog, active assessment tasks, template forms, historic metric records, and authenticated assessment submission. C12.1 is intentionally a device-local draft state, not a server record. | Data-ready for API pages; autosave must be captured from a real local draft. |
| C16 profile/account/help | Real dual-role membership, coach profile/team data, venue/content/FAQ records. | Data-ready. C16.1 permissions and C16.2 private-interest stay explicitly local/display-only until an authenticated server contract is introduced. |

## Privacy and persistence checks

- Coach roster: 16 students.
- Parent scope: exactly the original two guardian-bound students; no extra
  guardian bindings are added for the coach demo roster.
- Metrics: 8 acceptance-coach evaluation values per roster member.
- Match and tactical records are fixed-ID, insert-if-absent records; user
  writes continue through their normal authenticated APIs.
- The rollback tool is explicit and confirmation-gated, but it must only be
  run after the target database path has been verified as an acceptance
  database.

## Current capture blocker

The DevTools screenshot channel has been proven to write a genuine 375x812
PNG, but the active simulator route is the real login page. It has not yet
been authenticated as a coach in this audit. Therefore no coach screen in
this task is labelled visually accepted merely because its data is ready.

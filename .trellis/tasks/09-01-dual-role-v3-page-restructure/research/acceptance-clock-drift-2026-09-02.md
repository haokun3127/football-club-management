# Acceptance fixture clock drift — 2026-09-02

## Symptom

The API gate test `apps/api/test/server.test.ts` failed at line 1579:

- expected `coachTeam.stats.completedTrainingCount` to be `3`
- received `2`

The failure reproduced with the current clock on **September 2, 2026**.

## Root cause

The acceptance fixture intentionally contains three completed training events:

- August 3, 2026 — 控球协调训练
- August 6, 2026 — 传接射门训练
- August 10, 2026 — 训练复盘

`/coach/team` obtains the scoped team events through `collectCoachScope()`, whose rolling window is the current date plus the preceding 29 days. On September 2, the August 3 event is outside that window, so the endpoint correctly counted only two completed training events. SQLite persistence and team filtering were not dropping a row.

## Fix

The test now uses Vitest fake timers with only `Date` mocked to `2026-08-13T12:00:00.000Z`:

```ts
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-08-13T12:00:00.000Z"));
```

Only `Date` is mocked. Real timers remain available because freezing all timers caused the Fastify/SQLite test cleanup to hang.

## Verification

- Targeted acceptance test: passed.
- Full `pnpm run check`: passed.
  - domain: 21/21
  - mini-program: 448/448
  - API: 123/123

## Prevention

Historical acceptance fixtures that assert rolling date-window behavior must freeze the clock inside the fixture's intended demonstration window. Production code must continue to derive its date window from the real current date; do not move fixture dates into production logic or weaken a correct count assertion.

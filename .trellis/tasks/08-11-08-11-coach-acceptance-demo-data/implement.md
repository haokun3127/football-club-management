# Execution plan: Coach acceptance demo data coverage

1. Add a failing fixture expectation for a shared eight-student acceptance
   roster while retaining the two-child parent identity expectation.
2. Introduce one seed-owned roster selector and use it for the team, six event
   participant sets, completed-match roster/notes, and acceptance-coach metric
   records. Preserve the existing fixed event IDs and guardian bindings.
3. Extend the server restart/role-switch regression to confirm the parent sees
   two children while the coach tactical-board payload exposes eight players.
4. Extend the explicit rollback narrowly for every newly persisted demo row,
   then prove foreign/peer data is not affected.
5. Run the focused fixture/server tests, API typecheck/build, root check and
   `git diff --check`.
6. Record the exact coverage and non-visual acceptance boundary in progress,
   then commit only this batch.

Validation:

```text
npx.cmd --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/cq-talent-fixtures.test.ts test/server.test.ts
npx.cmd --yes pnpm@10.33.0 --filter @football-club/api typecheck
npx.cmd --yes pnpm@10.33.0 --filter @football-club/api build
npx.cmd --yes pnpm@10.33.0 run check
git diff --check
```

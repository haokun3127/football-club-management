# Implementation and commit sequence

1. Commit planning artifacts; implementation and small commits authorized.
2. Add migration/repository/transaction serialization; persistence and restart tests.
3. Add task draft service, scoped APIs and progress; project/revision/legacy tests.
4. Add publication, rollback and correction history; full graph and isolation tests.
5. Fix score normalization and publication history grouping; consistency tests.
6. Integrate mini-program save/publish/history with existing layouts; controller tests and runtime verification.
7. Full checks, durable specs, scoped diff/commit, record outcome. Archive only when acceptance is complete.

## Checks
- Domain/API TypeScript and Vitest at package roots.
- Mini-program TypeScript and business controller tests; report existing screenshot helper failures separately.
- New tests: DB reopen, stale revision, duplicate/no-op, bad input, date/role/team scopes, disabled/adopted tasks, incremental/full equivalence, partial publication batch, correction visibility.
- Full pnpm check and git diff --check. Do not silently waive baseline defects.
- Temporary DBs/screenshots outside repo; no production writes.

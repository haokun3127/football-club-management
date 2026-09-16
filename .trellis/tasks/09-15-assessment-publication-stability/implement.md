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
- Temporary DBs/screenshots outside repo; production changes only under explicit release authorization below.

## Formal release work — authorized 2026-09-16

- [x] Verify the committed mini-program in the working native runtime with an isolated local API: project save/reopen, publication, shared scores and correction/history.
- [x] Fix observed defects in small commits; run relevant tests and final frozen-lockfile/check/build/migration smoke against the release tree.
- [ ] Verify GitHub repository/default branch/remote divergence and push reviewed commits through the repository's release process.
- [x] Inspect live compose/image/storage/proxy and rollout flags without exposing credentials; prepare restricted consistent DB backup and verify restore/migrations before cutover.
- [x] Deploy an immutable revision-tagged API image, verify health and compatibility, retain rollback artifacts. Keep workflow allowlist off until matching mini-program is accepted.
- [ ] Compile/preview/upload the matching mini-program; verify platform release/review requirements and advance as authorization/account capabilities permit.
- [ ] Record exact versions, checks, release URLs, rollback steps and any platform dependency. Archive only after applicable acceptance is complete.

2026-09-16: Native workflow passed, clean mini-program `0.1.0-20260916` uploaded, API `b050391` deployed and checked. Default Compose pinned; restricted backup and image rollback retained. Upload is complete; platform public release and GitHub write access remain pending. See `release.md` for evidence and precise remaining gates.

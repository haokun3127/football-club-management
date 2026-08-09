# Execution plan

1. Read the task PRD/design plus API and Mini Program scoped specs. Record the existing `server.test.ts` dirty hunk and do not edit it except an explicitly isolated compatibility hunk.
2. Write failing focused API tests for authentication, membership, delta, actor rejection, idempotency replay/conflict, and persistence across a reopened SQLite store.
3. Implement the minimum route/schema contract and update the app-client BFF contract spec.
4. Write failing Mini Program tests for explicit idempotency headers, actor-free request body, dual-read intersection, stable retry keys, and partial-save readback.
5. Implement the request/API helper and page-local view model, then align C5.1 presentation to the authoritative node without sample anomaly data.
6. Run focused API and Mini Program tests, package typechecks/build, full repository check, task validation, and `git diff --check`.
7. Stage only the allowlisted paths. Use `git add -p` for `apps/api/test/server.test.ts`, verify cached and unstaged diffs separately, then make one standalone commit and archive the task.

## Execution record (2026-08-10)

- RED: the new API correction regression failed on the old route because a missing `Idempotency-Key` was accepted and a server without a membership resolver accepted a write. The new Mini Program regressions also failed before implementation: an explicit idempotency key was dropped, the helper sent `actorUserId`, and the page did not guard missing ids, dual-read intersection, zero selection, or partial-save reread.
- GREEN: `pnpm.cmd --filter @football-club/api exec vitest run test/lesson-correction.test.ts` passed (1 file, 3 tests). The regression covers required keys, bounded deltas, actor rejection, roster membership, coach/parent access, replay/conflict, reopened SQLite replay, and missing resolver rejection.
- GREEN: `pnpm.cmd --filter @football-club/miniprogram-cq-talent exec vitest run utils/request.test.mjs utils/api.test.mjs pages/coach/lesson-correction/index.test.mjs` passed (3 files, 10 tests). The page reads truthful intersections only, writes serially, retains same-payload keys, rereads after partial or unknown outcomes, and never navigates on failure.
- Package checks: API typecheck and build passed; Mini Program typecheck passed; Mini Program package test passed (31 files, 144 tests). Full API test reached 70 passing tests; its sole remaining failure is the pre-existing user-dirty attendance persistence test timeout at `apps/api/test/persistence.test.ts:13`, not a C5.1 assertion.
- Contract and task validation passed. The C5.1 client has no trusted visual screenshot evidence, so this execution record does not claim visual acceptance.
- Per the current instruction, do not stage, commit, deploy, or archive this task.

## File allowlist

- `apps/api/src/routes/app-client.routes.ts`
- `apps/api/src/http/schemas.ts`
- `apps/api/test/lesson-correction.test.ts`
- `apps/api/test/server.test.ts` (only a compatible C5.1 hunk, if needed)
- `apps/miniprogram-cq-talent/utils/request.ts`
- `apps/miniprogram-cq-talent/utils/request.test.mjs`
- `apps/miniprogram-cq-talent/utils/api.ts`
- `apps/miniprogram-cq-talent/utils/api.test.mjs`
- `apps/miniprogram-cq-talent/pages/coach/lesson-correction/index.{ts,wxml,wxss,test.mjs}`
- `.trellis/spec/api/backend/app-client-bff-contracts.md`
- `.trellis/tasks/08-10-coach-lesson-correction-idempotency/**`

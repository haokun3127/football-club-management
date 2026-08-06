# Implement: Restart-safe parent phone binding

1. Read API persistence specs and existing seed/repository behavior.
2. Add a focused RED file-SQLite regression in `apps/api/test/persistence.test.ts`: mutate the seeded acceptance user's and parent profile's phones, close, reopen with `seed:true`, and assert the old code restores seed phones.
3. In `apps/api/src/persistence/platform-persistence.ts`, seed users/parents through a local preservation helper that keeps an existing stored phone; do not alter repository-wide update semantics.
4. Run the RED test, implement the smallest behavior, then run GREEN plus related API tests, typecheck, build, and diff check.
5. Commit only `platform-persistence.ts`, `persistence.test.ts`, and this task/spec documentation from the isolated branch.
6. Deploy the built hotfix independently; verify health and restart behavior.
7. Back up the production SQLite volume privately. In one transaction, preflight and update only the two approved phone fields. Confirm one-row changes and restart readback.
8. Ask the user to complete actual WeChat phone authorization; verify the returned role is parent and the session has two children without logging the token.

## Allowed code files

- `apps/api/src/persistence/platform-persistence.ts`
- `apps/api/test/persistence.test.ts`

## Stop conditions

- Any preflight mismatch, duplicate phone, inactive membership, missing target IDs, non-green focused checks, deployment health failure, or failed restart readback stops before production data update.

## Verification record (2026-08-06)

- RED reproduced on the old implementation: the file-SQLite close/reopen test read the seeded synthetic phone instead of the manually saved phone.
- GREEN: focused API persistence test passed, 9/9; API typecheck, API build, and `git diff --check` passed.
- API full test: 67/67 passed.
- Full workspace `pnpm check`: typecheck passed; API and domain tests passed; mini-program tests had 31 passing tests and one unrelated load-time failure in `apps/miniprogram-cq-talent/scripts/devtools-screenshot.test.mjs` (`SyntaxError: Invalid or unexpected token`, 0 tests collected).
- Historical fixture failures named in the project handoff were not reproduced on this baseline: `apps/api/test/server.test.ts:688` and `apps/api/test/server.test.ts:1344` did not fail in the API full run. This is recorded as “not reproduced”, not as an unqualified existing failure.

## Production record (2026-08-06)

- Deployed isolated commit `9720b40`, verified `/health`, then created a private SQLite snapshot before the binding transaction.
- Production preflight confirmed that the authorized target phone had no owner in either phone column; the fixed acceptance user/profile and active parent membership matched the approved contract.
- One transaction updated exactly one user row and one parent-profile row. Post-restart readback retained the same masked phone mapping and active parent membership.
- Remaining acceptance: the owner must complete a real WeChat phone authorization and confirm the parent flow returns the existing two children. No fabricated session or role may be used.

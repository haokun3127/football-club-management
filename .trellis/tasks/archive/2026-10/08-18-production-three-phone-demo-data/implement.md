# Implementation plan: seven phone-bound dual-role demo accounts

1. Extend the secure account manifest and private environment reader from three to seven fixed slots while preserving slots 1–3 IDs and adding deterministic slots 4–7.
2. Change confirmed import to accept a complete existing 1–3 installation plus missing 4–7 rows, reject incompatible partial rows, and remain idempotent.
3. Add a transaction-scoped, idempotent demo-data expander that creates the eight-player coach roster, dynamic calendar/attendance data, assessments/metrics, match events, tactical board, and parent support records for every slot.
4. Extend the rollback manifest and namespace validation to cover the seven slots, eight students per slot, all demo events, and all side effects; add tests for unrelated-row preservation.
5. Run focused API tests, API typecheck/build, root check, and `git diff --check`; stage only task-owned source/tests/docs paths and commit this local batch.
6. On the production host, make a restricted SQLite backup including WAL/SHM, run the seven-phone dry-run, set the short-lived backup attestation, run confirmed import, restart only `cq-talent-api`, and verify health.
7. Create temporary parent and coach sessions through the existing controlled verification path, read back bounded role-scoped payload counts, remove/revoke temporary sessions if the existing runbook supports it, and provide the real-device login/role-switch checklist.

Required local commands:

```text
npx --yes pnpm@10.33.0 --filter @football-club/api exec vitest run test/secure-cq-talent-test-accounts.test.ts
npx --yes pnpm@10.33.0 --filter @football-club/api typecheck
npx --yes pnpm@10.33.0 --filter @football-club/api build
npx --yes pnpm@10.33.0 run check
git diff --check
```

Production constraints:

- Phone values are supplied only through the seven private `SECURE_CQ_TALENT_TEST_PHONE_N` variables.
- Do not place the values in scripts, `.env` files, shell history, logs, screenshots, task files, or commits.
- Do not use `git add -A`, reset/checkout destructive commands, or modify unrelated dirty files.

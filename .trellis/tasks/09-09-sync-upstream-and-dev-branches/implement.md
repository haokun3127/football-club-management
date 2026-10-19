# Implementation Plan

1. Reconfirm clean status and record the pre-migration branch/SHA.
2. Add `origin` with the specified GitHub URL.
3. Fetch all branches and tags with prune enabled.
4. Verify `origin/dev` contains the pre-migration HEAD.
5. Create/reset local `dev` to `origin/dev`, set upstream, and switch to it.
6. Update Trellis task metadata so both task branch and base branch are `dev`.
7. Inspect upstream project instructions and package scripts now supplied by `dev`.
8. Install dependencies from the authoritative lockfile if required.
9. Build the authoritative WeChat mini-program and open it with the local WeChat Developer Tools CLI.
10. Run the repository's primary quality gate and relevant tests.
11. Verify final remote URLs, branch/upstream, SHA parity, ahead/behind counts, and worktree status.
12. Record validation results, finish the Trellis task, and commit only task metadata if it is not already part of the fetched authority state.

## Validation Commands

```bash
git remote -v
git branch -vv
git rev-parse dev origin/dev
git rev-list --left-right --count dev...origin/dev
pnpm install --frozen-lockfile
pnpm check
```

Additional test commands will be selected from the fetched `package.json` scripts after the branch switch.

## Rollback Points

- Before branch replacement, `codex/chongqing-talent-business` remains at `8cbb295`.
- No force push or branch deletion is allowed.
- If the authoritative upstream quality gate fails, keep the exact upstream code and report the failure rather than introducing compatibility changes outside the request.

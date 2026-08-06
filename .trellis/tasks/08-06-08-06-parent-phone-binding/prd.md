# Restart-safe parent phone binding

## Goal

Preserve existing production phone bindings across API seed restarts, then bind the authorized target phone (provided out of band) to the existing two-child acceptance parent with transactional production verification.

## Requirements

- Preserve an existing user/account phone when startup seed replays; do not alter normal repository update semantics.
- Keep the acceptance seed enabled because parent-child bindings currently live in the runtime seed data.
- Bind only the authorized target phone, supplied out of band, to the existing two-child parent `user-parent-cq-talent-acceptance` / `parent-cq-talent-acceptance` after deployment.
- Production data update is limited to the two phone fields in one SQLite transaction, with preflight uniqueness and active-membership checks.
- Do not create users, sessions, roles, memberships, child bindings, or test identities.
- Do not modify mini-program UI, login flow, Figma, migrations, or unrelated dirty workspace work.

## Acceptance Criteria

- [ ] RED: a file SQLite test proves that a manually changed existing acceptance-parent phone is overwritten after a `seed:true` reopen.
- [ ] GREEN: after the seed fix and same-path reopen, existing non-seed phones in `user_accounts` and `parent_profiles` remain unchanged while the acceptance seed still exposes two children.
- [ ] API focused tests, typecheck, build, and `git diff --check` pass.
- [ ] Only the approved hotfix files are committed and deployed from the isolated branch.
- [ ] Production preflight confirms the target phone is unowned, target user/profile exist, and active parent membership remains intact.
- [ ] A single production SQLite transaction updates exactly one `user_accounts` row and one `parent_profiles` row; restart readback retains the masked phone mapping.
- [ ] A real WeChat authorization afterwards returns authenticated parent with two children. No token is printed or stored in repository files.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

# Coach C16.1 Figma restoration

## Goal

Restore C16.1 Permission Scope geometry against online Figma zZ6wKyOHKcO4UYXDd9jGwv node 93:1210 while retaining read-only client capability projection and no fabricated permission mutations.

## Requirements

- Visual authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1210 / C16.1 Permission
  Scope`.
- Keep permissions read-only and derived solely from the authenticated coach's
  client entrypoints; no Figma sample permissions, toggles, or save request may
  become a fabricated mutation.
- Correct source-confirmed geometry only: the 176rpx custom header must use
  `content-box` with `navInset`; the explanation card, permission rows, and
  non-interactive administrator notice must match the Figma size, spacing, and
  colors where those do not change data semantics.
- The administrator notice remains non-interactive because the current API has
  no write contract.

## Acceptance Criteria

- [x] Focused C16.1 geometry regressions fail against the existing styles and
  pass after the minimal Figma alignment.
- [x] Existing client-capability projection and non-interactive safety
  guarantees remain unchanged.
- [x] Focused test, mini-program typecheck, `git diff --check`, and the full
  repository check pass before the scoped commit.

## Verification evidence

- Online Figma design context reread: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1210`.
- The focused C16.1 geometry test failed against the old header/card/row
  styles and passed after the bounded alignment.
- Static checks passed: C16.1 Vitest 4/4, mini-program typecheck,
  `git diff --check`, and the full repository check (domain 19/19,
  mini-program 326/326, API 104/104).
- Permission data remains read-only from `client.roleEntrypoints.coach`; no
  non-existent mutation request or Figma sample permission was added.
- The user waived a fresh runtime screenshot; no source/test conclusion is
  represented as pixel-level runtime acceptance.

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

# Coach C16 Figma restoration

## Goal

Audit and minimally restore C16 Coach Me against online Figma zZ6wKyOHKcO4UYXDd9jGwv node 93:1182; preserve server-confirmed dual-role switch and real session/logout boundaries.

## Requirements

- Visual authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1182 / C16 Coach Me`.
- The C16 header receives `padding-top: {{navInset}}px`; its fixed 176rpx
  Figma content height requires `box-sizing: content-box`.
- Preserve the server-confirmed dual-role condition: show the parent switch
  only when the authenticated coach has the `parent` role available.
- Preserve coach-home reads, settings navigation, and one-confirmation logout.
- Do not copy the Figma-only coach name, team name, role, or statistics into
  product data.

## Acceptance Criteria

- [x] The C16 layout regression first fails for the `border-box` safe-area
  case and then passes for `content-box`.
- [x] The online-Figma header geometry and existing real-session contracts
  remain intact.
- [x] Focused test, mini-program typecheck, `git diff --check`, and the full
  repository check pass before the scoped commit.

## Verification evidence

- Online Figma design context reread: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1182`.
- The focused C16 test failed against the old `border-box` header, then passed
  after the single `content-box` correction.
- Static checks passed: C16 Vitest 9/9, mini-program typecheck,
  `git diff --check`, and the full repository check (domain 19/19,
  mini-program 326/326, API 104/104).
- The user waived a fresh runtime screenshot; no source/test conclusion is
  represented as a new pixel-level runtime acceptance.

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

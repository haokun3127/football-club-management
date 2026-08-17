# Coach C15.1 Figma restoration

## Goal

Audit and minimally restore C15.1 Assessment Submit against online Figma zZ6wKyOHKcO4UYXDd9jGwv node 93:1163; preserve valid coach route input and real result navigation.

## Requirements

- Visual authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1163 / C15.1 Assessment
  Submit`.
- The C15.1 WXML injects `padding-top: {{navInset}}px`; its 176rpx custom
  header must use `box-sizing: content-box`, preserving the online Figma
  88px content height.
- Preserve the route-validated task title and positive submitted count, the
  team-ability results navigation, and back-to-list behaviour.
- Do not add Figma-only sample facts (`处理中`, `24小时`, `18名`) without a
  backend/API contract.
- The user waived a new runtime screenshot for this batch; distinguish source
  and test evidence from runtime pixel acceptance.

## Acceptance Criteria

- [x] The focused C15.1 test first fails for the border-box safe-area
  regression and then passes for the content-box correction.
- [x] The online-Figma header/content geometry and current real navigation
  contracts remain intact.
- [x] Focused test, mini-program typecheck, `git diff --check`, and the full
  repository check pass before the scoped commit.

## Verification evidence

- Online Figma design context reread: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1163`.
- C15.1's focused suite failed with `box-sizing: border-box`, then passed with
  the focused `content-box` header correction.
- Static checks passed: C15.1 Vitest 4/4, mini-program typecheck,
  `git diff --check`, and the full repository check (domain 19/19,
  mini-program 326/326, API 104/104).
- The user waived a fresh runtime screenshot; no source/test conclusion is
  described as pixel-level runtime acceptance.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

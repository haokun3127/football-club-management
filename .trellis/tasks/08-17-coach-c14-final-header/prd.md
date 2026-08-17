# Coach C14 safe-area header final correction

## Goal

Correct the C14 Team Ability Overview custom header so its Figma 88px content
height remains intact after WeChat applies the runtime status-bar inset.

## Requirements

- Visual authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`.
- Root cause: `pages/coach/team-ability/index.wxss` uses `box-sizing: border-box`
  while `index.wxml` adds `padding-top: {{navInset}}px`; the padding consumes
  the intended 176rpx (88px) design height on devices with a real inset.
- Change only C14's page CSS, focused regression, task records and progress
  documentation. Keep the existing real team-ability reads, radar view model,
  export-unavailable control and coach tab bar untouched.
- Use the same `height: 176rpx` plus `box-sizing: content-box` custom-nav
  pattern already verified on C13/C12.
- The user has waived a new runtime screenshot as a completion prerequisite;
  record static/test evidence separately and do not misrepresent it as a new
  pixel-level runtime capture.

## Acceptance Criteria

- [x] The focused C14 regression first fails for the border-box safe-area
  regression and then passes for the content-box header.
- [x] C14 retains its online-Figma 88px soft-pink header geometry and all
  existing real-data/API contracts.
- [x] Focused test, mini-program typecheck, `git diff --check` and the full
  repository check pass before the scoped commit.

## Verification evidence

- Online design context reread before implementation: Figma
  `zZ6wKyOHKcO4UYXDd9jGwv / 93:1106`; its header is 375×88px with the
  `#fceeef` fill.
- Regression evidence: the focused five-test suite first failed while
  `.ability-nav` was `box-sizing: border-box`, then passed after the focused
  `content-box` correction.
- Static checks: mini-program typecheck, `git diff --check`, and the full
  repository check passed (domain 19/19, mini-program 326/326, API 104/104).
- Runtime boundary: the user waived a fresh device/DevTools screenshot for
  this batch. The recorded result is Figma/source/test verification, not a
  new pixel-level runtime screenshot acceptance.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

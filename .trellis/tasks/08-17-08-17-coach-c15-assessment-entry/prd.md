# Coach C15 Figma restoration

## Goal

Restore the C15 Assessment Entry page against the online Figma source without
changing the real assessment-form API, interactive slider input, local draft
storage, or submit/redirect contract.

## Requirements

- Visual authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15 Assessment Entry`.
- The page injects the runtime status-bar inset through WXML
  `padding-top: {{navInset}}px`; its fixed `176rpx` header must therefore use
  `box-sizing: content-box`, preserving the Figma 88px content height.
- Keep the existing real template fields, real team members, real slider
  ranges, local draft key, and assessment submission API unchanged.
- Keep the 44rpx page-side content grid and the existing role tab bar.
- The user has waived a fresh runtime screenshot for this batch; report static
  and test evidence separately from pixel-level runtime acceptance.

## Acceptance Criteria

- [x] The focused C15 regression first fails for the border-box safe-area
  regression and then passes for the content-box header.
- [x] C15 retains the online-Figma header/content geometry and real-data
  contracts without sample names, scores, or fabricated API fields.
- [x] Focused test, mini-program typecheck, `git diff --check`, and the full
  repository check pass before the scoped commit.

## Verification evidence

- Online Figma was reread from `zZ6wKyOHKcO4UYXDd9jGwv / 93:1132`; the
  historic `93:1135` identifier is absent from the live file and was not used
  as a fallback.
- The focused C15 suite first failed on the `border-box` header and passed
  after the single `content-box` correction.
- Static checks passed: C15 Vitest 8/8, mini-program typecheck,
  `git diff --check`, and the full repository check (domain 19/19,
  mini-program 326/326, API 104/104).
- The user waived a fresh runtime screenshot for this batch; this is
  Figma/source/test evidence rather than a new pixel-level runtime capture.

## Goal

Audit and minimally restore C15 Assessment Entry against online Figma zZ6wKyOHKcO4UYXDd9jGwv node 93:1132; preserve real assessment API, local draft, and interactive slider contracts.

## Requirements

- TBD

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

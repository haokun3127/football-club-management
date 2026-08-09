# Align C9 team detail to Figma

## Goal

Implement C9 Team Detail (`93:924`) from Figma file `zZ6wKyOHKcO4UYXDd9jGwv` using the existing real coach-team BFF. This is a page-local alignment task only.

## Requirements

- Route: `/pages/coach/team/index`.
- Read the existing coach-team response and render only team name/season, scoped near-30-day training, attendance, members, and member IDs. Null attendance is `--`; null team shows no fabricated team or members; a team with no members keeps the real Hero and shows an empty member state. API errors use a fixed safe message, never the original error text.
- Correct the statistics label to `近30天训练`; it must not call the API aggregate cumulative training.
- Use a page-local 88px pink back bar, a true coach `training` role tab bar, and API-backed member navigation to student radar.
- Do not render Figma's coach-group, sample avatars, roles, ranks, names, club/season, metrics, or fixed counts because no existing contract supplies them.
- Register only components actually rendered and use TypeScript-precomputed view data with no WXML helper calls.
- Do not modify shared components, API helpers/types, backend files, app configuration, or protected in-flight work.

## Acceptance Criteria

- [x] Real team data maps to the hero, season, statistics, and member rows; null/empty/error/non-coach states are safe and truthful.
- [x] The page uses `training` tab state, an API-backed radar link, the pink back bar, and no legacy app header registration.
- [x] No Figma sample coach group, names, values, or unsupported facts appear in the template.
- [x] Focused page test, package test/typecheck, and diff check pass.
- [ ] Device screenshot comparison is non-blocking under the current all-pages goal and is not claimed as complete.

## Notes

- Figma: `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-924`.
- Reuse the existing faithful `chevron-left.svg`; the local pink navigation is `176rpx` with `box-sizing: border-box`.
- Verification evidence (2026-08-10): the focused C9 test first failed 5/5 on the legacy page, then passed 5/5 after the page-local projection. Mini Program package tests passed 158/158 across 34 files; typecheck passed. No asset was added. Device screenshot comparison remains unperformed and non-blocking.

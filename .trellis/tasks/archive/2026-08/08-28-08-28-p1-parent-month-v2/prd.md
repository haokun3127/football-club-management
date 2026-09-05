# P1 parent month schedule V2

## Goal

Synchronize the parent schedule home page with the current online Figma month-calendar design `521:339`, while keeping all events and summary values sourced from the authenticated parent API.

## Requirements

- Replace the visible week strip with a month calendar card showing Monday–Sunday columns.
- Render leading/trailing days, current-month state, today state, selected-date state, and real training/match markers from loaded events.
- Keep the existing dark upcoming-activity hero, reminder bell, activity cards, empty state, and parent TabBar behavior.
- Month navigation must move one month at a time and reload the corresponding real calendar range.
- Selected-date activity cards must remain filtered by the selected bound child and selected date.
- Keep WXML free of JavaScript method calls; all display flags and labels are precomputed in TypeScript.
- Do not create new API routes, fake events, or fake statistics.

## Figma contract

- File: `zZ6wKyOHKcO4UYXDd9jGwv`
- Node: `521:339` (`P1 Schedule Home — Month V2`)
- Size: `375 × 812`
- Key structure: top navigation, dark hero, `2026年8月` month card, date markers, selected red date, summary chips, activity cards, four-item parent TabBar.

## Acceptance Criteria

- [ ] Month grid is generated from the requested month and starts on Monday.
- [ ] Real events add training/match markers to their date cells without leaking another child’s events.
- [ ] Previous/next month navigation changes the month and reloads data.
- [ ] Focused P1 tests, mini-program typecheck, full repository check, and `git diff --check` pass.
- [ ] A fresh trusted WeChatIDE/DevTools `375×812` screenshot is taken after the user recompiles; no code-only claim is treated as visual acceptance.

## Scope boundary

This batch only changes the parent P1 schedule page and its tests/documentation. It does not alter the API contract, Figma file, other parent pages, or coach pages.

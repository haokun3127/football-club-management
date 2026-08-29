# P4.3 Semester Report Body Design

## Scope

Restore the parent semester report route to the current online Figma board
`zZ6wKyOHKcO4UYXDd9jGwv / 701:177` without changing the API contract or
fabricating sample data.

## Layout

The page keeps the existing full-screen shell, safe-area handling, parent
`role-tabbar`, and retry/error states. The loaded body is rendered in this
order:

1. White period card: truthful period label, 180-day source description, and
   a compact freshness label.
2. Dark current-student card: active student's initial, name, team label, and
   a `当前学员` badge. The card is the active-child affordance; when multiple
   children exist, tapping it opens the existing native action-sheet selection.
3. `能力表现` heading followed by a dark `综合能力` card. It shows the
   normalized average score and up to four valid radar dimensions as progress
   rows. Missing values remain absent or use the explicit empty label.
4. White three-column summary card with completed training count, completed
   match count, and attendance rate.
5. White coach-note card with the API-backed note when present, otherwise
   `暂无教练评语`.

The Figma example values are never used at runtime. The 180-day activity
counts include only non-cancelled, completed events so the labels remain
truthful to `已完成训练` and `已完成比赛`.

## Data flow

`getParentChildren` selects the session child, `getParentGrowth` provides radar
and attendance data, and the existing calendar-range requests provide the
activity counts. `buildSemesterReportView` owns all filtering, normalization,
localized labels, and empty-state decisions so WXML only renders prepared
fields and does not call JavaScript methods.

## Verification

- Focused Vitest coverage for the view model, completed-event filtering,
  section classes/order, and child switching affordance.
- Mini-program TypeScript check.
- WXML/WXSS compilation through the WeChatIDE MCP.
- Fresh 375x812 route screenshot compared to the retained online Figma PNG.

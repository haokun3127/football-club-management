# P1 周日历展开月历改版 — 设计方案

## Source of truth

- Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Parent page: `05 Parent Generated` (`4:6`)
- Historical weekly baseline: `P1 Schedule Home` (`269:250`)
- Historical empty state: `P1 Schedule Home — Empty` (`269:479`)
- Superseded fixed-calendar reference: `P1 Schedule Home — Month V2` (`521:339`)

## Interaction model

The weekly date strip is the home-screen default. A visible down affordance expands the date region into a month grid; it is not a modal. Selection changes the active date, returns the weekly strip to the week containing that date, refreshes the selected-date summary and filters the event list. Month navigation works only while expanded. The compact control retains previous/next week navigation.

## Design states

1. **P1 Schedule Home — Week + Month Picker / Collapsed**: original weekly visual hierarchy, week arrows, seven days, selected state and expand affordance.
2. **P1 Schedule Home — Week + Month Picker / Expanded**: same shell, with the compact week control replaced by a month card with month navigation, weekday headers, activity markers, selected day and collapse affordance.
3. **P1 Schedule Home — Week + Month Picker / Empty**: compact weekly state retained with a stable empty event area.

## Code impact

`pages/parent/schedule/index.ts` gains explicit picker visibility plus week-window navigation/state derivation. The WXML conditionally renders precomputed compact-week and month-grid data. Existing fixed-month tests are replaced by behavior-driven tests for both states.

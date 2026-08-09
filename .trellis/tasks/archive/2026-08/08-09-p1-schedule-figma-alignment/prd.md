# Align P1 Schedule Home to Figma

## Goal

Align the Parent Schedule Home custom top navigation and weekly date strip with the current online Figma P1 Schedule Home while preserving its real calendar, reminder, and event-navigation behavior.

## Design source

- `zZ6wKyOHKcO4UYXDd9jGwv / 269:250 / P1 Schedule Home`
- Companion state: `zZ6wKyOHKcO4UYXDd9jGwv / 269:479 / P1 Schedule Home — Empty`

## Confirmed facts

- Figma defines a 375x812 page with an 88px top navigation and a 56px week strip; the week order is Monday through Sunday.
- `pages/parent/schedule/index.wxss` retains a `height: 176rpx; box-sizing: border-box` custom-navigation shape, which conflicts with the project standard for dynamically inset navigation and has been identified as a visual drift risk.
- The page already uses real parent calendar/reminder APIs and registered detail routes. This batch must not change those contracts.

## Requirements

- Use the Figma context above before editing.
- Correct only P1 header/week-strip presentation and any directly required presentation-view logic.
- Keep dynamic menu-capsule avoidance, reminder navigation, selected-day navigation, real event routing, and empty-state behavior intact.
- Do not change API/persistence contracts, create mock data, or touch unrelated dirty files.
- Keep WXML free of JavaScript collection/string method calls.

## Acceptance criteria

- [x] Header follows the project custom-nav invariant: 88rpx base height, `box-sizing: content-box`, and menu inset remains applied inline.
- [x] Week strip preserves Figma's Monday-to-Sunday presentation and selected-day treatment without breaking real date selection.
- [x] Focused P1 tests demonstrate the repaired nav/week-strip contract before and after implementation.
- [x] Mini-program test and typecheck pass, and `git diff --check` is clean.

## Out of scope

- No device-screenshot gate for this user-approved goal mode.
- No API, database, login, asset, or unrelated page work in this batch.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

## Validation record

- RED: the focused P1 test failed on the old `176rpx`/`border-box` nav rule and the missing Monday-to-Sunday presenter export.
- GREEN: focused P1 test passed 12/12; mini-program package test passed 56/56; mini-program typecheck passed.
- Root `npx.cmd --yes pnpm@10.33.0 run check` was executed. Its typechecks, domain tests (18/18), and mini-program tests (56/56) passed; the existing API persistence test `preserves attendance status and note after reopening a seeded file database` timed out at 5 seconds. This task does not modify that API-owned test or its persistence implementation.

# P1 周日历展开月历改版

## Goal

按用户已确认的最新在线 Figma 改版要求：保留家长日程周条为默认视图，点击或下拉后展开月历用于选择日期；先更新在线 Figma 的新画板，再实现小程序并定向验证。

## Requirements

- Online Figma file `zZ6wKyOHKcO4UYXDd9jGwv` is the sole visual authority. The current verified nodes are parent collapsed/expanded `1008:186` / `1008:436` and coach collapsed/expanded `1293:8` / `1293:34`.
- Do not overwrite or delete the historical `P1 Schedule Home`, `P1 Schedule Home — Empty`, or `P1 Schedule Home — Month V2` frames.
- Create a new 2026-08-28 client-revision P1 design state in Figma before modifying mini-program code.
- The parent collapsed/default state keeps the original seven-day weekly strip. The coach collapsed state follows the current online C1 board: Monday through Saturday plus an independent expand affordance, with Sunday available from the expanded month grid. Both keep reachable prior/next-week navigation.
- The expanded state replaces the compact weekly strip with a month grid. Selecting a date updates the selected-date summary and the event list; the picker can collapse back to the weekly strip.
- The empty state preserves the date control and a stable event-area height so content below the date control does not jump when the selected day has no events.
- WXML must not invoke JavaScript array/string methods in templates. Compute every display field in the TypeScript view model.
- Preserve unrelated working-tree changes and use path-limited staging only.

## Acceptance Criteria

- [ ] Figma contains a new, clearly named P1 collapsed weekly state, expanded monthly-picker state, and empty-data state under the client-revision area.
- [ ] Historical P1 frames remain present and unchanged.
- [ ] The mini-program defaults to the compact weekly strip and can expand/collapse the month picker.
- [ ] Prior/next-week controls and month navigation remain reachable; date selection refreshes the date label and visible events.
- [ ] Empty dates retain a fixed-height content area without shifting the date control.
- [ ] Targeted P1 tests, type/check gate, and `git diff --check` pass before the task commit.
- [ ] Figma screenshot and mini-program screenshot evidence are recorded separately; passing code checks alone is not called visual acceptance.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

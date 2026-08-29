# C1 教练球队全屏选择改版

## Goal

按已确认的甲方要求，教练首页我的球队模块只负责选择后台同步的队伍；新增非弹窗全屏选择页，禁止前台新建、编辑或删除队伍；先更新在线 Figma 再实现小程序。

## Requirements

- Online Figma file `zZ6wKyOHKcO4UYXDd9jGwv` is the sole visual authority.
- C1 keeps one concise “我的球队” card on the coach home page and must not expose create, edit, or delete team controls.
- Clicking the card opens a full-screen C1.1 team-selection page, never a modal or picker popup.
- C1.1 renders only team records returned by the real coach-home API. Selecting a team returns to C1 and updates the active team context for the displayed schedule.
- The Figma update precedes code changes; historical approved frames remain intact.
- Preserve unrelated worktree changes; no API or database changes are in scope for this batch.

## Acceptance Criteria

- [x] Figma contains new client-revision C1 home and C1.1 full-screen team-selection frames with explicit back navigation and no team-management actions.
- [x] C1 shows the chosen real team, and multiple returned teams can be selected through C1.1.
- [x] The selection screen has no add/create/edit/delete controls and no fabricated teams.
- [x] Targeted tests, typecheck, WXML/WXSS compilation, `git diff --check`, and a path-limited commit pass.
- [x] Runtime screenshot evidence, if a real coach session is available, is separately recorded from Figma evidence.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

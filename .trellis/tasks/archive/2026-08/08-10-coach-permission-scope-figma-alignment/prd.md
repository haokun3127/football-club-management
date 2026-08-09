# C16.1 Coach permission scope Figma alignment

## Goal

Align pages/coach/permissions to zZ6wKyOHKcO4UYXDd9jGwv / 93:1210 / C16.1 Permission Scope while displaying only the authenticated coach's configured app-client entrypoint availability.

## Requirements

- Change only the C16.1 page files, its focused test, four direct Figma icon exports, and this task directory.
- Use requireRole("coach") and read only session.capabilities.client.roleEntrypoints.coach. This array indicates available entrypoints, not granular read/write authority.
- Project the fixed, neutral display order calendar, attendance, training, matches, assessment as 日程, 出勤, 训练, 比赛, 能力评估. Ignore home, unknown values, and duplicates.
- With no recognized entrypoint, show an honest empty state. A non-coach must make no request.
- All Figma switches are non-interactive availability markers. Do not add a save action, toggle handler, write API, local override, or fabricated permission.
- The only administrator guidance is static copy: 仅管理员可调整.
- Use a page-owned 176rpx custom top bar, direct Figma assets, and the coach role tabbar. Do not modify app.json, API utilities, store, persistence, project configuration, or protected work in progress.

## Acceptance Criteria

- [x] Fixed mapping, neutral labels, unknown/duplicate/home filtering, and empty state are covered by focused RED-to-GREEN tests.
- [x] Non-coach has zero requests; no WXML switch, row, or administrator copy has bindtap, and no controller write/save code exists.
- [x] The local top bar replaces app-header, uses the four direct Figma exports, and WXML contains no method calls.
- [x] Focused test, miniprogram typecheck, package test, and scoped diff check pass.

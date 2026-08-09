# Coach team ability Figma alignment

## Goal

Align C14 Team Ability Overview to Figma `zZ6wKyOHKcO4UYXDd9jGwv` node `93:1106` using real coach team and ability-overview BFF data.

## Requirements

- Change only C14 page files, its focused test, direct Figma back/trending assets and this task record; reuse the already committed sized radar canvas.
- Render Figma's 176rpx custom header, fixed 520rpx hero and centered 440×360rpx radar; overlay the in-hero real overall score at the radar center.
- Use team response only for team name/season/member context; a team request failure displays “团队信息待同步” while retaining real overview data.
- No N+1 student requests. Missing assessment date, ranking names/details and export API must be transparent unavailable/disabled states, never Figma samples.
- Use TS view models; WXML does not call JS methods. Do not modify API backend, persistence, config, utils or radar component.

## Acceptance Criteria

- [ ] Role guard, one-time overview/team requests, overview empty/failure and team partial failure behave safely; no student N+1 occurs.
- [ ] Invalid/insufficient dimensions do not draw a fabricated radar; values are clamped.
- [ ] Real data drives team, summary and dimensions; unavailable date/ranking/export states are honest.
- [ ] Focused test, package typecheck, full package test and scoped diff check pass.

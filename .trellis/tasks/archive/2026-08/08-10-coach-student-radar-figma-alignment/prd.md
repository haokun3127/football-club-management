# Coach student radar Figma alignment

## Goal

Align C13 Student Radar to Figma `zZ6wKyOHKcO4UYXDd9jGwv` node `93:1080` with real coach-team and student-radar BFF data.

## Requirements

- Change only `pages/coach/student-radar/index.{json,ts,wxml,wxss,index.test.mjs}`, its direct Figma back-arrow asset, plus `apps/miniprogram-cq-talent/utils/api.ts` and `utils/types.ts` solely to preserve optional source `record.occurredAt`. Remove the page-local app-header registration and use the node `93:1080` direct arrow asset.
- Preserve real `occurredAt`; calculate assessment range, normalized score, and clamped dimension widths in TypeScript. WXML must not run JS methods.
- Make rapid student switching safe: a stale response cannot replace the most recently selected student.
- A route student id must be a member of real `getCoachTeam().members`, else select the first real member. An empty team makes no radar request. Both stale success and stale failure must be ignored.
- If `occurredAt` is absent, display “评估时间待同步”; do not infer it from `updatedAt` or Figma. Fewer than three valid dimensions, non-finite scores, or `maxValue <= 0` produce no radar geometry.
- Implement the dark fixed-height hero, student chips, real metric list and honest unavailable feedback state. Do not hardcode Figma sample names, scores, dates, values or review copy.
- Do not change API backend, persistence, config, tab bar, other pages or protected user work. The sole shared-component exception is `components/radar-canvas`: add optional C13 `440rpx × 360rpx` dimensions (the 375-wide mini-program mapping of Figma 220×180px), remove C13's 200%/scale workaround, and preserve the default `width: 100%` / `height: 520rpx` for every caller that supplies no size. A dimension change must remeasure and redraw. C13 total score is centered at 96rpx beneath the radar.

## Acceptance Criteria

- [ ] Scoped coach team/radar responses drive all students and metrics; empty, forbidden and failure states are safe.
- [ ] A latest-request guard works; insufficient data is not represented as a fabricated radar.
- [ ] Tests cover time preservation, normalization, width clamp, stale response and WXML constraints.
- [ ] Radar component tests cover default dimensions, 440×360rpx custom dimensions and redraw after size changes; C13 test locks the equivalent Figma size, centered 96rpx score and absence of the scale workaround.
- [ ] Focused test, package typecheck, full mini-program test and scoped diff check pass.

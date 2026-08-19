# Coach TabBar visual acceptance — 2026-08-19

## Method

All runtime captures below were produced through `scripts/devtools/wechatide-mcp-capture.cjs` from the real coach role of the running dual-role session. Each PNG is route-verified and normalized to 375×812 with a matching JSON sidecar. Online Figma file `zZ6wKyOHKcO4UYXDd9jGwv` was read live with `get_design_context` and `get_screenshot` for every referenced design board.

## Results

| Route / state | Online Figma reference | Runtime evidence | TabBar result |
|---|---|---|---|
| `/pages/coach/schedule/index` | C1 `93:578` | `captures/c1-schedule-2026-08-19.png` | Pass — fixed 70px three-tab shell and active 日程 state align. |
| `/pages/coach/event-change/index` | C3 `93:634` | `captures/c3-event-change-2026-08-19.png` | Pass — missing activity ID is a data precondition; bottom shell aligns. |
| `/pages/coach/attendance/index` | C4 `93:665` | `captures/c4-attendance-2026-08-19.png` | Pass — active 日程 state aligns. |
| `/pages/coach/attendance-success/index` | C4.1 `93:696` | `captures/c4-1-attendance-success-2026-08-19.png` | Pass — active 日程 state aligns. |
| `/pages/coach/attendance/index?correction=1` | C4.2 `93:715` | `captures/c4-2-attendance-correction-2026-08-19.png` | Pass — correction state keeps the same fixed shell. |
| `/pages/coach/lesson/index` | C5 `93:734` | `captures/c5-lesson-2026-08-19.png` | Pass — active 日程 state aligns. |
| `/pages/coach/lesson-correction/index` | C5.1 `93:765` | `captures/c5-1-lesson-correction-2026-08-19.png` | Pass — active 日程 state aligns. |
| `/pages/coach/match/index` | C6 `93:796` | `captures/c6-match-2026-08-19.png` | Pass — active 日程 state aligns. C6.2 savedFlash is the same route shell. |
| `/pages/coach/match-event-add/index` | C6.1 `93:827` | `captures/c6-1-match-event-add-2026-08-19.png` | Pass — active 日程 state aligns. |
| `/pages/coach/tactical-board/index` | C7 `93:877` | `captures/c7-tactical-board-2026-08-19.png` | Pass — active 日程 state aligns. |
| `/pages/coach/training/index` | C8 `93:896` | `captures/c8-training-2026-08-19.png` | Pass — active 训练管理 state aligns. |
| `/pages/coach/team/index` | C9 `93:924` | `captures/c9-team-2026-08-19.png` | Pass — active 训练管理 state aligns. |
| `/pages/coach/content-select/index` | C10 `93:952` | `captures/c10-content-select-2026-08-19.png` | Pass — active 训练管理 state aligns. |
| `/pages/coach/coverage/index` | C10.1 `93:983` | `captures/c10-1-coverage-2026-08-19.png` | Pass — bottom confirmation footer stays above the fixed TabBar. |
| `/pages/coach/test-tasks/index` | C11 `93:1002` | `captures/c11-test-tasks-2026-08-19.png` | Pass — active 训练管理 state aligns. |
| `/pages/coach/test-entry/index` | C12 `93:1030` | `captures/c12-test-entry-2026-08-19.png` | Pass — active 训练管理 state aligns. |
| `/pages/coach/assessment-entry/index` | C12.1 `93:1061`, C15 `93:1132` | `captures/c12-1-assessment-autosave-2026-08-19.png`; fixed rerun `captures/c15-assessment-entry-fixed-2026-08-19.png` | **Fixed** — online C12.1/C15 keep TabBar at the bottom. The old `flow="{{true}}"` rendered it immediately after content; removing `flow` restored the fixed shell. |
| `/pages/coach/student-radar/index` | C13 `93:1080` | `captures/c13-student-radar-2026-08-19.png` | Pass — active 训练管理 state aligns. |
| `/pages/coach/team-ability/index` | C14 `93:1106` | `captures/c14-team-ability-2026-08-19.png` | Pass — active 训练管理 state aligns on the long board. |
| `/pages/coach/assessment-submit/index` | C15.1 `93:1163` | `captures/c15-1-assessment-submit-2026-08-19.png` | Pass — active 训练管理 state aligns. |
| `/pages/coach/me/index` | C16 `93:1182` | `captures/c16-me-2026-08-19.png` | Pass — active 我的 state aligns. |
| `/pages/coach/permissions/index` | C16.1 `93:1210` | `captures/c16-1-permissions-2026-08-19.png` | Pass — active 我的 state aligns. |
| `/pages/coach/private-interest/index` | C16.2 `93:1238` | `captures/c16-2-private-interest-2026-08-19.png` | Pass — active 我的 state aligns. |
| `/pages/coach/account/index` | C16.3 `93:1262` | `captures/c16-3-account-2026-08-19.png` | Pass — active 我的 state aligns. |
| `/pages/coach/help/index` | C16.4 `93:1286` | `captures/c16-4-help-2026-08-19.png` | Pass — active 我的 state aligns. |

## Scope exclusions

- C2 Activity Workbench (`93:606`) has no `<role-tabbar>` consumer in the current code, so it is outside this TabBar inventory.
- C6.2 Save State is an in-page state of `/pages/coach/match/index`, not a separate route; the C6 shell covers it.
- C12.1 Autosave State and C15 Assessment Entry are two online boards for the same `/pages/coach/assessment-entry/index` consumer. Both were checked online; the fixed runtime capture proves the shared shell after the repair.
- Dynamic production values, missing activity IDs, and empty API states are not TabBar differences.

## Code change

- `apps/miniprogram-cq-talent/pages/coach/assessment-entry/index.wxml`: removed `flow="{{true}}"` so the shared TabBar remains fixed at the viewport bottom.
- `apps/miniprogram-cq-talent/pages/coach/assessment-entry/index.test.mjs`: regression assertion now forbids the flowing layout on this Figma-fixed page.

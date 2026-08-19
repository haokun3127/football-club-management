# Online Figma navigation re-audit — 2026-08-19

## Authority and evidence levels

- Figma file key: `zZ6wKyOHKcO4UYXDd9jGwv`
- Root pages freshly read: `4:6` parent and `4:7` coach.
- The root-page design-context call was unavailable when no Figma layer was selected in the desktop plugin, so the root screenshot was retained as `root-parent-4-6-fresh.png` and `root-coach-4-7-fresh.png`; affected child boards were then read directly with Figma `get_design_context` and `get_screenshot`.
- Runtime channel: WeChat DevTools MCP, Windows project path, route navigation, raw PNG screenshots at `375x812`.
- Comparison status below means: online board read, runtime screenshot captured, and the two images visually examined side by side. Data/content differences are explicitly exempted where the current session has no matching task parameters.

## Repaired child boards

| Board | Online node | Runtime route | Runtime evidence | Result |
| --- | --- | --- | --- | --- |
| C11 Test Task List | `93:1002` | `pages/coach/test-tasks/index` | `c11-test-tasks.png` / `c11-sidebyside.png` | Repaired and recaptured |
| C12 Project Score Entry | `93:1030` | `pages/coach/test-entry/index` | `c12-test-entry.png` / `c12-sidebyside.png` | Repaired and recaptured; empty data state exempt |
| C13 Student Radar | `93:1080` | `pages/coach/student-radar/index` | `c13-student-radar.png` / `c13-sidebyside.png` | Repaired and recaptured; current session roster/metrics exempt |
| C15 Assessment Entry | `93:1132` | `pages/coach/assessment-entry/index` | `c15-assessment-entry.png` / `c15-sidebyside.png` | Repaired and recaptured; missing task parameters exempt |
| C15.1 Assessment Submit | `93:1163` | `pages/coach/assessment-submit/index` | `c151-assessment-submit.png` / `c151-sidebyside.png` | Repaired and recaptured; missing submission parameters exempt |
| C16 Coach Me | `93:1182` | `pages/coach/me/index` | `c16-coach-me.png` / `c16-sidebyside.png` | Repaired and recaptured; session profile data exempt |

The corresponding fresh Figma PNGs are retained beside this directory's `after-local-nav-repair` folder as `c11-figma-93-1002.png`, `c12-figma-93-1030.png`, `c13-figma-93-1080.png`, `c15-figma-93-1132.png`, `c151-figma-93-1163.png`, and `c16-figma-93-1182.png`.

## Repaired contract

- C11/C12/C15: `32rpx` horizontal nav inset, no local title gap, `36rpx/44rpx` title.
- C13: no local gap; back shell `48rpx x 64rpx`, left-aligned `36rpx/44rpx` title.
- C15 and C15.1 use the online chevron asset; C15.1 has the symmetric right placeholder.
- C16 title is `36rpx/44rpx`.
- Shared `role-tabbar` remains at the root contract: `70px` total, icon `16px` at `(6,8)`, label `9px` at `(6,28)`, active dot `4px` at `(12,42)` for coach boards. No shared TabBar source change was needed in this batch.

## Boundary note

`pages/coach/team-ability/*` was intentionally excluded from this repair because it has unrelated in-progress working-tree changes. It needs a separate review after that change set is owned and stable.

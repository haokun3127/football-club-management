# 2026-08-19 Coach Header Action Audit

## Capture environment

- Authority: online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`.
- Runtime: real WeChatIDE simulator, route-verified, `375×812` PNG.
- Runtime capsule geometry: viewport width `375px`; capsule `left=281px`, `width=87px`; `resolveMenuInset()` therefore returns `102px`.
- Current Figma top-nav contract for these boards uses a fixed right reserve of `100px`. The runtime value is a 2px platform-safe equivalent, so it must be treated as a replacement for the CSS right padding, not accumulated with it.

## Result

| Board | Online Figma node | Verified runtime route | Verdict |
| --- | --- | --- | --- |
| C1 Coach Schedule Home | `93:578` | `/pages/coach/schedule/index` | Pass — title and 36px avatar retain the expected clearance before the native capsule. |
| C2 Activity Workbench | `93:606` | `/pages/coach/event/index` | Header pass in its real no-ID error state. `结束训练` is data-conditional (`inProgress`), so its visible-state visual proof is deferred; its 102px runtime reserve matches the online 100px contract. |
| C3 Activity Change | `93:634` | `/pages/coach/event-change/index?id=event-cq-talent-secure-test-1` | Pass — shared `保存` action remains separated from `变更活动`; real route reached `ready`. |
| C4 Attendance | `93:665` | `/pages/coach/attendance/index?id=event-cq-talent-secure-test-1` | Pass — shared `提交` action remains separated from `出勤管理`; real roster route reached `ready`. |
| C11 Test Task List | `93:1002` | `/pages/coach/test-tasks/index` | Pass — `测评任务` and `新增` retain the Figma title/action separation; `新增` does not collide with the capsule. |
| C12 Project Score Entry | `93:1030` | `/pages/coach/test-entry/index` | Header pass in its real no-event error state. `项目评分录入` and `提交` align with the Figma left/right anchors. |
| C14 Team Ability Overview | `93:1106` | `/pages/coach/team-ability/index` | Pass — back control, title, and `导出` spacing match the current online header geometry. |
| C15 Assessment Entry | `93:1132` | `/pages/coach/assessment-entry/index` | Header pass in its real no-template error state. `能力评估录入` and `保存草稿` have the intended visible gap. |
| C16 Coach Me | `93:1182` | `/pages/coach/me/index` | Pass — title and settings icon preserve the online Figma x-position and native-capsule clearance. |

## Evidence

Online Figma renders saved beside this record:

- `c1-online.png`, `c2-online.png`, `c3-online.png`, `c4-online.png`, `c11-online.png`, `c12-online.png`, `c14-online.png`, `c15-online.png`, `c16-online.png`

Route-verified simulator captures:

- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C1-verified-2026-08-19.png`
- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C2-verified-2026-08-19.png`
- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C3-verified-2026-08-19.png`
- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C4-verified-2026-08-19.png`
- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C11-verified-2026-08-19.png`
- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C12-verified-2026-08-19.png`
- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C14-verified-2026-08-19.png`
- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C15-verified-2026-08-19.png`
- `C:\Users\ASUS\AppData\Local\Temp\nav-audit-C16-verified-2026-08-19.png`

## Static coverage of remaining coach headers

- C5, C5.1, C6, C6.1, C8, C9, C10, C10.1, C13 and C16.1–C16.4 have no right-side text action in their current WXML header. Their remaining risk is icon/placeholder geometry, not the P5 title/action squeeze.
- C7 uses a right-side icon; C1 uses an avatar; C14 uses `导出`; C16 uses a settings icon. All four were read from the live Figma context and captured in the runtime audit above.

## Decision

No additional implementation or Figma edit is justified for this specific P5-style header/action spacing issue. P5 was an isolated content-density issue (the repeated student/team subtitle); its current `历史对比` layout remains the approved exception already fixed in this task.

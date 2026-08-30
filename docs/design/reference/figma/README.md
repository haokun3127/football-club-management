# Figma 设计稿离线参考图（375×812 PNG）

基线导出自权威在线文件 `zZ6wKyOHKcO4UYXDd9jGwv`（2026-08-12，经 Figma MCP `get_screenshot` 原尺寸导出）；有单页更新时会按对应节点增量覆盖，C2 与 C6.1 已于 2026-08-30 重新导出。
用途：无 Figma MCP 的环境（如 Claude Code 未配 Dev Mode MCP）直接读图比对。

画板 id ↔ 路由 ↔ 在线实时查询映射见 `../specifications/figma-online-frame-map-2026-08-12.md`。
若在线设计更新，需重新导出（MCP 可用时按映射表逐 id 取图覆盖）。

## 家长端（21 张，源页面 4:6）

| 文件 | 画板 | 路由 |
|---|---|---|
| g1-launch.png | G1 Launch | pages/launch |
| g2-login-verification.png | G2 Login Verification | pages/login |
| g3-login-blocked.png | G3 Login Blocked | pages/login（受限态） |
| p1-schedule-home.png | P1 Schedule Home | pages/parent/schedule |
| p1-schedule-home-empty.png | P1 — Empty | schedule 空态分支 |
| p2-training-detail.png | P2 Training Detail | pages/parent/event（training） |
| p2-1-match-detail.png | P2.1 Match Detail | pages/parent/event（match） |
| p2-2-other-activity-detail.png | P2.2 Other Activity | pages/parent/event（other） |
| p3-reminder-center.png | P3 Reminder Center | pages/parent/reminders |
| p4-growth-home.png | P4 Growth Home | pages/parent/growth |
| p5-ability-radar.png | P5 Ability Radar | pages/parent/radar |
| p6-metric-detail.png | P6 Metric Detail | pages/parent/metric |
| p7-parent-profile-hub.png | P7 Parent Profile Hub | pages/parent/child |
| p7-1-lessons-insurance.png | P7.1 Lessons Insurance | pages/parent/status |
| p8-content-center.png | P8 Content Center | pages/parent/content |
| venues-premium.png | Venues - Premium | pages/parent/venues |
| p8-2-help-center.png | P8.2 Help Center | pages/parent/help |
| coach-team.png | Coach Team | pages/parent/coaches |
| p9-private-lesson-form.png | P9 Private Lesson Form | pages/parent/private |
| p9-1-private-success.png | P9.1 Private Success | pages/parent/private-success |
| p10-account-binding.png | P10 Account Binding | pages/parent/binding |

## 教练端（28 张，源页面 4:7）

| 文件 | 画板 | 路由 |
|---|---|---|
| c1-coach-schedule-home.png | C1 | pages/coach/schedule |
| c2-activity-workbench.png | C2 | pages/coach/event |
| c3-activity-change.png | C3 | pages/coach/event-change |
| c4-attendance.png | C4 | pages/coach/attendance |
| c4-1-attendance-success.png | C4.1 | pages/coach/attendance-success |
| c4-2-attendance-correction.png | C4.2 | attendance ?correction=1 |
| c5-lesson-confirm.png | C5 | pages/coach/lesson |
| c5-1-lesson-correction.png | C5.1 | pages/coach/lesson-correction |
| c6-match-entry.png | C6 | pages/coach/match |
| c6-1-add-match-event.png | C6.1 | pages/coach/match-event-add |
| c6-2-save-state.png | C6.2 | match 页内 savedFlash 态 |
| c7-tactical-board-poc.png | C7（LEGACY PoC） | pages/coach/tactical-board |
| c8-training-management.png | C8 | pages/coach/training |
| c9-team-detail.png | C9 | pages/coach/team |
| c10-training-content-select.png | C10 | pages/coach/content-select |
| c10-1-coverage-preview.png | C10.1 | pages/coach/coverage |
| c11-test-task-list.png | C11 | pages/coach/test-tasks |
| c12-project-score-entry.png | C12 | pages/coach/test-entry |
| c12-1-autosave-state.png | C12.1 | assessment-entry 页内态 |
| c13-student-radar.png | C13 | pages/coach/student-radar |
| c14-team-ability-overview.png | C14 | pages/coach/team-ability |
| c15-assessment-entry.png | C15 | pages/coach/assessment-entry |
| c15-1-assessment-submit.png | C15.1 | pages/coach/assessment-submit |
| c16-coach-me.png | C16 | pages/coach/me |
| c16-1-permission-scope.png | C16.1 | pages/coach/permissions |
| c16-2-private-interest.png | C16.2 | pages/coach/private-interest |
| c16-3-coach-account.png | C16.3 | pages/coach/account |
| c16-4-coach-help.png | C16.4 | pages/coach/help |

注：画板中的「WeChat Capsule」是微信原生胶囊占位，视觉比对时该区域豁免（真机胶囊由微信渲染）。

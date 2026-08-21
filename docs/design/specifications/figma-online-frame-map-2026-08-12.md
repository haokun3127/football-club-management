# Figma 在线画板 id 映射（2026-08-12 校订）

权威文件：`zZ6wKyOHKcO4UYXDd9jGwv`（在线唯一权威）。本表经 `use_figma` 只读枚举核实。
**注意**：本地旧 fig-out.json（2026-07-29）中 P1 画板 id `93:83` 已失效——P1 在线被重新设计为 `269:250`，并新增 Empty 变体。其余画板 id 与旧解码一致。

## 页面（CANVAS）

| id | 名称 |
|---|---|
| 0:1 | 00 Method & Contract |
| 4:2 | 01 Design Language |
| 4:3 | 02 Tokens |
| 4:4 | 03 Components |
| 4:5 | 04 Templates |
| 4:6 | 05 Parent Generated |
| 4:7 | 06 Coach Generated |
| 89:2 | 07 Prototype & Routes |
| 89:3 | 08 Coverage & Diff |
| 98:2 | 09 Mock Data Layer |

## 家长端 4:6（21 设计画板，375x812）

| id | 画板 | 对应路由 |
|---|---|---|
| 93:2 | G1 Launch | pages/launch |
| 93:29 | G2 Login Verification | pages/login |
| 93:56 | G3 Login Blocked | pages/login（受限态） |
| 269:250 | P1 Schedule Home（**新设计**） | pages/parent/schedule |
| 269:479 | P1 Schedule Home — Empty（**新增空态**） | pages/parent/schedule（空态分支） |
| 93:139 | P2 Training Detail | pages/parent/event（training） |
| 93:170 | P2.1 Match Detail | pages/parent/event（match） |
| 93:198 | P2.2 Other Activity Detail | pages/parent/event（other） |
| 93:222 | P3 Reminder Center | pages/parent/reminders |
| 93:250 | P4 Growth Home | pages/parent/growth |
| 93:278 | P5 Ability Radar | pages/parent/radar |
| 93:308 | P6 Metric Detail | pages/parent/metric |
| 93:336 | P7 Parent Profile Hub | pages/parent/child |
| 93:364 | P7.1 Lessons Insurance | pages/parent/status |
| 93:388 | P8 Content Center | pages/parent/content |
| 93:416 | Venues - Premium | pages/parent/venues |
| 93:444 | P8.2 Help Center | pages/parent/help |
| 93:472 | Coach Team | pages/parent/coaches |
| 93:500 | P9 Private Lesson Form | pages/parent/private |
| 93:531 | P9.1 Private Success | pages/parent/private-success |
| 93:550 | P10 Account Binding | pages/parent/binding |

CODE 契约版 7 张（222:86-222:92）按 2026-08-07 用户裁定：设计画板优先。
参考节点：WeChat Capsule 272:383（71x32）/ 272:769（87x32）——胶囊占位，比对时豁免该区域。

## 教练端 4:7（28 设计画板，375 宽）

| id | 画板 | 高度 | 对应路由 |
|---|---|---|---|
| 93:578 | C1 Coach Schedule Home | 812 | pages/coach/schedule |
| 93:606 | C2 Activity Workbench | 812 | pages/coach/event |
| 93:634 | C3 Activity Change | 903 | pages/coach/event-change |
| 93:665 | C4 Attendance | 922 | pages/coach/attendance |
| 93:696 | C4.1 Attendance Success | 812 | pages/coach/attendance-success |
| 93:715 | C4.2 Attendance Failed/Correction | 812 | attendance ?correction=1 |
| 93:734 | C5 Lesson Confirm | 812 | pages/coach/lesson |
| 93:765 | C5.1 Lesson Correction | 812 | pages/coach/lesson-correction |
| 93:796 | C6 Match Entry | 812 | pages/coach/match |
| 93:827 | C6.1 Add Match Event | 812 | pages/coach/match-event-add |
| 93:858 | C6.2 Save State | 812 | match 页内 savedFlash 态 |
| 93:877 | LEGACY / C7 Tactical Board PoC | 812 | pages/coach/tactical-board |
| 93:896 | C8 Training Management | 812 | pages/coach/training |
| 93:924 | C9 Team Detail | 871 | pages/coach/team |
| 93:952 | C10 Training Content Select | 812 | pages/coach/content-select |
| 93:983 | C10.1 Coverage Preview | 812 | pages/coach/coverage |
| 93:1002 | C11 Test Task List | 812 | pages/coach/test-tasks |
| 487:2 | C11.1 Assessment Task Create | 812 | pages/coach/test-task-create |
| 93:1030 | C12 Project Score Entry | 894 | pages/coach/test-entry |
| 93:1061 | C12.1 Autosave State | 812 | assessment-entry 页内态 |
| 93:1080 | C13 Student Radar | 908 | pages/coach/student-radar |
| 93:1106 | C14 Team Ability Overview | 1258 | pages/coach/team-ability |
| 93:1132 | C15 Assessment Entry | 1002 | pages/coach/assessment-entry |
| 93:1163 | C15.1 Assessment Submit | 812 | pages/coach/assessment-submit |
| 93:1182 | C16 Coach Me | 812 | pages/coach/me |
| 93:1210 | C16.1 Permission Scope | 812 | pages/coach/permissions |
| 93:1238 | C16.2 Private Interest | 812 | pages/coach/private-interest |
| 93:1262 | C16.3 Coach Account | 812 | pages/coach/account |
| 93:1286 | C16.4 Coach Help | 924 | pages/coach/help |

教练端 CODE 版 8 张（231:*, 233:2）同样不作权威。

## 枚举方法（复跑）

```
use_figma(fileKey) → figma.root.children（页面列表）
use_figma(fileKey) → getNodeByIdAsync("4:6") + setCurrentPageAsync → page.children（画板 id/名/尺寸）
```

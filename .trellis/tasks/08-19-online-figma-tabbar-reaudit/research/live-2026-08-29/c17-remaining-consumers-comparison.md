# Remaining role-tabbar consumers — live comparison (2026-08-29)

## Shared online references

- Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Parent semester report board: `701:177`, read with `get_design_context` and captured with `get_screenshot`; online screenshot: `p43-online.png` (`375×812`).
- Coach pages have no independent boards in the current online mapping. Their shared reference was re-read from coach TabBar overlay `529:124` with `get_design_context` and `get_screenshot`; the coach root `4:7` was also captured as `coach-root-4-7-online-current.png`.
- The coach overlay specifies a 375×70 shell, 16px icons, 9px labels, 4px active dot, and the order `日程 / 训练管理 / 我的`.

## Evidence and disposition

### `/pages/coach/lesson-history/index`

- Runtime: `coach-lesson-history-runtime.png` with sidecar; raw capture was `564×1220`, normalized to `375×812`.
- The soft-pink `销课历史` top bar, left back control, schedule-active coach TabBar, icon/label hierarchy, active red dot, and bottom safe area are visible and consistent with the shared coach reference.
- The row content is real API data: `传接球配合训练`, actual date/time, team/venue text, and the real participant count. It is not compared against a Figma sample board because no independent board exists.
- Online Figma read: **pass**. Runtime capture: **pass**. Visual comparison: **pass for shared shell, with real-data content exemption**.

### `/pages/coach/lesson-detail/index?id=event-cq-talent-secure-test-1-trn-0818`

- Runtime first viewport: `coach-lesson-detail-runtime.png` with sidecar.
- Runtime bottom viewport: `coach-lesson-detail-runtime-bottom.png` with sidecar, after a real `wx.pageScrollTo({scrollTop:9999})`.
- The soft-pink `销课详情` top bar, schedule-active coach TabBar, attendance card, real roster, training-content card, and correction CTA are rendered. The bottom view confirms the final roster row, training-content empty state, and `更正本次销课` CTA remain above the fixed TabBar.
- No independent Figma board exists; comparison uses the current coach root/overlay contract. Real names, counts, balances, and empty training-content state are API data and are not substituted with Figma examples.
- Online Figma read: **pass**. Runtime capture: **pass**. Visual comparison: **pass for shared shell and fixed-bottom behavior, with real-data content exemption**.

### `/pages/coach/match-edit/index?eventId=event-cq-talent-secure-test-1-completed-match`

- Runtime: `coach-match-edit-runtime.png` with sidecar; raw capture was `564×1220`, normalized to `375×812`.
- The soft-pink `编辑比赛` top bar, left back control, schedule-active coach TabBar, and bottom safe area follow the shared coach reference. The page shows the real completed match, opponent, type, status, and score returned by the API.
- No independent Figma board exists for this route; the body is a workflow page covered by the shared root navigation contract.
- Online Figma read: **pass**. Runtime capture: **pass**. Visual comparison: **pass for shared shell, with real-data content exemption**.

### `/pages/parent/semester-report/index`

- Runtime: `parent-semester-report-runtime-final.png` with sidecar, captured after a real authenticated role switch from coach to parent. The session remained the same authenticated user; no storage/session payload was fabricated.
- The growth-active parent TabBar is visible, with the expected four-item order and active red state. The runtime route is reachable only under the parent role; the earlier coach-role attempt correctly fell back to the coach schedule route.
- The current runtime page body does **not** match the online `701:177` report board: the live board has a period card, dark student card, compact ability card, three-column summary, and coach-note card, while the implementation currently presents student chips and a different data-card composition. This is a genuine page-body design gap, not a TabBar or data-state exemption.
- The body redesign is outside this task's TabBar/top-navigation boundary. No code was changed here; create a separate P4.3 Figma-to-code repair task before altering the page.
- Online Figma read: **pass**. Runtime capture: **pass**. Visual comparison: **blocked for full-page acceptance / pass for parent TabBar shell**; **next action: separate P4.3 page-body restoration**.

## Console

- WeChatIDE console filter `error|exception|fail|undefined|route is not defined|wx:else|appid missing`: no matches after the final coach capture.

## Code changes

- No business-code repair was warranted within this TabBar/top-navigation audit. The only new files in this batch are evidence images, sidecars, and this comparison record.

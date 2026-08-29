# C12 / C12.1 Project Score Entry — 2026-08-29 online comparison

## Sources

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- C12 node: `93:1030` (`C12 Project Score Entry`)
- C12 online screenshot: `c12-online.png` (`375×894`)
- C12 runtime route: `/pages/coach/test-entry/index?eventId=event-cq-talent-secure-test-1`
- C12 runtime screenshot: `c12-runtime.png` (`375×812`)
- C12 runtime sidecar: `c12-runtime.png.json`
- C12.1 node: `93:1061` (`C12.1 Autosave State`)
- C12.1 online screenshot: `c12-1-online.png` (`375×812`)
- C12.1 runtime route: `/pages/coach/test-entry/index?eventId=event-cq-talent-secure-test-1`
- C12.1 runtime screenshot: `c12-1-runtime.png` (`375×812`)
- C12.1 runtime sidecar: `c12-1-runtime.png.json`
- Capture method: WeChatIDE MCP route-verified `simulator_screenshot`

## Separate evidence levels

### C12 Project Score Entry

1. **Online design read:** `get_design_context` and `get_screenshot` succeeded for node `93:1030`; the current online board is `375×894`.
2. **Runtime capture:** the real coach session opened the writable secure test event and produced a strict `375×812` screenshot; the page data confirmed `draftResumeVisible=false` for this capture.
3. **Visual comparison:** the online board and the first runtime viewport were inspected side by side.

### C12.1 Autosave State

1. **Online design read:** `get_design_context` and `get_screenshot` succeeded for node `93:1061`.
2. **Runtime capture:** a real score was entered through the page method, persisted to simulator local storage by the page's own autosave path, and the same event was reopened. The resulting mask state was captured at strict `375×812`; page data confirmed `draftResumeVisible=true`.
3. **Visual comparison:** the current online board and the runtime autosave-mask screenshot were inspected side by side.

## C12 comparison

Pass for the current online board and the first runtime viewport:

- soft-pink top navigation, arrow slot, `项目评分录入` title, and `提交` action;
- dark task-summary header with title, metadata, completion chips, and fixed height/radius;
- learner heading and compact learner cards;
- four-column visible score-cell window and missing-state affordance;
- fixed save area and coach TabBar position, icon/label hierarchy, active red state, active dot, and bottom safe-area reservation.

### Explicit differences and exemptions

- The runtime uses the real secure-test event, real template, eight learners, and the current metric labels/values; these differ from the Figma sample task, five learners, four sample metrics, and sample scores.
- Long real names and additional real metrics are projected through the existing compact view model so they remain reachable without replacing API data with fixtures.
- WeChat status bar, capsule, and Home Indicator are platform chrome absent from the Figma board.

## C12.1 comparison

Pass for the autosave state shell:

- dimmed page layer;
- top navigation title `成绩录入` and `提交` action;
- centered success icon and `评分已自动保存` message;
- continuation message, last-saved label, `继续录入` and `退出` buttons;
- fixed coach TabBar remains visible below the modal and is not structurally replaced.

### Explicit differences and exemptions

- The runtime timestamp is generated from the actual local draft write; it is not copied from Figma's `1分钟前` sample.
- Underlying task, learner, metric, and partial score are real current-session data and intentionally differ from the Figma sample.
- WeChat status bar, capsule, and Home Indicator are platform chrome absent from the Figma board.

## Verification

- The C12.1 local-storage trigger used the real page method and real event/template/student/item IDs; no API mock or production write was used.
- Simulator console filter `error|exception|fail|undefined|route is not defined|wx:else|appid missing`: no matches for the C12 and C12.1 captures.
- The previously completed batch-wide typecheck and test gate remains green; this evidence-only batch made no business-code changes.

## Disposition

**C12: Pass. C12.1: Pass — real local draft state reproduced and visually compared.** No business-code repair required.

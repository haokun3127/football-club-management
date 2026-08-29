# C11 / C11.1 Assessment Tasks — 2026-08-29 online comparison

## Sources

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- C11 node: `93:1002` (`C11 Test Task List`)
- C11 online screenshot: `c11-online.png` (`375×812`)
- C11 runtime route: `/pages/coach/test-tasks/index`
- C11 runtime screenshot: `c11-runtime.png` (`375×812`)
- C11 runtime sidecar: `c11-runtime.png.json`
- C11.1 node: `487:2` (`C11.1 Assessment Task Create`)
- C11.1 online screenshot: `c11-1-online.png` (`375×812`)
- C11.1 runtime route: `/pages/coach/test-task-create/index`
- C11.1 initial runtime screenshot: `c11-1-runtime.png` (`375×812`)
- C11.1 repaired runtime screenshot: `c11-1-runtime-repaired.png` (`375×812`)
- C11.1 repaired runtime sidecar: `c11-1-runtime-repaired.png.json`
- Capture method: WeChatIDE MCP route-verified `simulator_screenshot`

## Separate evidence levels

### C11 Test Task List

1. **Online design read:** `get_design_context` and `get_screenshot` succeeded for node `93:1002`.
2. **Runtime capture:** WeChatIDE MCP opened and verified `/pages/coach/test-tasks/index`; the PNG and sidecar record a strict `375×812` frame.
3. **Visual comparison:** the current online screenshot and runtime screenshot were inspected side by side.

### C11.1 Assessment Task Create

1. **Online design read:** `get_design_context` and `get_screenshot` succeeded for node `487:2`.
2. **Runtime capture:** WeChatIDE MCP opened and verified `/pages/coach/test-task-create/index`; both the initial and repaired captures are strict `375×812` frames.
3. **Visual comparison:** the initial runtime frame exposed the title offset; the repaired runtime frame was compared again against the online screenshot.

## C11 comparison

Pass for the current online board and rendered coach shell:

- soft-pink top navigation, 24px back-arrow slot, title and right-side `新增` action;
- three filter capsules and their active state;
- task-card width, padding, radius, shadow, metadata, progress track, and right chevron;
- floating add button above the fixed navigation;
- fixed coach TabBar position, icon/label hierarchy, active red state, active dot, and bottom safe-area reservation.

### Explicit differences and exemptions

- The runtime contains four real tasks while the Figma board illustrates three; task names, dates, statuses, completion counts, and progress values come from the real API and are intentionally not replaced with design fixtures.
- WeChat status bar, capsule, and Home Indicator are platform chrome absent from the Figma board.

## C11.1 comparison and repair

The initial runtime comparison found one real geometry defect: the local `.page-nav__title` used `margin-left: 24rpx` (12px), while the online board places the title approximately 4px after the 24px arrow slot. The repair changed only that local value to `8rpx` and did not alter form behavior or API contracts.

After the repair, the following align with the online board:

- white 88px top navigation and title/arrow placement;
- form-card position, width, radius, labels, field heights, and vertical rhythm;
- template/date picker affordances;
- full-width red rounded submit button geometry;
- content background and platform-safe-area behavior.

### Explicit differences and exemptions

- The runtime form is initially empty, so the submit button is disabled and the title field shows a placeholder; Figma shows filled sample values and an enabled button. This is the real form state, not a visual-shell defect.
- The template name and dates are real API/device values and are not hard-coded to Figma samples.
- WeChat status bar, capsule, and Home Indicator are platform chrome absent from the Figma board.

## Verification

- C11.1 focused regression: initial RED on the old `24rpx` spacing, then GREEN after the `8rpx` repair (`5/5`).
- C11.1 TypeScript check: passed.
- Simulator console filter `error|exception|fail|wx:else|route is not defined|appid missing`: no matches for either route capture.

## Disposition

**C11: Pass. C11.1: Repaired and recaptured.** The current online Figma structure, top navigation, form geometry, coach TabBar conventions, and route behavior are now covered by fresh evidence. Real-data, initial-form-state, and platform-chrome differences are explicitly exempted.

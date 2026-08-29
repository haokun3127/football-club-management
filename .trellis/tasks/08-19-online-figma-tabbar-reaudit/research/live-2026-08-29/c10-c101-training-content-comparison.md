# C10 / C10.1 Training Content Selection — 2026-08-29 online comparison

## Sources

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Online Figma node: `93:952` (`C10 Training Content Selection`)
- Online Figma screenshot: `c10-online.png` (`375×812`)
- Online Figma node: `93:983` (`C10.1 Coverage Preview`)
- Online Figma screenshot: `c10-1-online.png` (`375×812`)
- Runtime route: `/pages/coach/content-select/index`
- Runtime query: `eventId=event-cq-talent-secure-test-1-trn-0818`
- Runtime screenshot: `c10-runtime-real.png` (`375×812`)
- Runtime sidecar: `c10-runtime-real.png.json`
- Coverage route: `/pages/coach/coverage/index`
- Coverage query: `eventId=event-cq-talent-secure-test-1-trn-0818`
- Coverage screenshots: `c10-1-runtime.png`, `c10-1-runtime-bottom.png`, `c10-1-runtime-bottom-max.png` (`375×812` each)
- Coverage sidecar: `c10-1-runtime.png.json`
- Capture method: WeChatIDE MCP route-verified `simulator_screenshot`, followed by the repository normalizer

## Separate evidence levels

### C10 Training Content Selection

1. **Online design read:** `get_design_context` and `get_screenshot` succeeded for node `93:952`.
2. **Runtime capture:** the route was opened with the real coach session and verified by WeChatIDE MCP; the normalized PNG and sidecar are strict `375×812`.
3. **Visual comparison:** the Figma screenshot and runtime screenshot were inspected side by side.

### C10.1 Coverage Preview

1. **Online design read:** `get_design_context` and `get_screenshot` succeeded for node `93:983`.
2. **Runtime capture:** the route was opened with the same real coach session and verified by WeChatIDE MCP; first and bottom viewport captures are strict `375×812`.
3. **Visual comparison:** the Figma screenshot, first runtime viewport, and bottom runtime viewport were inspected together.

## C10 comparison

Pass for the current online board and the rendered coach shell:

- back navigation top bar and title placement;
- search field geometry;
- category capsule row;
- training-item cards, selection circles, and card spacing;
- bottom selection/confirmation bar;
- fixed coach TabBar position, icon/label hierarchy, active red state, and bottom safe-area reservation.

The page was captured from the secure test training event because the older demo event was not editable for the current coach session. The older event's error-state capture is not used as acceptance evidence.

### Explicit differences and exemptions

- Category labels, training-item names, durations, and selected state come from the real API response. They differ from the Figma sample values and were not replaced with design fixtures.
- The runtime includes the WeChat device status bar and capsule; the Figma board does not. Content geometry below the platform safe-area envelope remains aligned.

## C10.1 comparison

Pass for the current online board and the rendered coach shell:

- back navigation top bar and title placement;
- learner coverage cards and progress bars;
- bottom confirmation bar;
- fixed coach TabBar position, icon/label hierarchy, active red state, and bottom safe-area reservation.

### Explicit differences and exemptions

- The real API returns 10 ability dimensions per learner while the Figma board illustrates 3 sample dimensions. The resulting card height and page length are a data-range difference, not a missing or incorrect layout element.
- The fixed confirmation bar is visible on the first viewport. After scrolling to the maximum bottom position, the last coverage card remains readable and is not hidden by the confirmation bar or TabBar.
- The runtime includes the WeChat device status bar and capsule; the Figma board does not.

## Disposition

**Pass — C10 and C10.1 match the current online Figma structure, top navigation, content-card geometry, fixed action area, and coach TabBar behavior. Real-data range and platform-shell differences are explicitly exempted. No business-code repair required.**

Simulator console output was checked for `error|exception|fail|wx:else|route is not defined|appid missing`; no matching error was found for these captures.

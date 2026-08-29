# C8 Training Management — 2026-08-29 online comparison

## Sources

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Online Figma node: `93:896` (`C8 Training Management`)
- Online Figma screenshot: `c8-online.png` (`375×812`)
- Runtime route: `/pages/coach/training/index`
- Runtime screenshot: `c8-runtime-verified.png` (`375×812`)
- Runtime sidecar: `c8-runtime-verified.png.json`
- Capture method: WeChatIDE MCP `simulator_open_page` + route-verified `simulator_screenshot`, followed by the repository normalizer

## Separate evidence levels

1. **Online design read:** `get_design_context` and `get_screenshot` both succeeded for node `93:896`.
2. **Runtime capture:** the route was opened and verified by the WeChatIDE MCP bridge; the logical viewport and normalized PNG are both `375×812`.
3. **Visual comparison:** the online screenshot and runtime screenshot were inspected side by side.

## Comparison

Pass for the audited shell and layout. The following structures align with the current online board:

- 88px top navigation envelope and `训练管理` title placement;
- dark rounded statistics hero with a two-by-two metric grid;
- four-item tab row with `训练计划` active and the red indicator;
- 22px horizontal page inset, session-card radius/padding, status chips, and card spacing;
- fixed coach TabBar position, icon/label hierarchy, active red state, and bottom safe-area reservation.

## Explicit differences and exemptions

- Metric values, activity names, dates, venues, statuses, and participant counts are real API data. They differ from the Figma sample values and were not replaced with design fixtures.
- The runtime includes the WeChat device status bar and capsule. The Figma board does not; the content geometry below the safe-area envelope remains aligned.
- The runtime currently exposes four real training cards while the board shows three sample cards. This is a data-range difference, not a missing layout element.

## Disposition

**Pass — current Figma structure and TabBar geometry match; real-data and platform-shell differences explicitly exempted. No business-code repair required.**

Simulator console grep for `error|exception|fail|wx:else|route is not defined|appid missing` returned no matches.

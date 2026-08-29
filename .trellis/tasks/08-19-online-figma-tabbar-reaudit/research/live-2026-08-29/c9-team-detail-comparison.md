# C9 Team Detail — 2026-08-29 online comparison

## Sources

- Online Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Online Figma node: `93:924` (`C9 Team Detail`)
- Online Figma screenshot: `c9-online.png` (`375×871`)
- Runtime route: `/pages/coach/team/index`
- Runtime first viewport: `c9-runtime.png` (`375×812`)
- Runtime first-viewport sidecar: `c9-runtime.png.json`
- Runtime bottom viewport after `pageScrollTo(1000)`: `c9-runtime-bottom.png` (`375×812`)
- Capture method: WeChatIDE MCP route-verified simulator capture

## Separate evidence levels

1. **Online design read:** `get_design_context` and `get_screenshot` succeeded for node `93:924`; the live board is `375×871`.
2. **Runtime capture:** the route was opened and verified; both first and bottom screenshots are strict `375×812`, with the first capture's route and viewport recorded in its sidecar.
3. **Visual comparison:** the complete Figma board, runtime first viewport, and runtime bottom viewport were inspected.

## Comparison

Pass for the audited shell and layout:

- pink top navigation, 24px back arrow slot, and 18px `队伍详情` title;
- dark team summary card, season chip, three-column statistics, and spacing;
- four-column student grid with circular initials and labels;
- horizontally clipped coach-card row;
- fixed coach TabBar position, active red state, icon/label hierarchy, and bottom safe-area reservation;
- bottom viewport keeps the coach-card content clear of the fixed TabBar.

## Explicit differences and exemptions

- Team name, season, statistics, student names/count, and coach names/count are real API data. They differ from the Figma sample data and were not replaced with fixtures.
- The runtime includes the WeChat status bar and capsule while the Figma board does not.
- The bottom capture is a scrolled viewport, so the platform status bar remains over the scrolled content at the top edge. This is normal platform chrome behavior; no content or fixed TabBar collision was observed.

## Disposition

**Pass — current Figma structure, top navigation, team content geometry, and TabBar behavior match; real-data and platform-shell differences explicitly exempted. No business-code repair required.**

Simulator console grep for `error|exception|fail|wx:else|route is not defined|appid missing` returned no matches.

# Technical design — dual-role TabBar visual acceptance

## Boundaries

The shared implementation lives in `apps/miniprogram-cq-talent/components/role-tabbar/`. Consumers pass role, active tab, and optionally a flowing layout. The component owns icon selection, labels, the active marker, the fixed shell, and navigation. Route pages own any bottom reservation, fixed overlay stacking, and transient content that might overlap the TabBar.

## Source of truth and evidence

For each consumer, the agent obtains a fresh `get_design_context` plus `get_screenshot` from online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`. The canonical node mapping is `docs/design/specifications/figma-online-frame-map-2026-08-12.md`, but the current online node wins if the map and Figma differ.

Runtime evidence is created with `scripts/devtools/wechatide-mcp-capture.cjs`. The script verifies the page route, validates the native raster aspect ratio, normalizes the result to 375×812, and writes a non-sensitive JSON sidecar. The capture is considered trustworthy only when both PNG geometry and sidecar route match the expected route.

## Decision rules

1. A difference present identically on several routes is repaired in `role-tabbar` and protected with the component test before editing production WXSS/WXML.
2. A difference caused by a route's fixed footer, scrolling content, or `flow` mode is repaired in that route only and protected by a focused route test if such a test exists.
3. Differences in dynamic names, event dates, avatar imagery, or other server-provided content are documented as data variances only when the layout and TabBar geometry remain correct.
4. The WeChat capsule area in Figma is an explicit platform-UI exemption.

## Compatibility and rollback

No API, session, or data contract changes are in scope. Each commit is self-contained and reverts cleanly by commit hash. Existing uncommitted files outside this task are never staged, reset, or overwritten.

# Technical design — current online root-page navigation and TabBar re-audit

## Boundary

The audit covers the shared `apps/miniprogram-cq-talent/components/role-tabbar/` contract, root-page navigation conventions from parent `4:6` and coach `4:7`, and each matching WXML consumer under `pages/parent/**` or `pages/coach/**`. It is a visual verification task, not a redesign. Route-owned content can be inspected only insofar as it affects the fixed bottom shell, safe-area reservation, overlap, or the root-defined top-navigation geometry.

## Current evidence flow

For every route, the audit records four linked artifacts:

1. Figma node ID from `docs/design/specifications/figma-online-frame-map-2026-08-12.md`, corrected if the live file differs.
2. Fresh `get_design_context` result from file `zZ6wKyOHKcO4UYXDd9jGwv`.
3. Fresh `get_screenshot` result for that same node, retained locally where the MCP result provides a download URL.
4. Fresh WeChatIDE MCP route-verified 375×812 screenshot and JSON sidecar.

The comparison log must state separately that (a) the Figma node was read, (b) the runtime frame was captured, and (c) the two were visually examined. A screenshot sidecar alone proves capture geometry and route, not visual comparison.

## Comparison rules

- Shared bottom-shell differences across multiple routes are investigated in `components/role-tabbar` first.
- Root-navigation differences across multiple routes are investigated in `components/app-header` first; route-local navs are changed only when they deliberately bypass that component.
- The live roots establish the baseline standard for a left navigation: 24×24 back icon, title starting at x=40, 18px visual title treatment, and root-specific right-action text. A child board can override that standard only when its node explicitly says so.
- Route-specific footer/content collisions are investigated in the owning page only.
- Dynamic data, Figma's platform WeChat capsule, and intentionally missing detail parameters may be exemptions only when the TabBar geometry/state is otherwise correct.
- A long page needs both a first-viewport and a bottom-viewport inspection if a fixed TabBar could cover CTA/content.

## Safety

Only task-owned research, task artifacts, and files needed for a verified repair are changed. No destructive Git command, broad staging, DevTools process termination, or session fabrication is allowed.

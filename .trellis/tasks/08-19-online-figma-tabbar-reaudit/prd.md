# Online Figma root-page navigation and TabBar re-audit

## Goal

Re-check every current mini-program page that renders the shared `role-tabbar` or an affected top-navigation pattern against the live online Figma design file `zZ6wKyOHKcO4UYXDd9jGwv`, rather than relying on archived August 19 evidence. The authoritative source begins at parent root `4:6` and coach root `4:7`: those roots contain both page boards and current shared overlays/navigation conventions. The user needs an honest, current visual verdict for both experiences and repairs only where fresh comparison finds a visual difference.

## Confirmed facts

- Current source code contains 38 `role-tabbar` consumers: 15 parent routes and 23 coach routes.
- The root-page re-read on August 19 exposed a second shared contract missed by a TabBar-only review: standard back arrows are 24×24, left titles begin at x=40 and use an 18px visual size, and right text actions use the root-board typography rather than legacy local values.
- The previous acceptance task was archived on August 19, 2026. It has usable historical runtime evidence but does not retain a per-board raw Figma-MCP response for all screens.
- The online Figma URL supplied by the user is accessible through Figma MCP. Node `0:1` returned a current online screenshot on August 19, 2026.
- The running mini-program can be captured through `scripts/devtools/wechatide-mcp-capture.cjs`, which route-verifies the simulator and produces a normalized 375×812 PNG plus sidecar.
- Existing unrelated working-tree changes must remain untouched. Staging must always be path-limited.

## Requirements

1. Treat the current online Figma file as the sole design authority for this re-audit.
2. Before each visual judgement, read the corresponding current online Figma board using `get_design_context` and obtain an online screenshot using `get_screenshot`.
3. Capture the same running route through WeChatIDE MCP at 375×812; inspect the rendered TabBar shell, fixed/flow behavior, height, safe area, icon, label, active color/dot, page-bottom overlap, and root-board top-navigation geometry where that pattern is present.
4. Preserve a new evidence record with Figma node ID, runtime PNG/sidecar path, comparison result, and any explicit data/platform exemption.
5. Make no business-code changes until a fresh comparison identifies a real visual defect. Every repair must have a focused regression test, fresh runtime screenshot, appropriate type/test checks, and an independent path-limited commit.
6. Distinguish three result levels in records: online Figma read, runtime screenshot captured, and human/agent visual comparison completed.

## Acceptance criteria

- [ ] A current live Figma screenshot and design-context read are recorded for every mapped parent and coach TabBar board.
- [ ] Every current `role-tabbar` consumer has a new route-verified 375×812 simulator screenshot and sidecar.
- [ ] Every route has an explicit visual comparison disposition: pass, repaired-and-recaptured, data/platform exemption, or blocked.
- [ ] No existing uncommitted work outside this task is staged, overwritten, or deleted.
- [ ] Any discovered TabBar or root-navigation issue is fixed only after a failing regression check and is independently committed.

## Out of scope

- General page-body redesigns outside the TabBar/top-navigation shell.
- Fabricating sessions, roles, API responses, or test data to force an acceptance state.
- Modifying the online Figma design without a separate user instruction.

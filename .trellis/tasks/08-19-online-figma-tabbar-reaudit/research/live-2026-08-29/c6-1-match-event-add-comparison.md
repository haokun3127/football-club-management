# C6.1 Add Match Event live Figma comparison — 2026-08-29

## Evidence

- Live Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:827`, read with `get_design_context` and `get_screenshot` before judging the runtime page.
- Online reference: `research/live-2026-08-29/c6-1-online.png`, natural size `375×812`.
- Runtime route: `/pages/coach/match-event-add/index?eventId=event-cq-talent-secure-test-1-completed-match`, opened through WeChatIDE MCP with the existing real coach session.
- Runtime first viewport: `research/live-2026-08-29/c6-1-runtime.png`, strict `375×812`.
- Runtime bottom viewport after `pageScrollTo`: `research/live-2026-08-29/c6-1-runtime-bottom.png`, strict `375×812`.

## Comparison

- The shared soft-pink top navigation, 24px back-arrow slot, left-aligned title, page background, form hierarchy, field spacing, red submit action, and fixed coach TabBar are present in the runtime and align with the live board's geometry. The real WeChat status bar and capsule are platform chrome outside the Figma board.
- The live board shows six example event chips (`进球`, `助攻`, `黄牌`, `红牌`, `换人`, `其他`), while the real client capability response exposes four allowed types (`进球`, `助攻`, `扑救`, `抢断`). The runtime keeps the capability-driven four options; it does not fabricate unsupported event types. The resulting one-row chip layout moves the form upward compared with the two-row Figma sample, which is an intentional data/configuration difference.
- The live board contains sample player/avatar/position, minute, and note values. The runtime correctly renders the real roster and empty editable fields; copying those sample facts would violate the real API contract.
- The bottom viewport confirms the submit button remains above the fixed TabBar and the TabBar is not covering form content. The simulator console filter `error|exception|fail|undefined|route is not defined` returned no matches.

## Disposition

**pass with data/platform exemptions** — no WXML/WXSS change is justified by this fresh comparison, so no regression test or code commit was added for C6.1.


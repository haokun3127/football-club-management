# Dual-role TabBar visual acceptance

## Goal

Using the current online Figma file `zZ6wKyOHKcO4UYXDd9jGwv` as the only design authority, visually accept and, where required, repair every parent and coach mini-program page that renders the shared bottom `role-tabbar` component.

## Requirements

- Build a complete route-to-online-node inventory for every `role-tabbar` consumer.
- For every route, retrieve fresh online Figma design context and a screenshot before judging or modifying UI code.
- Capture the running mini-program through the WeChat DevTools MCP bridge, normalize it to a trustworthy 375×812 PNG, and retain non-sensitive evidence metadata.
- Compare the visible TabBar shell, icon artwork/state, labels, active marker, height, border, safe-area behavior, and page-specific overlap/scroll interaction against its corresponding Figma artboard.
- Prefer a shared-component repair. Make route-level changes only when a real page constraint differs from the shared contract.
- Preserve unrelated working-tree changes and use path-limited staging only.
- For every code batch, run targeted tests, TypeScript/package checks appropriate to changed files, `git diff --check`, a fresh compilation, and a repeat screenshot.
- Do not claim visual completion from static checks alone.

## Acceptance Criteria

- [ ] Every route that contains `<role-tabbar>` is listed with its Figma node, capture path, and disposition.
- [ ] Parent TabBar routes have fresh 375×812 DevTools screenshot evidence and no unresolved TabBar visual differences from current online Figma.
- [ ] Coach TabBar routes have fresh 375×812 DevTools screenshot evidence and no unresolved TabBar visual differences from current online Figma.
- [ ] Every discovered difference is either fixed and re-captured, or explicitly documented as a data-only/design-exempt variance.
- [ ] Each logic batch is independently committed without staging unrelated files.
- [ ] The final mini-program quality gate and `git diff --check` pass for files owned by this task.

## Notes

- User expressly requested direct single-agent execution and authorized continuous goal-mode progress.
- The WeChat DevTools app must not be terminated; if it becomes unusable, request that the user manually restart it.

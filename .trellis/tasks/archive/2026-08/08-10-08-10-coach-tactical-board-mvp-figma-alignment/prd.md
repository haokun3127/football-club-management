# PRD: C7 Coach Tactical Board MVP

## Goal

Align `/pages/coach/tactical-board/index` with `zZ6wKyOHKcO4UYXDd9jGwv / 233:2 / CODE / C7 Tactical Board MVP`. The legacy `93:877` node is explicitly excluded.

## Requirements

- Request existing tactical formations and the event tactical board only for an authenticated coach with a non-empty `eventId`.
- Render only returned formation, roster, player names, roles, and position labels. Never introduce Figma sample names, team facts, or formation facts.
- Distinguish state precisely: initial GET renders "已载入"; only a successful PUT renders "已保存". A failed PUT keeps dirty edits and emits only a fixed safe error.
- Support editable formation, starter selection, substitute swap, and pitch position movement only when the returned board is writable. Every edit operation is inactive in read-only state.
- Make loading resilient to stale success and failure, and make saving single-flight.
- Translate the current Figma layout in page-owned WXML/WXSS without shared header, status-chip, submit-bar, API, types, coordinate utility, or configuration changes. WXML must not invoke JavaScript methods.

## Boundaries

- Allowed: tactical-board page JSON/TS/WXML/WXSS/test, optional direct Figma chevron asset, this task directory, and the parent child pointer.
- Forbidden: `apps/api/**`, `utils/api.ts`, `utils/types.ts`, coordinate utilities, shared components, `project.config*`, legacy C7, and every existing unrelated worktree change.

## Acceptance Criteria

- [ ] Non-coach or invalid route performs zero GET/PUT requests and renders a safe non-success state.
- [ ] Current GET results alone yield "已载入" and map real formation, roster, player names, roles, and position labels.
- [ ] Current load wins over stale success/failure; read-only blocks every edit and save path.
- [ ] Successful PUT alone yields "已保存"; failed PUT preserves dirty state and uses no raw backend message; duplicate save is suppressed.
- [ ] Focused test, mini-program typecheck, package test, task validation, and scoped diff check pass.

# C14 team ability current Figma sync

## Goal

Synchronize the coach team-ability overview with the current online Figma node `93:1106`, while keeping all displayed team metrics and unavailable states sourced from the existing BFF contract.

## Requirements

- Use Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1106`, as the only visual reference for this batch.
- Keep the page-local custom header at the Figma geometry: 88px content height, pink surface, 24×32px back control, left-aligned 18px title, and 52×29px export control with dynamic WeChat menu clearance.
- Preserve the existing coach-role guard, team/overview API reads, radar canvas, trend chip, dimension statistics, ranking unavailable state, loading state, error state, and coach TabBar.
- Do not copy Figma sample names, scores, assessment periods, rankings, or export behavior into the product when the API does not provide them.
- Keep all display labels/styles precomputed in TypeScript; WXML must not call JavaScript array/string methods.

## Acceptance Criteria

- [x] Online Figma node `93:1106` was re-read before acceptance and its structure is represented by the current page.
- [x] Header, radar/trend, dimensions, ranking placeholder, and TabBar are covered by focused regression assertions.
- [x] Real-data, role-guard, empty, and error behavior remain covered without fixture data leaking into the page.
- [x] Focused tests, mini-program typecheck, WXML/WXSS compilation, full repository check, and `git diff --check` pass.
- [x] A real WeChatIDE simulator capture was obtained at logical `375×812`; runtime data differences from Figma samples are recorded as data-contract differences, not visual failures.

## Notes

- This is a page-local synchronization task. It does not change the API, database, Figma file, or unrelated dirty worktree paths.
- The export control remains intentionally inert because no real export API exists.
# C14 team ability current Figma sync

## Goal

Synchronize the coach team-ability overview with the current online Figma node `93:1106` without inventing ranking, assessment-period, or player data.

## Requirements

- Use online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1106`, as the visual authority.
- Match the header geometry: pink background, 24×32px back control, 18px left-aligned title, and 52×29px export control with dynamic menu safe-area reservation.
- Preserve the current real overview/team API reads, radar canvas, dimension summaries, loading/error/empty states, coach role guard, and global coach tabbar.
- Keep unavailable assessment-period and ranking values explicitly unavailable when the API does not provide them; do not copy Figma sample names or scores into the client.
- Keep all WXML display values precomputed in TypeScript and avoid JavaScript array/string method calls in WXML.

## Acceptance criteria

- [ ] C14 top bar matches the current online node's alignment and control sizes.
- [ ] Radar, trend, dimension, ranking, and tabbar sections remain structurally present.
- [ ] Existing real-data and error behavior remains covered by focused tests.
- [ ] Focused tests, mini-program TypeScript, full repository check, and `git diff --check` pass.
- [ ] Only the C14 page, focused test, progress entry, and this task's planning artifacts are committed.

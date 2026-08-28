# C14 team ability current Figma sync

## Goal

TBD.

## Requirements

- TBD

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
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

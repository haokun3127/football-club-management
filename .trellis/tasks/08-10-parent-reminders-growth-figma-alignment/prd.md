# Align parent reminders and growth home to Figma

## Goal

Align the real parent reminder centre and growth home with P3/P4 Figma while removing unsupported synthetic growth facts.

## Design source

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:222 / P3 Reminder Center`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:250 / P4 Growth Home`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:90 / CODE P4 Growth & Radar`

- P3 uses only real reminder API data. “All read” is local presentation state unless a server contract exists.
- P4 uses real children, growth summary and metric data. Draw a radar only when at least three genuine metrics exist.
- Do not fabricate milestones, class counts, rates, monthly chart values or child data where no API field exists.
- WXML must consume precomputed TypeScript view fields only; do not touch shared tabbar, backend/persistence or existing dirty paths.

- [ ] P3 list/empty/error states are mutually exclusive, can mark visible items read locally, and follow its Figma grouping hierarchy.
- [ ] P4 has real child selection, genuine metric entry/navigation and only displays radar/history visuals supported by data.
- [ ] Focused RED tests demonstrate removal of synthetic facts before GREEN; package tests/typecheck/diff check pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

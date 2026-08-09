# Align parent ability radar and metric detail to Figma

## Goal

Align P5 Ability Radar and P6 Metric Detail to the online Figma source using only real parent growth and metric data.

## Design source

- `zZ6wKyOHKcO4UYXDd9jGwv / 93:278 / P5 Ability Radar`
- `zZ6wKyOHKcO4UYXDd9jGwv / 93:308 / P6 Metric Detail`
- `zZ6wKyOHKcO4UYXDd9jGwv / 222:90, 222:91 / CODE`

- P5 uses real children/growth dimensions and draws a radar only for at least three real values.
- P6 uses the metric API’s catalog, records, note and source events. Trends require at least two real records.
- Do not show synthetic composite scores, benchmarks, ranks, team counts, coach details, example values or dates.
- WXML consumes only computed view fields; do not modify backend, API clients, canvas/shared components or existing dirty paths.

- [ ] Radar dimensions and metric cards derive from API data, with a clear insufficient-data state.
- [ ] Metric detail has truthful record ordering/trend/source-event navigation and hides unsupported social ranking data.
- [ ] RED tests precede implementation; focused/package/type/diff checks pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

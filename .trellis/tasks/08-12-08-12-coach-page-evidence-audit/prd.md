# Coach page evidence audit

## Goal

Establish a page-by-page evidence baseline for the coach mini-program before
continuing the Figma restoration, including the real backend-backed demo data
that each page needs for meaningful inspection.

## Requirements


- Treat online Figma file `zZ6wKyOHKcO4UYXDd9jGwv` as the only visual source.
- Record the exact route, Figma node, data dependency, available data state,
  and evidence status for every registered coach page. A unit test or a static
  code read is not a runtime visual pass.
- Test data must come from the API persistence/seed layer. Do not add client
  fixtures, manual role overrides, forged sessions, or mock API responses.
- The existing acceptance data may be used only in an explicitly isolated
  non-production database. Do not point an acceptance-seeded process at a
  production or shared database.
- Keep the parent guardian projection limited to its original two bound
  students even when coach-facing data uses the larger roster.
- Do not modify or stage user-owned `project.config.json`, unused SVG assets,
  `docs/superpowers/`, or the WPS workbook.

## Acceptance Criteria

- [x] A durable data coverage matrix distinguishes currently available
  backend records from pages that still require a real write/readback.
- [x] The focused fixture/server suite proves the demo data can be read after
  file-backed SQLite restart, including role switch, attendance, assessment,
  match, and tactical-board paths.
- [x] Every page has an explicit evidence classification: runtime captured,
  static-only, data-ready but awaiting authenticated capture, or data-blocked.
- [x] The audit does not claim visual acceptance without an authenticated
  375x812 route capture and a comparison to the matching online Figma node;
  this remains a static/data/test audit because the user waived screenshots as
  a completion prerequisite for the current goal.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

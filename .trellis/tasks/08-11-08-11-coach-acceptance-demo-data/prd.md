# Coach acceptance demo data coverage

## Goal

Expand the opt-in CQ Talent dual-role acceptance data with durable, clearly labelled coach-facing demo records for C1-C16 without exposing non-guardian students to the parent role, then verify restart/readback before continuing Figma batches.

## Requirements

- Extend only the opt-in Chongqing Talent acceptance seed (`FCM_CQ_TALENT_ACCEPTANCE_SEED=1`). The ordinary seed and all production data without that explicit flag stay unchanged.
- Keep the existing real-phone dual-role acceptance identity, its existing two guardian-scoped children, and its parent data contract unchanged. No phone number, credential, token, session, or secret may enter source, test output, documentation, or commit messages.
- Add a labelled coach-facing demonstration roster of eight existing synthetic club students: the two children remain part of the roster, while six other existing students make attendance, team, radar, match and tactical pages dense enough for inspection. The extra six students must not gain a guardian binding to the acceptance parent.
- Add the same eight-person roster to the six existing fixed-ID acceptance events. Retain the three completed training events, one completed match, one scheduled training event, and one scheduled tactical-match event; do not create a public seed endpoint or client-only fixture.
- Extend the completed-match projection and acceptance-coach metric records to the eight-person roster. Use the existing Figma-neutral domain objects and deterministic IDs only; labels must communicate that these are demo/acceptance records.
- Expand the existing targeted rollback so it removes every new acceptance-demo record but cannot remove other clubs, peer clients, non-demo users, or ordinary seed records.
- Update tests to prove coach-side eight-person data, parent-side two-child redaction, and file-backed restart/readback. Do not claim device visual acceptance as part of this data batch.
- Do not touch or stage the existing user-owned `project.config.json`, unused SVGs, `docs/superpowers/`, or WPS workbook.

## Acceptance Criteria

- [ ] With acceptance seeding enabled, the coach team has exactly eight members and every fixed demo event has the same eight real student IDs.
- [ ] Parent children/calendar/event projections remain restricted to the original two guardian-bound students.
- [ ] Training, attendance, lesson, assessment/radar, completed-match, tactical-board and task-list pages receive non-empty backend-backed demo objects without a frontend mock, fake role, or fake session.
- [ ] A file-backed database restart preserves the demo identity and all persisted acceptance-demo rows; a saved tactical-board readback remains intact.
- [ ] The scoped fixture and server regressions, API typecheck/build, and `git diff --check` pass.
- [ ] The commit contains only the acceptance data implementation/tests/task/progress documentation and excludes unrelated dirty files.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

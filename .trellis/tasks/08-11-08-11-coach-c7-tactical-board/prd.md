# C7 tactical board Figma restoration

## Goal

Restore the coach C7 tactical board against online Figma node 233:2 using the now-published eight-player acceptance roster; preserve real tactical-board save/read behavior and avoid any fake role, session, or data.

## Requirements

- Online Figma is the sole visual authority: [C7 MVP, node 233:2](https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=233-2). Its 375px reference uses a 351px card/pitch column, a 430px green pitch, 40px red player circles, one boundary line and one halfway line, a 48px formation field, an 86px bench card, and two 48px actions.
- Preserve the existing real coach tactical-board API (`GET`/save), server-confirmed save state, role guard, move, formation, reset, and substitute behaviors. No client-only tactical state, mock players, roles, sessions, or API responses.
- The currently published demo roster has eight real seeded students. Since Figma's 4-3-3 reference needs eleven starters plus substitutes, expand the opt-in coach acceptance data to a deterministic sixteen existing synthetic club students before changing C7 presentation. Parent BFF projections must remain limited to the two guardian children.
- Adapt the Figma geometry to the real roster: render all real starters/bench members, not duplicated sample names. A complete 4-3-3 formation has eleven starters and the remaining five real members are bench candidates.
- Keep WXML free of JavaScript array method calls; derive all display fields in TypeScript. Keep the existing mobile navigation/safe-area conventions.

## Acceptance Criteria

- [ ] Opt-in production/local acceptance data contains 16 deterministic coach-visible students, six event rosters, completed-match participation, and metric records without adding guardian bindings; the parent role still sees exactly two children.
- [ ] C7 reads the persisted tactical board and renders Figma-aligned header, context/save pill, formation control, pitch, player markers, bench, reset and save actions at logical 375px width.
- [ ] Player circles show only the real short name inside a 40px-equivalent red circle; pitch has the Figma boundary and halfway line only (no legacy centre circle or penalty-box decoration).
- [ ] Selecting, moving, substituting, resetting, saving, reload, and read-only behavior retain existing API-backed semantics and error handling.
- [ ] Focused tests first fail for the new roster/geometry contract, then pass; package typecheck, relevant API tests, root check, and `git diff --check` pass.
- [ ] Visual comparison uses C7 node 233:2 and a 375x812 capture when the DevTools path is available. Without that capture, the result is documented as static/test verified, not visually accepted.

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

# Coach C6 match Figma restoration

## Goal

Restore coach match entry and match-event add pages against the current online Figma while retaining real match persistence and acceptance demonstration data.

## Requirements

- Restore the coach match-detail page (C6, Figma `93:796`) and match-event form (C6.1, Figma `93:827`) using the current online Figma as the visual source.
- Keep C6 backed by `GET /coach/events/:eventId/match`; do not render hard-coded Figma names, score, timeline facts, or roster entries.
- Keep C6.1 backed by `POST /coach/events/:eventId/match/events` with the existing server-side roster, event-type and idempotency checks. A successful write must return to C6 and re-read the persisted detail.
- Preserve the existing, explicitly device-local draft behavior. C6.2 (Figma `93:858`) may only describe local draft state truthfully; it must not claim server-side auto-save because no such API contract exists.
- Provide sufficient acceptance-seed match data for an isolated coach demo: completed match, full roster, score, multiple timeline types, and a safe path to append then re-read a real new event.
- Do not change an existing deployed/production database as part of this task. Seed changes apply to fresh isolated databases only.
- Harden the acceptance seed gate so `FCM_CQ_TALENT_ACCEPTANCE_SEED=1` never merges demo identities or facts into a production process. This is configuration-code protection only: it neither deletes nor alters existing production records.

## Acceptance Criteria

- [ ] C6 visual hierarchy uses the soft header, 16px content rhythm, dark match hero, compact period chips, outlined add-event action, timeline rows, and coach tabbar from Figma `93:796`.
- [ ] C6.1 uses the soft header and Figma form hierarchy from `93:827`, while fields remain populated only from the real match-detail response and client capabilities.
- [ ] C6.2 does not make a false persistence claim: saved remote events are confirmed only after POST success; unfinished drafts are labelled device-local.
- [ ] The acceptance seed exposes a 16-player completed match with a real 3:2 score and at least goal, assist, yellow-card, and save timeline records.
- [ ] A focused C6/C6.1 test proves data rendering, form validation, idempotent append/re-read behavior, and truthful draft-state copy.
- [ ] API persistence tests prove an appended match event survives reopening an isolated SQLite database.
- [ ] The seed fixture proves that production ignores `FCM_CQ_TALENT_ACCEPTANCE_SEED=1`, while a non-production isolated test database may still load it deliberately.
- [ ] Full quality gate and `git diff --check` pass before commit. Runtime visual validation remains pending until a trustworthy 375x812 capture is available.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

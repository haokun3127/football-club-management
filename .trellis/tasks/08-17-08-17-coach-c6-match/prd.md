# Coach C6 match pages Figma restoration

## Goal

Restore C6 match entry, C6.1 match-event add, and C6.2 saved-draft state against Figma nodes while preserving real coach-scoped match APIs and local draft semantics.

## Requirements

- Online Figma is authoritative: `zZ6wKyOHKcO4UYXDd9jGwv`, nodes `93:796` (C6 Match Entry), `93:827` (C6.1 Add Match Event), and `93:858` (C6.2 saved-draft state), each at 375x812.
- C6 continues to read only the existing coach-scoped match-detail BFF. It must keep real match status, teams, score, timeline and event permission data; no Figma sample team, score, player, minute, or event type may be introduced.
- C6.1 continues to create events solely with the existing event-scoped `POST /coach/events/:eventId/match/events`, preserves the current idempotency key and local unfinished-draft behavior, and does not expand the allowed event types beyond backend capabilities.
- C6.2 remains a truthful device-local draft-resume overlay. It must not call an unsupplied server autosave API or state that an event has been saved remotely before the create request succeeds.
- Preserve coach role/membership and event roster scope. A parent or unauthorized coach must not gain match roster or write access.
- Use the soft 88px header, 16px page gutters, dark summary card, compact white cards, 48px controls, and the coach tab bar from the referenced Figma nodes. Long real timelines and event-type collections must remain scrollable.
- WXML is expression-only; lists and display states are precomputed in TypeScript. Do not stage pre-existing unrelated worktree files.

## Acceptance Criteria

- [ ] C6 loads a real coach match detail and renders only real teams, score status and events; its add-event entry remains available only when permitted by the current API result.
- [ ] C6.1 writes one real event through the existing API, preserves retry-safe idempotency and rereads correctly after returning to C6.
- [ ] C6.2 exposes only a locally persisted, not-yet-submitted event draft with a truthful continuation/exit flow.
- [ ] C6/C6.1/C6.2 match the online Figma hierarchy and key geometry without copying unsupported example data.
- [ ] Focused miniprogram/API regressions, typecheck, `git diff --check`, and the full repository check pass before the scoped commit.
- [ ] A trustworthy 375x812 capture is attempted for C6/C6.1; if IDE compilation fails to refresh, the exact boundary is recorded and visual completion is not overstated.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

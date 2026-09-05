# Coach and parent match record closure

## Goal

Close the real match-record loop for the coach and parent mini-programs: a coach can create or update the match summary from a full-screen page, persist it through the existing app-client API, append real player events including own goals, and a parent can see the persisted score and event timeline in the protected event detail page.

## Requirements

- Reuse the existing scoped coach match APIs and domain types; do not add fake sessions, players, scores, or API responses.
- Add a full-screen coach match editor reachable from a match workbench/detail flow. It must edit opponent, match type, status, and home/away score, and submit through `recordCoachMatch`.
- The editor must load the current match detail first, preserve the real roster, validate score fields and status-dependent score requirements, show loading/error/submitting states, and re-read the detail after a successful save before returning.
- Keep player-event entry as a separate full-screen route. It must continue to use the real roster and the backend capability list, including the `own_goal`/“乌龙球” option when returned by the API.
- Extend the parent activity-detail view model only from real `ActivityDetail.sections`/`fields` data. Display score and a precomputed event timeline when the backend supplies it; missing data remains an explicit unavailable state.
- WXML must not invoke `.map()`, `.filter()`, `.slice()`, `.indexOf()` or similar JavaScript methods. Derived labels, options and display rows belong in TypeScript.
- Keep all unrelated dirty files untouched. Use path-limited staging and one logical commit for this task.

## Acceptance Criteria

- [ ] Coach match editor is registered, reachable, full-screen, and uses the existing app header/tabbar/status components.
- [ ] Saving a match summary calls the real API with `eventId`, `matchType`, `status`, opponent and numeric scores, then confirms the saved values by a fresh detail read.
- [ ] Invalid score input is rejected locally with a visible error and no API call; cancelled matches cannot submit a score or events.
- [ ] Existing match event entry remains real-data-only and supports “乌龙球” when capability data allows it.
- [ ] Parent match detail displays a real persisted score and event timeline without exposing unrelated roster members.
- [ ] Focused mini-program/API tests, mini-program typecheck, root check, and `git diff --check` pass.
- [ ] `docs/current/progress.md` records what was verified and clearly separates static/API validation from any missing real 375×812 visual capture.

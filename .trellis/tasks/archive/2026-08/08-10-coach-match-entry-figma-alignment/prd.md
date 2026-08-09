# Align C6 match entry to Figma

## Goal

Implement Figma C6 Match Entry (`93:796`) from the current source `zZ6wKyOHKcO4UYXDd9jGwv` as a truthful coach match view over a new authorized, read-only BFF projection. C6.1 and C6.2 remain later independent pages.

## Requirements

- Route: `/pages/coach/match/index?id=<eventId>`.
- Add an authorized `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match` projection containing the real match (or null), match events, and the event's participant-derived roster. The authorization order is active coach client, coach event access, event read/type check, then projection; it must not leak an inaccessible event type or roster.
- Parent or out-of-scope coach receives 403 before an event-type response; authorized non-match event is 400; an authorized missing event is 404; match not recorded is a truthful `200` with `match: null` and `events: []`.
- C6 consumes the new projection in a TS view model: real title/team/opponent/score/status, timeline sorted by actual minute, and student names joined from the real roster.
- No Figma sample opponent, score, minute, player, assist, avatar, match type, or half-time score may be hardcoded. No half-time score or goal/assist relationship may be inferred when absent from the data contract.
- C6 only links its add-event action to the existing C6.1 route. It must remove its former inline summary, score/event forms, tactical board, and shared submit bar, and render the coach role tab bar. Its page-local `index.json` removes `submit-bar` and registers `role-tabbar`; global `app.json` is excluded.
- The time line sorts minute-bearing events ascending, then missing-minute events and ties by a stable actual field. It cannot infer goal/assist relationships or half-time scores.
- This batch does not modify match writes, Store, persistence, database schema, or migrations; it must not claim match data persists after an API restart.
- WXML uses precomputed fields, with no JS array/string helper calls.

## Acceptance Criteria

- [x] Authorized coach reads match, event timeline, and only event roster; empty match is a truthful safe state.
- [x] Unauthorized/missing/non-match access has the specified error response and no roster leakage.
- [x] C6 shows only API-backed values, sorts timeline in TypeScript, and renders a safe empty state without Figma samples.
- [x] C6 has no legacy inline form/tactical/submit-bar structure and add-event only enters C6.1.
- [ ] Focused API/page tests, package typechecks/build, and diff check pass. The C6 focused checks, typechecks, Mini Program package suite, and API build pass; the existing out-of-scope attendance persistence test still times out in the full API suite.
- [ ] Device screenshot comparison is non-blocking under the current all-pages goal and is not claimed as complete.

## Notes

- Figma: `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-796`.
- Protected unrelated work includes `apps/api/src/store.ts`, `apps/api/src/persistence/**`, `apps/api/test/persistence.test.ts`, `apps/api/test/server.test.ts`, project config, assessment work, and root WPS files.

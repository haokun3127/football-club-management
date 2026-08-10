# C6.1 Add Match Event

## Goal

Implement Figma C6.1 Add Match Event (`zZ6wKyOHKcO4UYXDd9jGwv:93:827`) as one durable, idempotent coach append operation. A successful creation is visible only after C6 re-reads its established match-detail BFF projection.

## Requirements

1. Add `POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match/events`. Do not use `POST .../coach/matches`, which records a complete match summary rather than one event.
2. Require `Idempotency-Key` length 8-128. The same key and canonical payload replay `201`; the same key with a different payload returns `409 idempotency_conflict`.
3. Request body is exactly `studentId`, `type`, optional `minute`, optional `note`. The server derives the coach, match, event, ids, timestamps, metric relationship, and stored event.
4. Match-event type is the intersection of the domain enum and `capabilities.match.eventTypes`. The current seed exposes only `goal`, `assist`, `save`, and `tackle`.
5. Validate the accessible match event, an existing match, an event-roster student, allowed capability type, integer minute `0..300`, and note length at most 500. Cancelled matches reject writes; completed matches accept retrospective event entry.
6. Preserve authorization order: active coach client, coach event access, event existence/type, then match/roster/capability/payload validation. Do not leak inaccessible match facts to parent or out-of-scope callers.
7. Generate the full event and any derived metric objects before one transaction persists the event plus metric records. Use `crypto.randomUUID` for persistent ids. Persist match, match-event, and metric-record data via migration `0008` and repository support so an API restart reads the saved event.
8. C6.1 loads real roster and capability type data; it never hardcodes Figma player names or type chips. It retains page-local inputs on validation, network, conflict, or ambiguous failure. It navigates back only on an exact `201`.
9. C6 reloads the same event in `onShow` after return. It does not receive an opener-channel payload, append optimistic timeline items, or infer event facts from the POST body.

## Acceptance Criteria

- [ ] Focused domain/API RED tests prove the absence of a scoped append route and durable restart behavior before implementation.
- [ ] Coach receives `201` for a valid single event; the body contains only canonical server facts.
- [ ] Parent, out-of-scope coach, missing event, non-match event, absent match, invalid/cancelled input, non-roster student, unsupported type, invalid minute/note, and idempotency conflict follow the approved safe status matrix.
- [ ] Same idempotency key and payload replays exactly one persisted event; changed payload with the same key returns `409`.
- [ ] File-backed SQLite close/reopen retains the event and any linked metric record; C6 GET reads the result after restart.
- [ ] C6.1 has no hardcoded player/type sample, no WXML helper invocation, no automatic retry, and preserves a failed/unknown draft.
- [ ] C6 only displays the added event after its own exact-event GET succeeds on return.
- [ ] Focused tests, API and Mini Program typechecks/package suites, migration/restart regression, task validation, and diff check pass. No commit or deployment is made.

## Scope

The authorized implementation may change only match-related domain, seed, BFF route/schema/OpenAPI/store/persistence migration/repository/tests, and C6/C6.1 Mini Program API/page/tests. Existing assessment WIP hunks in `apps/api/src/store.ts`, `apps/api/src/persistence/**`, `apps/api/test/persistence.test.ts`, and `apps/api/test/server.test.ts` remain intact and are neither rewritten nor removed.

## Out Of Scope

- Creating or overwriting a complete match through `POST .../coach/matches`.
- Automatic retry, synthetic success, optimistic match timeline entries, sample facts, deployment, commit, or visual-completion claims.

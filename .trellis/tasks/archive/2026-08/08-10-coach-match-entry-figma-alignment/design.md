# C6 Match Read Projection Design

## Boundary

The C6 page is a read-only projection over the current seed-backed match store. It does not change match writes, persistence, migrations, or restart guarantees.

## Route

`GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match` applies checks in this order:

1. Validate the active coach app client.
2. Call `requireCoachEventAccess`; its existing behavior returns `404` for a missing event and `403` before a coach can learn the type or roster of an inaccessible event.
3. Read the event and reject an authorized request for a non-match event with `400`.
4. Read match detail. Return the known event, the event-participant-derived roster, `match | null`, and match events (or `[]` when no match exists).

The projection never returns a club-wide roster, a synthesized summary, an inferred assistant relationship, or a half-time score.

## Mini Program Projection

`getCoachMatchDetail` normalizes the BFF once. The page derives display rows in TypeScript only: event/match labels, participant names where returned, and a stable timeline sorted by numeric minute ascending, then by `createdAt`, then by id. Entries without a minute sort after minute-bearing entries. The page has no inline write form, tactical link, or shared submit bar; its only write-adjacent action links to C6.1.

## Rollback

Revert the route, schema/OpenAPI entry, normalizer, and C6 page together. No persistent data or write contract is changed.

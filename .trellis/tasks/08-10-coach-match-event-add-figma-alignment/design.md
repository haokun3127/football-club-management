# C6.1 Design

## BFF Contract

`POST /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match/events`

The route first resolves the active coach app client and then `requireCoachEventAccess`. Only after that does it inspect the event. An authorized non-match event returns `400`; a missing match returns `404`; a cancelled match returns `409`; a completed match remains writable for retrospective entry.

The body is `{ studentId, type, minute?, note? }`. The route resolves the authenticated coach and active club, finds the existing match, constrains `studentId` to the event participant roster, and intersects the domain `MatchEventType` values with `capabilities.match.eventTypes`. The request cannot choose a match id, actor, score, roster, player name, or linked metric.

The route requires an 8-128 character `Idempotency-Key`. A canonical fingerprint includes the route club/event, authenticated coach, and all body fields. A matching stored key/fingerprint returns the original `201`; another fingerprint for the same key returns `409 idempotency_conflict`. The idempotency record and event/metric writes share one transaction.

## Domain and Persistence

Add a single-event domain service entrypoint rather than making the client construct a `RecordMatchInput`. It creates every `MatchEvent` and derived `PlayerMetricRecord` before invoking stores, then saves the bundle atomically. Persistent ids use `crypto.randomUUID`.

Migration `0008` and a match repository persist `matches`, `match_events`, and `metric_records` using the existing SQLite migration/repository conventions. `PersistentApiStore` reads the persisted bundle into match detail after a restart and writes it transactionally with the existing idempotency repository. Assessment repository/work in-flight code is retained as-is.

## Client Data Flow

C6.1 requests only route-backed data needed to render selectable roster/type values. It holds a page-local draft and a stable operation key for unchanged inputs. It submits once, treats only `201` as success, then uses `navigateBack`. C6 `onShow` calls its existing exact-event GET; that result, rather than the POST response or opener channel, renders the updated timeline.

The Figma page controls are adapted to WXML/WXSS, not copied as sample data. The Figma substitutions type must not appear unless it is returned by the approved type contract.

## Failure Behavior

Client errors are fixed safe messages. `400`, `403`, `404`, `409`, network failure, and an unknown completion preserve draft values and do not navigate. A user can explicitly retry an unchanged request using its key. Changes to material input create a new key. No local storage, automatic retry, or optimistic row is permitted.

## Rollback

Revert the new domain append entrypoint, persistence migration/repository path, POST schema/route/OpenAPI, Mini Program normalizer/page, and C6 reread behavior as a single slice. Do not remove assessment WIP or mutate unrelated persistent rows.

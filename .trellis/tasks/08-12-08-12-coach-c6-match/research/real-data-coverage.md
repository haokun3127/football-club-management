# C6 real test-data coverage

## What a credible coach check needs

1. A completed match visible to the coach with a real team, opponent, score and roster.
2. More than one timeline row so ordering, chip colours and long/short content can be inspected.
3. At least one successful coach write from C6.1, followed by a real C6 re-read.
4. A failed/offline draft state that is clearly labelled as device-local instead of as a server save.
5. A restart proof against a disposable file-backed SQLite database.

## Current audit

- `event-cq-talent-demo-match-completed` already supplies a completed 3:2 friendly, 16 present participants, 16 match-roster entries, and two records: a goal and an assist.
- The database/API already enforce coach membership, match-event scope, event roster, event types and idempotency; they also have a file-backed restart test.
- The acceptance seed lacks a yellow-card and save event, leaving the timeline visually too sparse for the Figma C6 composition.
- The model lacks opponent-side event and per-half-score fields. Those sample facts must not be fabricated by the client.

## Safe data boundary

Seed facts are loaded only when a fresh isolated non-production database is created. The `FCM_CQ_TALENT_ACCEPTANCE_SEED` opt-in must be ignored in a production process. Existing databases are not overwritten, deleted or backfilled. Any interactive data mutation for verification must point to a disposable SQLite path, never the production/deployed database.

## Canonical aggregate decision

The live acceptance seed is the sole canonical manual-demo aggregate: `event-cq-talent-demo-match-completed` is a completed friendly with 16 present participant and match-roster students, a persisted 3:2 score, existing goal and assist facts at minute 22, plus task-added yellow-card and save facts at distinct minutes. A smaller six-player/2:1 fixture is not used for this task.

The file-backed API test must create its own temporary database directory and assert the resolved SQLite path lies inside it before any write. Its acceptance proof is GET -> POST -> replay -> changed-payload conflict -> GET -> close -> reopen -> GET, where the newly appended event is present exactly once after reopening.

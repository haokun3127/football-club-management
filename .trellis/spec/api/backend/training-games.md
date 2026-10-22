# Training games

A training game is a separate aggregate within an authorized training event. It never creates a formal Match, attendance fact, credit transaction, team membership or assessment result.

## Ownership

- `packages/domain/src/training-game.ts`: content/state validation only.
- `application/training-games.ts`: source snapshots, current course roster, publication projection, request hashes and revisions.
- `application/training-game-repository.ts`: repository contract and memory adapter.
- `persistence/training-game-repository.ts`: atomic root/participants/events/revision writes. Migration `0045` only adds tables.
- `routes/training-game.routes.ts` and `http/training-game-schemas.ts`: existing membership, active role, app-client and course/team authorization plus strict schemas.

## HTTP boundary

Under `/clubs/:clubId/app-clients/:clientId`:

| Path | Operations |
| --- | --- |
| `/coach/events/:eventId/training-games` | GET context/list; POST draft from `contentBlockId` |
| `/coach/events/:eventId/training-games/:gameId` | GET detail/history; PATCH full content |
| `/coach/training-games?teamId=...` | Authorized team directory |
| `/parent/events/:eventId/training-games?studentId=...` | Guardian + course scope, completed games containing that child |

`FCM_TRAINING_GAME_CLUBS` is an explicit comma-separated allowlist, default off. Disabled writes are rejected; existing authorized records remain readable. Clients must distinguish an unavailable endpoint from an empty collection. Never turn a 404 or failed read into “0 games”.

The public OpenAPI registry in `http/openapi.ts` is separate from Fastify route registration. Register all four paths and six operations using the existing `trainingGameSchemas`; required `studentId`/`teamId` query parameters must follow the schema's `required` array. The OpenAPI regression in `test/server.test.ts` checks operation coverage, required scope/revision/request fields and nullable integer scores. Union member order is not semantic and may be normalized by schema compilation. A runtime route alone is not a complete documented contract.

## Invariants

- New games require a current SessionPlan block whose drill has `recordingCapability: friendly_match`. Each game has its own ID; a block may contain multiple games. Store only block ID and necessary plan/drill/name/revision snapshot. Source replacement does not delete history.
- New participants must belong to the authorized course. Existing game participants retain their name snapshots after course roster changes; this does not authorize adding unrelated students.
- Both scores are null, or both are integers 0–999. Null is unrecorded; 0:0 is valid. Partial personal events never calculate or overwrite the score.
- Events are goal/assist/save, optional student, optional integer minute 0–300, bounded note. A linked student belongs to the selected game side.
- Draft → completed requires an explicit client action. Changes to completed games or voiding require a reason. Voided is terminal. No automatic publication on blur or save draft.
- Parent responses use an explicit allowlist: completed score and their own events. No other roster, actor IDs or free-text notes (notes may mention other children). Cancelled courses produce no parent game results.

## Revisions and uncertain writes

Writes carry `requestId`; PATCH also carries `expectedRevision`. A request hash includes actor and operation. A repeated identical request returns its original immutable response, even after newer revisions. Reusing a key for different content or using a stale revision yields 409. Root, children and audit snapshot commit in one transaction; a failed audit write rolls back all changes.

The native editor persists a draft scoped to environment/club/user/event/game or source block. Network/5xx failures freeze editing and retry the exact pending body/key. Unknown create outcomes must resolve the original create request before discarding/reloading, preventing a duplicate game. 409 keeps local content until explicit confirmation to reload. First save creates the draft then patches content; page load never writes.

**AJV coercion pitfall:** use `type: ["integer", "null"]` for nullable numeric inputs. An `anyOf` whose first branch is `null` can coerce a real score to null. Tests must cover null, zero and nonzero numbers over HTTP, not only the domain function.

## Verification

`apps/api/test/training-games.test.ts` covers authorization, guardian projection, multiple games, old roster retention, source changes, cancel/feature-off, immutable replay, conflict, void, SQL failure rollback and file DB migration/reopen. Migration fixtures include existing friendly/internal Match records; they are left intact. This fixture is not an inventory of any deployed database. Native tests cover local draft recovery and delayed cross-child/team reads. Real device and deployment verification remain separate gates.

# Technical Design

## Login BFF

`POST /clubs/:clubId/app-clients/:clientId/wechat-login`

Request:

- `wxLoginCode`
- `phoneCode` or encrypted phone payload

Response:

- `status`: `authenticated` | `binding_required` | `identity_not_found` | `identity_conflict` | `disabled`
- `session`: token, expiry, user id
- `role`: `parent` or `coach`
- `profile`: parent/coach summary
- `children`: parent role only
- `capabilities`

Rules:

- Do not accept role from client as source of truth.
- `roleHint` may only be telemetry/debug input and must not override backend identity.
- If a phone maps to both parent and coach in one club, return conflict and require backoffice resolution.

## Parent Calendar BFF

`GET /clubs/:clubId/app-clients/:clientId/parent/calendar?from=&to=`

Response:

- `children`
- `events`, each including `studentIds`, student display names, type, title, timeRange, team, coach, status, read-only detail affordance.
- Permission is by guardian binding.

## Training Project Tree

`GET /clubs/:clubId/app-clients/:clientId/coach/training-project-tree`

Response shape:

- `coreAbilities[]`
- `secondaryItems[]`
- `atomicItems[]`
- `recommendedTrainingItems[]`
- `metricBindings[]`
- `sourceVersion`

The response is derived from the assessment/training catalog already configured for 重庆天才, not from mini-program literals.

## Event Training Projects

`PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects`

Request:

- `projectItemIds`
- `notes`
- optional planned duration/intensity fields if platform model supports them

Response:

- saved selection
- ability coverage summary
- updated workbench workflow

Rules:

- Require coach access to `eventId`.
- Use `Idempotency-Key`.
- Reject unknown project ids or ids outside club capabilities.

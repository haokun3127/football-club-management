# Multi App Client Capability

The platform supports multiple frontends per club without forking the business model.

## Contract

- Core business data remains club-scoped: students, teams, calendar events, training, matches, assessments, operations status, integrations, and metric graphs.
- App differences are represented by `ClubAppClient` configuration, not by mini-program-specific domain models.
- A club can register multiple clients, including WeChat mini-programs, official accounts, Douyin, Video Account, Xiaohongshu, and admin portals.
- `/clubs/:clubId/capabilities` returns the generic club capability contract.
- `/clubs/:clubId/capabilities?clientId=...`, `?appId=...`, or `?clientKey=...` returns the same contract with a `client` block and client-level feature overrides.
- `/app-clients/resolve?appId=...` or `?clientKey=...` lets a frontend bootstrap from its app identity to `clubId`, `clientId`, and client-scoped capabilities.
- `/clubs/:clubId/admin/app-clients` lets admin/operator consumers list configured clients for the club.
- Client-facing BFF APIs sit under `/clubs/:clubId/app-clients/:clientId/...` so a mini-program consumes stable role-specific aggregates instead of stitching admin APIs together.

## Client Configuration

`ClubAppClient` stores:

- channel and app identity: `channel`, `appId`, `clientKey`,
- visual/runtime hints: `theme`,
- navigation and role entrypoints,
- client-level `featureOverrides`,
- visibility policy hints such as parent metric scope and insurance/lesson status visibility.

This means 重庆天才足球俱乐部 can ship a parent/coach WeChat mini-program and an admin portal from the same backend, while a future club can define different client navigation or feature switches without changing core facts.

## Mini-program Consumption APIs

The first WeChat mini-program uses:

- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/home`
  - Returns student summary, offline lesson/insurance status, upcoming and recent activities, latest metric records, metric trends, and recent sync runs.
- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/schedule`
  - Returns the bound student's training, match, and other activities, optionally filtered by `from` and `to`.
- `GET /clubs/:clubId/app-clients/:clientId/events/:eventId`
  - Returns event detail for coach/admin users or for parents whose bound child participates in the event.
- `GET /clubs/:clubId/app-clients/:clientId/coach/home`
  - Returns the coach daily workbench with events, students, teams, and workflow flags for attendance, record entry, and assessment.

Each route validates the active `ClubAppClient` and the relevant role entrypoint. For example, the 重庆天才 admin portal client cannot be used to call parent mini-program APIs.

Recommended frontend startup:

1. Resolve identity with `/app-clients/resolve?appId=...` or `?clientKey=...`.
2. Store `clubId`, `clientId`, and returned `capabilities` for the session.
3. Render navigation and field visibility from `capabilities.client`.
4. Use the app-client BFF APIs for parent and coach workflows.
5. Use admin APIs only in backend/admin tooling, not in the mini-program.

## Boundaries

- Mini-programs only consume backend capabilities and business APIs.
- WPS credentials, field mappings, sync policies, and confirmation flows stay in backend integration/admin APIs.
- Client configuration may alter presentation and enabled modules, but it must not create separate student, training, assessment, payment, insurance, or schedule models.

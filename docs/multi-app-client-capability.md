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

## Client Configuration

`ClubAppClient` stores:

- channel and app identity: `channel`, `appId`, `clientKey`,
- visual/runtime hints: `theme`,
- navigation and role entrypoints,
- client-level `featureOverrides`,
- visibility policy hints such as parent metric scope and insurance/lesson status visibility.

This means 重庆天才足球俱乐部 can ship a parent/coach WeChat mini-program and an admin portal from the same backend, while a future club can define different client navigation or feature switches without changing core facts.

## Boundaries

- Mini-programs only consume backend capabilities and business APIs.
- WPS credentials, field mappings, sync policies, and confirmation flows stay in backend integration/admin APIs.
- Client configuration may alter presentation and enabled modules, but it must not create separate student, training, assessment, payment, insurance, or schedule models.

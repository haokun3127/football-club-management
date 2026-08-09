# Technical design: safe C5.1 lesson correction

## Scope boundary

This task owns only the correction request contract, its focused API tests, the Mini Program request/API helpers, the C5.1 page, its focused tests, and the app-client BFF contract. It must not modify Store, persistence repositories, migrations, `app.json`, page JSON, or other pages.

## Data and security contract

`PATCH /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation` accepts `studentId`, `lessonDelta`, and optional `reason`, plus `Idempotency-Key`. `lessonDelta` is exactly `-0.5` or `0.5`; `actorUserId` is rejected. The route requires a resolved authenticated coach, event access, and membership of `studentId` in that event.

The ledger source ID is a SHA-256 derivative of club, event, student, authenticated actor, and idempotency key. A matching existing ledger entry is a replay; any same-key payload conflict is `409`. Existing Store source-ID uniqueness supplies the final persistence guard, so no migration is needed.

## Page behaviour

The page reads workbench and confirmation data together and displays only their student-ID intersection. It uses true ledger balances. Each changed row has a stable operation key, refreshed only if that row's editable payload changes. Saves occur in stable order. On failure it stops, re-reads both sources, retains uncertain row keys for an explicit retry, and never reports an all-success state or navigates away after partial work.

## Risks and rollback

Network outcomes can be unknowable; the page must not label those rows as definitely unsaved. The API change is intentionally strict and may reject legacy client payloads containing `actorUserId`; focused compatibility tests cover the current route. Rollback is one file-allowlisted commit and needs no database rollback.

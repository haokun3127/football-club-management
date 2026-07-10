# Technical Design

## Coach Workbench Contract

- Extend `GET /clubs/:clubId/app-clients/:clientId/coach/home` with optional `from/to`; `date` remains supported.
- Response workbench contains `dateRange`, `summary`, normalized `tasks`, and accessible events.
- Task priority: attendance -> lesson confirmation -> match result -> assessment -> training content -> view.
- Mini-program renders the backend workflow and capabilities; backend remains the permission authority.

## Parent Calendar and Details

- Empty `activeStudentId` means all children. The UI uses a compact selector and never defaults to the first child on the family calendar.
- Normalize activity detail into discriminated training/match/other sections while preserving pending fields as user-language status.

## Navigation and Writes

- Role tabs use `wx.reLaunch` so role roots replace the page stack.
- Match assist uses an explicit nullable selection; capabilities provide allowed event types.
- Coach workbench returns selected training projects resolved from the event session plan. Training editing starts from that selection.

## Compatibility

- Existing `coach/home?date=` callers and smoke remain valid.
- Existing event and training write paths remain unchanged.
- No new domain models or database migrations.

## Rollback

- API query/response additions are backward compatible.
- Each UI area can revert independently because existing routes remain unchanged.

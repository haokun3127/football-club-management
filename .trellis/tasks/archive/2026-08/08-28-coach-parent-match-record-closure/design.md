# Match record closure design

## Scope and routes

The implementation stays inside the existing app-client BFF and mini-program patterns. Add `pages/coach/match-edit` as a full-screen editor. Keep `pages/coach/match` as the read-only/detail timeline page and `pages/coach/match-event-add` as the separate event writer. Add a “编辑比赛” action to the coach match detail page and route the workbench’s “比赛录入” action to the detail/editor flow without changing the event workbench contract.

## Data flow

```text
coach session
  -> GET .../coach/events/:eventId/match
  -> TypeScript view model (labels, score fields, options)
  -> POST .../coach/matches
  -> GET .../coach/events/:eventId/match
  -> navigate back only after persisted values match the response

parent session
  -> GET .../events/:eventId
  -> real sections/fields
  -> TypeScript score + event timeline projection
  -> parent full-screen match detail
```

The existing `POST .../coach/matches` route is the source of truth for summary writes. It already accepts `eventId`, `matchType`, `status`, `opponentName`, `homeScore`, `awayScore`, rosters and events. The mini-program sends only the fields supported by the current contract. No route or database migration is needed unless tests expose a real contract gap.

## Editor behavior

- `onLoad` requires coach role, reads the match detail, and populates the match type/status selectors and score inputs.
- Match type labels are Chinese view-model labels for the existing values `friendly`, `league`, `cup`, `internal`.
- A completed match requires non-negative integer scores. Scheduled matches may leave scores blank; cancelled matches cannot be saved with score data.
- On save, create an idempotency request through the existing API helper, then call `getCoachMatchDetail` again. Only after the response contains the submitted summary does the page navigate back.
- All UI states are page-owned and represented by precomputed fields so WXML remains method-free.

## Parent projection

The parent page must not infer facts from the coach page or local storage. It reads the existing activity-detail `sections` and `fields`. A match timeline is rendered only when the API detail includes event items in a structured section; otherwise the page shows the existing unavailable copy. Participant rendering remains the already redacted `detail.participants` response.

## Error and rollback boundaries

Expected validation failures stay on the page. API failures retain the page and display a retryable error. The task is isolated to the new editor, match detail projections, route registration, focused tests and progress documentation. Existing unrelated dirty API/persistence/config files are not staged.

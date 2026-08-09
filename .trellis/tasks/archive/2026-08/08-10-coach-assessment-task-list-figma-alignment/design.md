# C11 assessment task list design

## Scope and source

The only design authority is Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1002` (C11 Test Task List). The page consumes the already-present read-only BFF endpoint and introduces no backend contract.

## Data model and interaction boundary

`GET /clubs/:clubId/app-clients/:clientId/coach/assessment-tasks` is the source of task rows. The page derives a display view model per real row:

- status copy/style and `isEntryEnabled`;
- formatted date range;
- raw-count progress copy and clamped numeric progress width;
- selected-filter membership and `visibleTasks`.

The assessment-entry route only accepts a template ID and title. Therefore an in-progress list row navigates with its own real `templateId`; an unstarted task reports it has not begun, and a completed task reports that no read-only detail is available. These states never open the writable form.

## Failure and refresh behavior

The page must not surface backend error text. It keeps a single safe error message and an independent successful-load marker (not inferred from list length). After one successful first load, including a successfully loaded empty list, `onShow` refreshes the list so returned assessment entry work can change server-derived status. A loading guard prevents an initial double request and concurrent `onShow` refreshes.

## Non-goals

No fixed Figma example tasks, dates, counts, task creation, completion write, deadline reminder, task detail, shared header/tab-bar refactor, API, persistence, store or configuration changes are part of this task.

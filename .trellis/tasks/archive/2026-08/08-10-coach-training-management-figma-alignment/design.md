# C8 Training Management Design

## Boundary

C8 is a page-owned, read-only presentation of two existing BFF reads. It does
not alter API helpers, routes, Store, persistence, migrations, shared
components, or global page registration.

## Inputs and Truthful Semantics

After `requireRole("coach")` succeeds, the page computes the current local
calendar month's inclusive `YYYY-MM-DD` range and starts these reads together:

1. `getCoachHome({ from, to })` supplies the current-month event list and
   `summary.matches`.
2. `getCoachTeam()` supplies the coach scope's trailing-30-day
   `trainingCount`, `attendanceRate`, and `memberCount`.

The hero labels are fixed to their source meanings:

- `近30天训练` -> `team.stats.trainingCount`
- `近30天出勤率` -> `team.stats.attendanceRate`, rendered as `--` only when
  the API returns `null`
- `近30天执教学员` -> `team.stats.memberCount`
- `本月比赛` -> `home.summary.matches`

Cards are derived only from `home.events` whose type is `training`; match
events never appear as training cards. Existing API normalizer safe text can
be shown, but a participant count is rendered only when
`typeof participantCount === "number"`. The page cannot claim raw-field
absence that the existing normalizer does not expose.

## Page Projection and Navigation

TypeScript derives hero metric rows and card rows, including conditional flags
for venue, participant count, and status. WXML reads those fields only and
does not invoke JavaScript helpers.

The only C8 destinations are:

- `/pages/coach/event/index?id=<eventId>` for a real training card ID
- `/pages/coach/team-ability/index`
- `/pages/coach/team/index`

The prior C10 workbench, project tree, project selection, search, save,
assessment, and content-selection behaviours are removed. Local page JSON
retains only `role-tabbar` and `status-view`.

## States and Rollback

The page clears every hero and card field before loading and on either read
failure. No coach session means no requests. An empty current-month training
list is an explicit empty state while retaining only truthful metric values.

Rollback is a single revert of the five page-owned files and task metadata;
no data, API contract, or shared component changes are involved.

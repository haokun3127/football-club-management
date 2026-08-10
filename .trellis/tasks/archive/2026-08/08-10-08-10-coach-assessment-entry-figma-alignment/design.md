# Design: C15 Coach Assessment Entry

## Source and Scope

The sole design reference is `zZ6wKyOHKcO4UYXDd9jGwv / 93:1132 / C15
Assessment Entry`. Its layout informs the local page header, grouped entry
cards, save action, and coach tab bar. Its displayed students, groups, scores,
and other assessment facts are sample content and are never copied into the
application.

## Data Flow

`route(templateId, title)` -> `requireRole("coach")` -> parallel
`getAssessmentForm(templateId)` plus `getCoachTeam()` -> page-local view model
-> `submitCoachAssessment()` -> authenticated app-client BFF.

The route has no event id. `assessedByCoachId` remains absent from the
mini-program body: the BFF maps the authenticated membership to a coach. A
mapping failure is a safe page error, not a client-side fallback identity.

## Request Status Contract

`RequestOptions` gains an optional exact `expectedStatus`. When omitted, the
existing `200-299` success rule is unchanged. When set, any status other than
that exact value rejects as an unconfirmed request. The assessment helper sets
`expectedStatus: 201`; this makes a `200` response unsafe for local draft
removal and navigation.

## Page Model

- A monotonically increasing load token protects both success and failure from
  older concurrent form/team loads.
- Groups are keyed by `groupId`. A visible field requires its real
  `testItemId`; no field-id fallback is permitted.
- The page-local draft key includes template id and version. Restored values
  must match both the latest form test-item set and the latest team member set.
- A local signature detects whether the stored draft belongs to this current
  team/form projection. It is not an Idempotency-Key and makes no replay
  guarantee.
- The submit lock covers all sequential student writes. A `201` clears only
  that student's draft. Errors and unknown outcomes keep values intact; the
  page uses fixed safe copy and never exposes a server message.

## Boundaries and Rollback

No server, persistence, route, authentication helper, shared component, or
C15.1 page changes belong to this batch. Reverting this batch means reverting
only the C15 page, request/API helper status option, associated tests, and its
task artifacts; local drafts are best-effort client state and are not deleted
on an unconfirmed write.

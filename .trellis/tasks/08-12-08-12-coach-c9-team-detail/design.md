# C9 team detail design

## Data flow

`GET coach/team` remains the authority for the current coach's team, members
and scoped performance totals.  C9 will render `stats.completedTrainingCount`
beside the Figma text `累计训练`; the rolling 30-day field remains available for
pages that explicitly name that period.

The existing `GET coach-team` endpoint is a club-scoped content slice, not a
current-coach team-scoped roster.  C9 therefore omits the Figma coach-card
section until the backend exposes an appropriately scoped contract.

## View model

The page converts only the existing team members into its compact view model.
WXML only loops through those values and performs no array-method calls.

## Rollback

The batch is confined to the C9 page, its focused test and task/progress
records.  Reverting its single commit restores the old C9 layout without
affecting API payloads, shared navigation or other coach pages.

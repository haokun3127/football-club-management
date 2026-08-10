# C6.2 Design

## Local Draft Contract

The client stores one versioned record per event id. It contains `{ eventId, studentId, type, minute?, note?, updatedAt }` and never includes a match id, name, roster, score, timer, session, API response, or server-persistence claim. The storage helper returns no draft when parsing or schema validation fails.

C6.1 saves only after valid user modification and clears only after exact `201`. C6 validates the record after the existing match-detail GET against the current event id, roster, and coach capability event types.

## Boundaries

The change is Mini Program only. C6.1 append remains independent and C6.2 never creates timeline rows, sends a new request, or changes server data.

## Figma Adaptation

Retain the dimmed C6 background, modal geometry, confirmation hierarchy, and direct C6.2 icon. Replace Figma sample text with local-draft copy and actual local update time. Hide timer, pause, end, sample score, and sample event controls. Continue opens C6.1 for the same event; Exit uses one `navigateBack`.

## Rollback

Revert the local draft helper and page-specific C6/C6.1 state only. No API, database, migration, assessment row, or behavior is part of the rollback.

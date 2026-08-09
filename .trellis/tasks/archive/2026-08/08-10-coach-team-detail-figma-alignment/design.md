# C9 Technical Design

## Data Boundary

C9 is a read-only projection of the existing `getCoachTeam()` response. Its
statistics already describe the authenticated coach's trailing 30-day scope;
the page must label `trainingCount` as `近30天训练` and must not aggregate a
second value locally. `attendanceRate: null` displays as `--`.

`team: null` is an honest page empty state: do not invent a team name, season,
member count, or member rows. When `team` exists but `members` is empty, keep
the API-backed hero visible and render a separate honest member empty state.
Only rows with an API member ID can navigate to the existing student-radar
route.

## View and Safety

The page owns its custom 176rpx, border-box pink navigation bar and uses the
existing `/assets/icons/chevron-left.svg`; no asset is added. It renders only
the existing role tab bar and status view, with `training` active. TypeScript
precomputes visibility flags, labels, initials, and deterministic decorative
color themes. WXML must not invoke helpers and must not contain Figma's sample
facts or a coach-group section.

Errors use a fixed safe message. The page never renders an upstream error
string. A non-coach stops before the BFF request.

## Rollback

The work is limited to this page and task artifacts. Reverting these files
restores the old screen without API, shared-component, configuration, asset, or
backend rollback work.

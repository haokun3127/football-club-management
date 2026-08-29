# C1 教练球队全屏选择改版 — 设计方案

## Source of truth

- Figma file: `zZ6wKyOHKcO4UYXDd9jGwv`
- Current C1 baseline: `529:7 / C1 Coach Home — Team Selector V2`

## Interaction

The home-page selector is a concise summary of the active backend-synchronized team. Tapping it opens a dedicated full-screen C1.1 page. C1.1 has a visible back control, title “选择球队”, a current-selection indicator, and a list of real teams. Selection returns to C1 with the chosen team as active context. No team administration operation is shown.

## Data boundary

The existing `CoachHome.teams: string[]` is read-only source data. The UI stores the selected team name as local presentation state; it must not fabricate team membership, totals, or backend mutations. Events are locally projected to the chosen team only when their real `teamName` matches.

# C14 Team Ability Figma Restoration

## Goal

Repair the coach team-ability overview against Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1106 / C14 Team Ability Overview`, including the user-reported overlap between radar, empty state and overall score.

## Requirements

- Use Figma's 88px header, 16px inset, 520px dark radar card, 320px radar, summary below the radar, and trend chip at the lower left.
- Keep existing `getCoachTeamAbilityOverview()` and `getCoachTeam()` reads. Scores, dimensions, trend, team context and ranking-unavailable state must stay API-derived.
- A radar-insufficient state must not render a score or trend that implies a real radar result. The empty text must occupy the plot without overlapping any summary.
- Do not invent Figma period, team name, rankings, export behaviour, or metrics; export remains visibly unavailable.

## Acceptance Criteria

- [ ] The hero geometry has enough vertical room for its title, 320px radar or empty state, overall result and trend without overlap at 375px width.
- [ ] The data-backed radar state and the insufficient-data state each render mutually exclusive plot/summary elements.
- [ ] Existing role/error guards and real overview projection remain covered by focused tests.
- [ ] Focused tests, mini-program typecheck, root check and diff check pass before a dedicated commit.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

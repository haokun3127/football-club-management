# Growth History and Bulk Assessment Redesign

## Goal

Make a parent able to trace a player's completed lessons, matches, and ability-model changes, while giving coaches a fast, project-first workflow for entering a semester assessment for an entire team.

## Confirmed product decisions

- Online Figma file `zZ6wKyOHKcO4UYXDd9jGwv` is the only design authority. The current V6 source frames are retained; the redesign is added as non-destructive V7 frames before code is changed.
- A completed training lesson shows cumulative attendance progress at that point in time: actual attended lessons / scheduled lessons, for example `18/22`.
- Parent Growth contains a full-screen ability-model history. Each item exposes the update time, source (`课堂训练` or `学期测评`), affected dimensions, previous score, current score, delta, and a link to its source training or assessment when available.
- A match card opens a full-screen match detail. It contains opponent, date/time, venue, final score, and the player's goals, assists, fouls, and other personal match events.
- Semester assessment entry is project-first: choose an assessment task, choose one assessment project, then continuously enter all team members in one list. Rows show avatar, name, raw result, and a rule-derived score; manual scoring is only available when no conversion rule exists.
- Project drafts are preserved by task + assessment project, so moving to the next project never loses entered rows. The page shows completed / incomplete counts and keeps `保存本项目` and `下一项目` above the tab bar and safe area.
- Coach ability overview, student radar, and assessment task pages use the standard full-screen back affordance, fixed top bar, full title visibility, and non-obscured bottom actions.

## Requirements

### R1 Parent training and timeline

- Training history must render per-event lesson progress supplied by real attendance data.
- Growth timeline must distinguish training, match, and ability-model update records without a white card border artifact.
- Ability updates must have a reachable history page rather than only a passive timeline label.

### R2 Parent match detail

- Match-history and timeline match entries must navigate to a full-screen detail page.
- The detail page must render data from the app-client API and degrade safely when optional personal event fields are absent.

### R3 Coach assessment visual reliability

- `team-ability`, `student-radar`, and `test-tasks` must meet the V7 layout: usable back control, untruncated title and labels, wider radar, and fixed actions that clear the role tab bar / safe-area inset.

### R4 Project-first bulk semester assessment

- A task first exposes its configured assessment projects.
- Selecting a project opens a whole-team batch entry list instead of a per-student, per-page sequence.
- The batch save operation remains bound to the selected assessment task, training team, student, project/template, current coach, and timestamp.
- Raw result remains the primary input. Scoring is generated from configured rules when present, otherwise a manual normalized score is accepted.

## Acceptance criteria

- [ ] Figma V7 frames exist for parent growth overview, ability history, match detail, assessment tasks, bulk project entry, and coach radar/ability layout; screenshots have been read back after writes.
- [ ] A parent sees correct cumulative lesson progress in training history and can open both match detail and ability-model history.
- [ ] The parent match detail includes opponent, time, venue, score, and available personal events.
- [ ] Ability history shows source, affected dimensions, before/after score, and delta for each update record.
- [ ] A coach can select an assessment project and enter/save a whole team's raw results without losing per-project drafts.
- [ ] The resulting records use the existing real assessment API contracts; no fake session, role, API response, or client-only persistence is introduced.
- [ ] Targeted API and mini-program tests pass; `git diff --check` passes. Existing repository-wide blockers are reported separately if still present.

## Out of scope

- Changing the confirmed attendance / course-settlement rule.
- Creating a new assessment scoring engine when an existing configuration rule can be used.
- Replacing historical Figma source boards, backend role/session rules, or unrelated coach scheduling features.

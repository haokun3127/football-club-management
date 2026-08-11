# Coach C13 student radar visual audit

## Goal

Restore the C13 student radar layout against its current online Figma node
while preserving the current coach-scoped real radar data and honest feedback
state.

## Requirements

- Design authority: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1080 / C13 Student Radar`.
- Maintain the existing real `coach/team` member scope and per-student
  `coach/students/:id/radar` read.  Do not embed Figma sample players, scores,
  dates, coach identity or evaluation copy.
- Align the page-local pink header, selector strip, 260px dark radar card,
  220×180 radar canvas, score, dimension card and training tab with Figma
  geometry without changing the API/data contract.
- The page header must preserve its 88px content height below the real safe
  inset; it must not compress that height through border-box sizing.
- Keep a missing feedback message explicit rather than presenting a Figma
  sample comment as factual coach feedback.

## Acceptance Criteria

- [ ] A focused regression fails for the compressed safe-area header and
  passes with the Figma-compatible header box model.
- [ ] The radar canvas/score use the current real metric values and do not
  introduce hard-coded sample labels or evaluation text.
- [ ] Focused test, mini-program typecheck, root check and `git diff --check`
  pass before commit.
- [ ] The Figma node and no-authenticated-screenshot boundary are recorded;
  runtime visual completion is not claimed without a credible 375×812 capture.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

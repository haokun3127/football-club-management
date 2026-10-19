# C8 training Figma restoration

## Goal

Restore coach C8 training against online Figma node 93:896 with real persisted training plans and demo event data; preserve API contracts and avoid fabricated frontend content.

## Requirements

- Online Figma node `93:896` is authoritative. At 375px it defines an 88px top navigation, 180px dark hero with 20px padding, a 2×2 grid of 64px statistic cards, a 48px three-tab row, 22px list side insets, and 114px training cards.
- C8 must continue to read only real coach-home/team BFF data. Existing 30-day training count must not be relabelled as cumulative training. Add a server-derived cumulative training count only if it can be calculated from persisted coach-visible events.
- Training cards remain real training events only; event navigation, ability overview, team management, role guard, loading/error states, and no-WXML-method constraint remain intact.
- Do not introduce sample team names, venues, attendance counts, roles, sessions, or frontend-only data.

## Acceptance Criteria

- [x] Hero metrics correspond exactly to their truthful sources: cumulative training, actual attendance rate, active team members, and current-month matches.
- [x] C8 geometry and hierarchy match node `93:896` while retaining the project navigation/safe-area conventions.
- [x] Focused red-to-green tests cover metric semantics and Figma geometry; typecheck, root check, and `git diff --check` pass.
- [ ] A 375×812 comparison is recorded when the DevTools path is available; otherwise the lack of runtime visual proof is explicit.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

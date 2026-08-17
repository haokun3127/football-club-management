# Coach C9 team detail Figma restoration

## Goal

Restore pages/coach/team to online Figma node 93:924 using real coach-team BFF data, regression tests, focused verification, and an isolated commit.

## Requirements

- Online Figma is authoritative: `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:924` (C9 Team Detail, 375×812).
- Restore the soft-pink 88px custom header, 16px-gutter dark team summary, three real team statistics, four-column member grid, and horizontal coach-card section shown in C9.
- Team name, season, counts, attendance, students, coaches and coach role labels must come from real, coach-authorized server data. Do not copy Figma sample names, counts, roles, or seasonal values into production view models.
- Preserve current coach-role and coach-scope protection, empty/error behavior, and member-to-radar navigation. A parent or an unauthorized coach must not gain team/member/coach information.
- Keep WXML declarative: derive layout/view fields in TypeScript and do not use JavaScript methods in WXML.
- Scope is C9 only: the team-detail BFF contract, client type, C9 source/tests and progress/task records. Do not stage pre-existing unrelated worktree changes.

## Acceptance Criteria

- [x] The C9 hero renders only the real scoped team name, season, member count, completed-training count and attendance rate supplied by the coach team BFF.
- [x] C9 displays real scoped learners in the Figma four-column grid; tapping a learner still opens that learner's coach radar route.
- [x] C9 displays active, scoped coach cards only when the BFF provides them. The empty/error states do not invent coaches or conceal the normal custom layout behind a ready-state status host.
- [x] The page hierarchy and key geometry match online node `93:924`: 88px soft header, 16px gutter/cards, 44px avatars, 12px inter-card gaps, 140px horizontal coach cards, and coach tab bar.
- [x] A focused regression test first fails for the missing coach/data/layout contract, then passes after the smallest implementation; miniprogram typecheck, `git diff --check`, and full repository check pass before the scoped commit.
- [x] A 375×812 DevTools route/system-info check was completed. The screen-pixel crop was attempted but rejected because the current Windows host exposed no detectable iPhone X notch; no image was accepted as visual proof.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

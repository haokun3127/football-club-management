# Align parent service pages to Figma

## Goal

Align P8 content, venues, help and coach-team parent pages to Figma using only supported API data.

## Requirements

- Use the sole design authority `zZ6wKyOHKcO4UYXDd9jGwv`: P8 `93:388`, Venues `93:416`, P8.2 `93:444`, and Coach Team `93:472`.
- Implement only the four existing parent routes: content, venues, help, and coaches.
- Map content, FAQ, and venue cards from their live read-only API responses. Do not invent Figma sample titles, venue names, addresses, opening hours, usage counts, phone numbers, coach names, roles, tenure, goals, contact details, or unsupported actions.
- Coach-team data currently contains server-composed text; when a target, role, or contact is not explicit, show an unavailable state and keep the action disabled.
- WXML must use precomputed view models; no JavaScript array method calls in templates.
- Exclude API persistence/store/tests, project configuration, shared components, unrelated dirty files, and all backend changes.

## Acceptance Criteria

- [x] P8 content shows supported article data, filters, routes, and truthful empty/error states.
- [x] Venues maps supported venue data and only navigates when real coordinates exist.
- [x] P8.2 FAQ supports precomputed categories and expansion, with truthful empty/error states.
- [x] Coach team omits unsupported sample facts and contact actions.
- [x] RED tests precede implementation; package tests, typecheck, task validation, and diff check pass.

## Sub-batch record: P8 Content Center (2026-08-10)

- Completed: page-owned article presenter, real-category filtering, visible loading/error/empty states, and disabled unsupported search/article-detail actions.
- RED: four page tests failed against the previous no-state, sample-action implementation.
- GREEN: five focused tests; mini-program package 18 files / 86 tests; mini-program typecheck; diff check. Screenshot approval is waived by the project-wide goal and is not claimed.

## Sub-batch record: Venues (2026-08-10)

- Completed: truthful venue presenter, real tag filtering, loading/error/empty states, and map navigation gated by valid non-zero API coordinates.
- RED: four page tests failed against the previous no-state, unconditional-navigation implementation.
- GREEN: four focused tests; mini-program package 19 files / 90 tests; mini-program typecheck; diff check. Images, opening hours, and contact data remain absent because the API does not provide them.

## Sub-batch record: P8.2 Help Center (2026-08-10)

- Completed: FAQ-derived categories, precomputed expand/collapse state and dividers, plus truthful loading/error/empty states.
- RED: four page tests failed against the static categories and unsupported service placeholders.
- GREEN: four focused tests; mini-program package 20 files / 94 tests; mini-program typecheck; diff check. Search, phone, WeChat support, and human-service actions remain absent because no contract provides them.

## Sub-batch record: Coach Team (2026-08-10)

- Completed: a page-owned coach-team presenter using only team name, recognizable numeric counts, coach names, and supplied biographies, with loading/error/empty states.
- RED: four page tests failed against default team, fabricated roles/goals, and direct-contact actions.
- GREEN: four focused tests; mini-program package 21 files / 98 tests; mini-program typecheck; diff check. Roles, targets, tenure, contacts, and direct-contact actions remain unavailable because the API does not support reliable display of them.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

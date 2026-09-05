# Coach C1 schedule home Figma fidelity

## Goal

Bring the coach schedule home page back to the current online Figma structure and spacing while preserving the existing real API data, week navigation, and coach actions.

## Confirmed facts

- The only design authority is `zZ6wKyOHKcO4UYXDd9jGwv / 93:578 / C1 Coach Schedule Home`, a `375x812` frame.
- The online frame defines an `88px` top navigation, a `64px` Monday-to-Sunday date strip with previous/next arrows, a `76px` stats row, a `343x180px` hero at `x=16`, an activity-card list, and a `70px` coach tab bar.
- The current page is `apps/miniprogram-cq-talent/pages/coach/schedule/` and already reads the real `getCoachHome({ from, to })` contract.
- Existing runtime evidence is `tmp/goal-c1-coach-upcoming-after-hero-fix.png`; it shows real data, but its visual spacing and text density do not yet match the current C1 reference.

## Requirements

1. Update only the C1 page presentation and its regression tests; do not change API contracts, session/role behavior, production data, or unrelated dirty files.
2. Preserve real API-backed dates, coach/team names, event titles, venues, statuses, and next-action routes. Figma sample facts must not be hard-coded into view data.
3. Match the online C1 geometry and visual hierarchy: title/avatar placement, week arrows and seven-day strip, three statistic capsules, dark hero, activity-card rail, and coach TabBar.
4. Keep all WXML display values precomputed in TypeScript; no `.map()`, `.filter()`, `.slice()`, or `.indexOf()` calls in WXML.
5. Use TDD for each behavior/geometry change: add a failing focused assertion, observe RED, implement the smallest fix, then observe GREEN.

## Acceptance Criteria

- [x] Current online Figma node `93:578` has been re-read immediately before implementation and its `375x812` screenshot is retained as evidence.
- [x] C1 focused tests pass and assert corrected geometry without asserting Figma sample names or counts.
- [x] Full `npx --yes pnpm@10.33.0 run check` exits `0`.
- [x] WeChatIDE MCP opens `pages/coach/schedule/index` in a real coach session and produces fresh `375x812` PNG evidence; comparison distinguishes structural/style alignment from legitimate real-data differences.
- [x] The page code/tests plus C1 specification and progress log are path-limited, `git diff --check` clean, independently committed, and pushed to `origin/dev`.

## Scope decision

Recommended approach: make the smallest C1-only WXML/WXSS/view-model adjustments against the existing implementation and reuse `role-tabbar`. Replacing the page with a static Figma copy risks losing real navigation/data behavior; refactoring shared coach layout expands the diff beyond this independently verifiable batch.

## Open question

Confirm whether to execute the recommended C1-only visual-fidelity batch now.

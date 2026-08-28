# C1 Coach Schedule Home Design

## Boundary

This batch changes only the coach schedule home presentation in `apps/miniprogram-cq-talent/pages/coach/schedule/` and its focused tests. The existing `getCoachHome({ from, to })` contract, authentication, role routing, real event data, and production database remain unchanged.

## Design

- Keep the existing page/view-model behavior and seven-day navigation.
- Tune the page to Figma node `93:578`: 88px top nav, 64px week strip with visible arrows, 76px stats row, 343x180px dark hero, 96px activity cards, and the shared 70px coach TabBar.
- Use content-sized stat capsules with the Figma spacing and typography so real counts remain visible without copying Figma sample counts.
- Increase the hero time to the designed visual scale and distinguish the first red performance pill from the neutral weekly pills using CSS structure, not hard-coded data.
- Replace text chevrons in activity cards with the existing project SVG whose glyph matches the Figma reference; preserve explicit 20px visual dimensions.
- Keep the C1 top safe-area inset and menu-capsule avoidance supplied by the existing presentation helpers.

## Data and error handling

The page continues to show only API-backed coach/team/event/status/action data. Empty and error states remain unchanged. No new API fields, fallback names, sample dates, fake counts, or session behavior are introduced.

## Verification and rollback

Add focused static geometry assertions before each production change and observe RED. Run the focused C1 test, mini-program typecheck, full `check`, and WXML/WXSS compilation. Refresh the WeChatIDE simulator, capture C1 in a real coach session at `375x812`, compare against the fresh Figma screenshot, then commit only the C1 files and this task's records. Rollback is the single commit if visual evidence identifies a regression.

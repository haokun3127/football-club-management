# P4.3 Implementation Plan

1. Add failing view-model and template regression tests for the Figma section
   order, completed-only activity counts, four-row limit, and current-student
   card switch affordance.
2. Extend the TypeScript view model with period, student, ability, summary, and
   coach-note fields; keep API loading and retry behavior unchanged.
3. Replace the old student-chip/summary composition in WXML with the five
   Figma sections and remove inline JavaScript method usage.
4. Tune WXSS to the measured 375x812 geometry: 16px side margins, 16px card
   radii, 104/72/176/92/70px body cards, and an unobscured fixed TabBar.
5. Run focused tests, mini-program typecheck, WXML/WXSS compilation, and the
   full repository check.
6. Capture the route through WeChatIDE MCP, retain the screenshot and record
   the comparison result in progress documentation.
7. Stage only P4.3 files, run `git diff --check`, and create one independent
   commit. Do not include unrelated worktree changes.

# P1 parent month schedule V2 — implementation plan

### Task 1: Add month-grid regression coverage

**Files:**
- Create: `apps/miniprogram-cq-talent/pages/parent/schedule/month-v2.test.mjs`

- [x] Assert an August 2026 grid starts on Monday July 27 and ends on Sunday September 6 for the fixed six-row layout.
- [x] Assert real training and match events produce distinct markers and selected-date flags.
- [x] Assert the WXML uses month calendar bindings and month navigation rather than the old week switcher.
- [x] Run the focused test and observe RED before the final template adjustment.

### Task 2: Implement month data and interactions

**Files:**
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.wxml`
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.wxss`

- [x] Add month range/grid helpers and precompute all cell presentation fields.
- [x] Use the persisted selected child when loading and filtering events.
- [x] Replace week controls with month controls and connect date-cell selection.
- [x] Preserve existing real hero, activity-card, reminder, and TabBar routes.

### Task 3: Verify and record

**Files:**
- Modify: `docs/current/progress.md`

- [x] Run focused P1 tests, mini-program typecheck, full repository check, and `git diff --check`.
- [x] Record node `521:339`, implementation status, and screenshot evidence boundary.
- [x] Commit only the P1 task artifacts and progress entry; page source/test were already committed in `8c9c503`.

## Verification record — 2026-08-28

- Online Figma MCP confirmed `zZ6wKyOHKcO4UYXDd9jGwv / 521:339 / P1 Schedule Home — Month V2`, `375×812`.
- Focused Vitest: `16/16` passed after the top-navigation regression fix. Mini-program TypeScript check passed. WXML and WXSS compilation passed. Full repository gate passed: domain `20/20`, mini-program `391/391`, API `115/115`. `git diff --check` passed.
- The final WXML follows the online node's visible structure and retains only the right-side month arrow shown by the current Figma node. The previous-month behavior remains implemented in the page handler for future UI exposure without adding an unapproved visual control.
- A fresh WeChatIDE MCP screenshot was captured from `pages/parent/schedule/index` after establishing a real parent session: `tmp/goal-p1-parent-month-after-nav-fix.png`, returned at `563×1218`, an equal-scale raster for logical `375×812`. It shows the parent month grid, real event markers, selected date, empty activity state, reminder badge, and parent TabBar. The Figma sample's dates, activities, and summary values differ from the authenticated API response and are correctly treated as dynamic-data differences.
- The final visual review also fixed the real top-navigation drift: removed the extra bottom padding, restored flex-flow alignment, changed the title to the Figma `18px` equivalent (`36rpx`), and replaced the CSS hand-drawn bell with `/assets/icons/bell.svg` at the designed `32px` outer size. The fresh screenshot confirms the Hero starts at the designed content offset; no Figma write-back was required.

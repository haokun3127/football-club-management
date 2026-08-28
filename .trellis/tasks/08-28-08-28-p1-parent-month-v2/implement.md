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
- [x] Commit only the P1 page source/test, task artifacts, and progress entry.

## Verification record — 2026-08-28

- Online Figma MCP confirmed `zZ6wKyOHKcO4UYXDd9jGwv / 521:339 / P1 Schedule Home — Month V2`, `375×812`.
- Focused Vitest: `16/16` passed. Mini-program TypeScript check passed. WXML and WXSS compilation passed. Full repository gate passed: domain `20/20`, mini-program `391/391`, API `115/115`. `git diff --check` passed.
- The final WXML follows the online node's visible structure and retains only the right-side month arrow shown by the current Figma node. The previous-month behavior remains implemented in the page handler for future UI exposure without adding an unapproved visual control.
- A WeChatIDE MCP screenshot was successfully captured at `563×1218`, which is an equal-scale raster for logical `375×812`. The simulator was still holding a real coach session and rendered the old coach week schedule after the parent route request was guarded; this is runtime/session evidence only, not P1 visual acceptance. A fresh parent-role compile and screenshot remain required before marking the visual criterion complete.

# Parent Match History Implementation Plan

> **For agentic workers:** This plan is executed inline in the current workspace.

**Goal:** Add a real-data parent match-history page linked from growth, reusing existing calendar and match-detail contracts.

**Architecture:** The page reads the selected parent's active child and fetches the existing 180-day calendar in API-sized chunks. TypeScript projects match events into a WXML-safe view model; the page links each row to the existing match-detail route. No backend contract changes are needed.

**Tech Stack:** WeChat Mini Program, TypeScript, WXML, WXSS, Vitest, WeChatIDE MCP.

## Global Constraints

- Figma file `zZ6wKyOHKcO4UYXDd9jGwv` is the only design authority.
- Figma references are P4.2 `499:18` and P2.1 `93:170`; there is no independent match-history board.
- Do not add sample facts or mock API responses.
- Do not call `.map()`, `.filter()`, `.slice()`, or `.indexOf()` in WXML.
- Use path-limited git add; do not include unrelated dirty files.
- Visual acceptance requires a real WeChatIDE 375×812 screenshot.

### Task 1: Test the view-model behavior

**Files:**
- Create: `apps/miniprogram-cq-talent/pages/parent/match-history/index.test.mjs`

- [x] Write tests for selected-child filtering, descending date order, missing-score copy, and detail navigation.
- [x] Run the focused Vitest command and verify the new test fails because the page did not exist.

### Task 2: Implement the page and entry point

**Files:**
- Create: `apps/miniprogram-cq-talent/pages/parent/match-history/index.ts`
- Create: `apps/miniprogram-cq-talent/pages/parent/match-history/index.wxml`
- Create: `apps/miniprogram-cq-talent/pages/parent/match-history/index.wxss`
- Create: `apps/miniprogram-cq-talent/pages/parent/match-history/index.json`
- Modify: `apps/miniprogram-cq-talent/app.json`
- Modify: `apps/miniprogram-cq-talent/pages/parent/growth/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/parent/growth/index.wxml`

- [x] Add the page route and implement the real calendar-range loader.
- [x] Project only current-child match events into WXML-safe fields.
- [x] Render loading, ready, empty, and error states with full-screen navigation.
- [x] Add the growth-card action that opens the new route.

### Task 3: Verify and document

**Files:**
- Modify: `docs/current/progress.md`
- Modify: `.trellis/tasks/08-28-08-28-parent-match-history/implement.md`

- [x] Run focused tests, typecheck, WXML/WXSS compilation, full check, and diff check.
- [x] Capture a real 375×812 WeChatIDE screenshot.
- [x] Record evidence and limitations in progress and task docs.
- [x] Commit only the listed task files with `git add` path arguments.

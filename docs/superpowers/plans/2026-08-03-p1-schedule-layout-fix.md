# P1 Schedule Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the P1 parent schedule page's TabBar and status-chip geometry to the online Figma `P1 Schedule Home` frame at 375×812.

**Architecture:** Keep the existing WXML structure, PNG icon assets, role-specific active-state logic, and API/view-model data unchanged. Adjust only the shared `role-tabbar` geometry and P1 chip layout so the Figma 375×70 content layer is independent from the device safe-area extension and all status chips remain single-line.

**Tech Stack:** WeChat native mini-program WXML/WXSS, TypeScript, Vitest, pnpm.

## Global Constraints

- Online Figma file `ATlfBRO0ruOCDDY5ICagFD` is the only visual source of truth; target node is `93:83` (`P1 Schedule Home`). Its `TabIconsOverlay` remains a 375×70 outer layer; platform safe-area handling must not expand that visual layer.
- Preserve unrelated uncommitted work and do not change API, session, role, or route behavior.
- WXML must not use `.map()`, `.filter()`, `.slice()`, or `.indexOf()`.
- Visual completion requires a trustworthy 375×812 DevTools or real-device screenshot; static checks alone are not visual acceptance.

### Task 1: Restore Figma TabBar geometry

**Files:**
- Modify: `apps/miniprogram-cq-talent/components/role-tabbar/index.wxss`
- Test: `apps/miniprogram-cq-talent/components/role-tabbar/index.test.mjs`

- [x] Add assertions for the 70px outer layer, 56px tab items, 22px icons, 6px top offset, 31px label offset, and the active dot position.
- [x] Run the role-tabbar test and confirm the new assertions fail against the current centered/safe-area-included layout.
- [x] Implement the smallest WXSS change that matches the Figma measurements without changing the component manifest or navigation behavior.
- [x] Run the role-tabbar test, the mini-program test suite, typecheck, and `git diff --check`.

### Task 2: Keep P1 status chips on one line

**Files:**
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.wxss`
- Test: `apps/miniprogram-cq-talent/pages/parent/schedule/index.test.mjs`

- [x] Replace the old wrap-oriented assertions with single-line, fixed-height, non-shrinking chip assertions while preserving the responsive red date-chip width.
- [x] Run the P1 test and confirm it fails against the current wrapping rules.
- [x] Implement fixed 54rpx chip height, centered content, `white-space: nowrap`, and non-wrapping row behavior while preserving the existing green/yellow widths.
- [x] Run the P1 test, mini-program test suite, typecheck, and `git diff --check`.

### Task 3: Runtime visual verification

**Files:**
- No production files unless a verified runtime discrepancy remains.

- [ ] Build/reload the mini-program in the user's trusted DevTools session.
- [ ] Capture a raw 375×812 DevTools or real-device screenshot of the real parent P1 schedule.
- [ ] Compare the screenshot against Figma node `93:83`; report static, API, and visual evidence separately.

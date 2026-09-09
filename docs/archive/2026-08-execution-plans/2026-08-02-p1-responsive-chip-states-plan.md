# P1 Responsive Chip States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task, with Terra review between implementation and integration.

**Goal:** Make the parent schedule chip row display every dynamic label without truncation across common device widths, then synchronize the online P1 Figma source with the long-date and empty-schedule states.

**Architecture:** Keep the existing `selectedCountLabel` data contract and event handlers. Make only the dynamic red date chip content-sized and wrap-capable; preserve the existing green/yellow chip geometry, remove clipping from the shared chip rule, and allow the row height to grow on narrow screens. In the online Figma file, preserve the existing success-state frame and add clearly named P1 state variants for a long selected-date label and the empty Hero state.

**Tech Stack:** WeChat native mini-program WXML/WXSS, TypeScript, Vitest, online Figma at File Key `ATlfBRO0ruOCDDY5ICagFD`, P1 node `93:83`.

## Global Constraints

- Online Figma is the only design source; local `.fig` files are historical backups only.
- Preserve all unrelated uncommitted work in the current working tree; do not reset, checkout, stash, delete, or commit it.
- Do not change API, session, role, child-binding, request, or `index.json` contracts.
- WXML must not use `.map()`, `.filter()`, `.slice()`, or `.indexOf()`.
- A visual claim requires trusted WeChat DevTools or real-device `375x812` screenshots; tests and typecheck are not visual proof.
- The existing P1 Hero remains `686rpx × 360rpx` with its current dark layer, radius, and shadow.

---

### Task 1: Add the failing responsive chip regression

**Files:**
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.test.mjs`

**Interfaces:**
- Consumes: the current `index.wxss` source string already loaded by the schedule test.
- Produces: assertions that fail against the current fixed-width/ellipsis chip rules.

- [ ] **Step 1: Write the failing test**

Add a test that requires `.chips` to allow wrapping and no fixed row height, `.chip` to use normal wrapping with no clipping/ellipsis, and `.chip--red` to avoid a fixed width. Assert that `.chip--green` and `.chip--yellow` retain their approved fixed widths.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```powershell
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent exec vitest run pages/parent/schedule/index.test.mjs
```

Expected: the new responsive-chip test fails because the current CSS clips chip content, fixes the row height, and fixes the red chip at `128rpx`.

---

### Task 2: Implement responsive chip sizing

**Files:**
- Modify: `apps/miniprogram-cq-talent/pages/parent/schedule/index.wxss`
- Test: `apps/miniprogram-cq-talent/pages/parent/schedule/index.test.mjs`

**Interfaces:**
- Consumes: `selectedCountLabel`, `unreadCount`, and the existing three chip WXML nodes.
- Produces: a row that uses available width, keeps all chip text visible, and wraps rather than clipping on narrow screens.

- [ ] **Step 1: Replace the fixed chip rules with the minimal responsive rules**

Use this shape in the existing one-line style sheet:

```css
.chips { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 16rpx; min-height: 54rpx; height: auto; }
.chip { box-sizing: border-box; min-height: 54rpx; height: auto; padding: 12rpx 20rpx; border-radius: 999rpx; font-size: 24rpx; font-weight: 700; line-height: 30rpx; text-align: center; white-space: normal; word-break: break-all; overflow: visible; text-overflow: clip; }
.chip--red { width: auto; min-width: 0; max-width: 100%; }
.chip--red { background: #fee2e2; color: #a80f1b; }
.chip--green { background: #d1fae5; color: #065f46; }
.chip--yellow { background: #fef3c7; color: #92400e; }
```

Keep the existing `182rpx` green and `124rpx` yellow widths in their modifier rules. Do not change the WXML labels or introduce a new data/API field; the existing date-aware `selectedCountLabel` remains the source of truth.

- [ ] **Step 2: Run the focused test to verify GREEN**

Run:

```powershell
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent exec vitest run pages/parent/schedule/index.test.mjs
```

Expected: the schedule test file passes, including the new responsive chip assertions.

- [ ] **Step 3: Run package checks**

Run:

```powershell
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent test
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
git diff --check
```

Expected: all package tests pass, typecheck exits 0, and diff check reports no whitespace errors. Use the repository's Windows-safe command form:

```powershell
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent test
npx.cmd --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent typecheck
git diff --check
```

---

### Task 3: Synchronize online Figma P1 states

**Files/Surfaces:**
- Online Figma: `https://www.figma.com/design/ATlfBRO0ruOCDDY5ICagFD/`
- Page: `05 Parent Generated`
- Existing frame: `P1 Schedule Home`, node `93:83`

**Interfaces:**
- Consumes: the existing 375×812 P1 success-state frame and the approved responsive chip behavior.
- Produces: two clearly named state variants while preserving the original success state:
  - `P1 Schedule Home — Selected Date` showing `6月28日2节` fully inside a flexible chip row.
  - `P1 Schedule Home — Empty` keeping the same Hero footprint and showing the approved empty Hero copy without activity click affordance.

- [ ] **Step 1: Capture the original node `93:83` at 375×812 and record its URL/node ID before editing**
- [ ] **Step 2: Duplicate the existing P1 frame twice without changing the original**
- [ ] **Step 3: Rename the copies to the exact state names above and record both new node IDs**
- [ ] **Step 4: Update the selected-date copy and chip sizing in the first copy**
- [ ] **Step 5: Update the Hero copy and remove activity-only content/click affordance in the empty copy**
- [ ] **Step 6: Inspect both variants at 375×812 and capture screenshots**

Acceptance: the original success-state frame remains intact; the long selected-date label is fully visible; the empty Hero remains the same size and preserves the date/weekly statistics rhythm. Rollback is limited to deleting the two newly created state variants; do not edit node `93:83`.

---

### Task 4: Final review and progress record

**Files:**
- Modify: `docs/current/progress.md`

- [ ] **Step 1: Terra reviews the code diff, tests, and Figma screenshots**
- [ ] **Step 2: Run DevTools or real-device checks at logical widths 320, 375, and 414 for ready state, long-date state, and Empty Hero**
- [ ] **Step 3: Confirm the long red chip is complete or naturally wrapped with no clipping, overlap, or horizontal overflow; confirm green/yellow remain 182rpx/124rpx and Empty Hero remains 686rpx × 360rpx with `p1-empty-list`**
- [ ] **Step 4: Record separate status for static/type/test, Figma inspection, and DevTools/real-device visual evidence**
- [ ] **Step 5: Confirm only the approved files and Figma states changed; do not commit unrelated work**

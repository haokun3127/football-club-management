# Design: Coach Figma Full Restoration

## Scope and Source of Truth

The task covers the coach pages registered under `apps/miniprogram-cq-talent/pages/coach`. The online Figma file key `zZ6wKyOHKcO4UYXDd9jGwv` is authoritative. The exported screens are used only as immutable audit evidence; source code remains in the mini-program package.

## Delivery Shape

The restoration is intentionally split by information architecture rather than by shared CSS selector:

1. C1-C3 schedule and active-workbench shell.
2. C4-C9 attendance, lesson, match, tactical, training, and team.
3. C10-C15 content selection, test entry, radar, team ability, and assessments.
4. C16 profile, account, permissions, private interest, and help.

Each batch may touch the relevant page WXML/WXSS/TS/test files and shared primitives only when a repeated, Figma-proven rule cannot be kept local. No page is redesigned from an old local spec.

## Visual Comparison Contract

Every page is compared against its exact Figma node at logical width 375. Dynamic names, dates, attendance counts, and live scores are not required to equal Figma sample text; their card geometry, hierarchy, colors, spacing, clipping, top-bar safe area, tab bar, and control placement are.

For long designs, top, middle, and bottom viewport captures are used instead of scaling the entire document into 812px. Success, autosave, and correction screens count as separate visual states only when reached through real data or a persistent local draft; a hand-assembled route is diagnostic evidence, not a claimed workflow success.

## Safety Boundaries

- Current custom navigation remains responsible for status-bar and menu-capsule clearance.
- Real role and API responses remain the source of entitlement and content.
- WXML display lists stay precomputed in TypeScript.
- Every change has a test that is observed failing before the visual/behavior implementation changes it.

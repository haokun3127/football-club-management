# Design: Figma V2 Full Visual Regression

## Source of truth

> Current source override (2026-08-03): the only design authority is online Figma `https://www.figma.com/design/ATlfBRO0ruOCDDY5ICagFD/` (file key `ATlfBRO0ruOCDDY5ICagFD`). Before every visual change, read the relevant page, frame/node ID, and online screenshot. The local `.fig`, decoded inspection data, and prior audits below are historical references only and must not be used to infer or overwrite the current online design.

- `../02-Figma最新设计导出/重庆天才小程序 UIUX Design System.fig`
- Decoded inspection data: `../../../../tools/fig-out-v2.json`
- Audit baseline: `docs/figma-v2-visual-audit.md`

## Scope

Bring all parent P1-P10 and coach C1-C16 business frames and their designed state frames back to the latest Figma information architecture while preserving the existing BFF/API contracts and routes.

## Global rendering rules

1. Every page that renders `app-header` must declare `navigationStyle: custom`; no native navigation bar may coexist with it.
2. Figma Top Nav has a 375x88 layout envelope. The app-header owns status-bar space and must use one fixed total-height model; page-local custom navs must use `box-sizing: border-box` when applying `navInset`.
3. Bottom role tabbar uses Figma's 375x70 layer plus safe-area extension. Parent labels are `日程 / 成长 / 我的孩子`.
4. No system emoji may stand in for a Figma icon. Reuse existing bundled SVGs or add local icon assets compatible with WXML `image`.
5. Preserve API-derived content, but UI-specific summary values must be shaped in page TS rather than rendering arbitrary long raw fields in Figma-sized cells.

## Page remediation order

1. Global: navigation, tabbar, icon primitives.
2. Parent primary data surfaces: P5 radar, P6 metric, P7.1 status.
3. Parent main/detail/service surfaces: P1/P1.1/P2 variants/P3/P8/P9/P10.
4. Coach primary work surfaces: C1/C8/C10/C12/C13/C14/C16.
5. Coach state/detail pages: C2-C6, C11/C15, C16.1-C16.4.

## Verification

- Static WXML class-to-WXSS audit and WXSS brace audit after each batch.
- Run the smallest relevant package checks after each batch. Before reporting a repository-wide `pnpm check` result, reproduce and state the two known API fixture differences precisely: `apps/api/test/server.test.ts:688` (`not_started` expected, `in_progress` actual) and `apps/api/test/server.test.ts:1344` (data-capability preview-record assertion mismatch).
- Build/reload the mini-program and collect 375x812 developer-tool screenshots for each frame, comparing to the Figma export before declaring complete.

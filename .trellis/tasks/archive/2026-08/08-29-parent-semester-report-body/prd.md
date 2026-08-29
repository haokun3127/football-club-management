# Restore parent semester growth report body

## Goal

Restore the parent-facing semester growth report body to the current online Figma
board `zZ6wKyOHKcO4UYXDd9jGwv / 701:177 / P4.3 Semester Growth Report`, while
keeping the existing authenticated parent data flow and the shared growth TabBar.
The page should present a clear, compact report that can be verified at 375×812.

## Confirmed facts

- The current page is `apps/miniprogram-cq-talent/pages/parent/semester-report/`.
- The current implementation already loads `getParentChildren`, `getParentGrowth`,
  and a calendar range, and already supports child switching, back navigation,
  retry, and the parent `role-tabbar`.
- The current online Figma board contains: an 88px top nav; a 104px period card;
  a 72px dark student card; a 176px dark ability card with four progress rows;
  a 92px three-column summary card; a 70px coach-note card; and the growth-active
  parent TabBar at the bottom.
- Figma sample names, scores, counts, dates, and text are examples only. Runtime
  values must continue to come from the real API or explicit empty-state labels.
- The Figma WeChat capsule is platform-rendered and is not part of the page-body
  implementation contract.

## Requirements

1. Replace the current student-chip/summary/ability composition with the five
   Figma body sections in the same order and visual hierarchy.
2. Keep the current student-switching behavior, but express the active student in
   the dark student card rather than as a separate chip strip.
3. Render the period label and freshness text from view-model fields. If the API
   does not expose a named semester, use a truthful generic period label rather than
   copying the Figma sample `2026 夏季阶段`.
4. Show up to four valid ability dimensions from `GrowthSummary.radar`, with real
   values normalized to progress widths. Missing dimensions must not be fabricated;
   the card needs a truthful empty/partial state.
5. Keep training count, match count, attendance rate, and coach note truthful to the
   available API contract. Missing coach notes remain `暂无教练评语`.
6. Preserve the existing full-screen page, back button, retry/error handling, parent
   TabBar, safe-area reservation, and WXML restriction against inline JS methods.
7. Add focused regression coverage for view-model mapping and the required section
   ordering/classes. Verify WXML/WXSS compilation and a fresh 375×812 runtime
   screenshot after implementation.

## Acceptance Criteria

- [ ] Online Figma node `701:177` is read before implementation and its screenshot
      is retained as task evidence.
- [ ] The runtime page contains the period, student, ability, summary, and coach-note
      sections in the Figma order, with the growth TabBar visible and unobscured.
- [ ] Real child/growth/calendar data remains the source of displayed values; no
      Figma sample data or fake API/session values are introduced.
- [ ] Focused tests, mini-program TypeScript, WXML/WXSS compilation, and the full
      repository check pass.
- [ ] A fresh route-verified 375×812 WeChatIDE screenshot is visually compared with
      the online Figma screenshot; any remaining data/platform differences are
      explicitly recorded.
- [ ] The change is committed in a path-limited commit and progress documentation
      is updated.

## Out of scope

- Reworking the parent growth dashboard, radar detail page, API schema, production
  seed data, or the online Figma file itself.
- Adding new backend fields solely to reproduce static Figma sample values.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.

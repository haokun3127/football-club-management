# Parent Schedule Live Date Implementation Plan

1. Add API regressions for full Sunday inclusion, next-Monday exclusion, malformed/reversed/overlong dates, and retained guardian participant redaction; run them red.
2. Centralize date parsing and validation in the parent calendar route. Use an exclusive next-day bound for a date-only `to`; run the API regressions green.
3. Add mini-program tests with a frozen August 10, 2026 clock for parent schedule/day defaults, a disabled-by-default explicit development fixture override, Monday–Sunday query generation, and previous/next week requests; run them red.
4. Replace parent-page fixture defaults with the shared current-local-date helper; add previous/next week handlers and WXML controls using precomputed view-model fields; run the mini-program tests green.
5. Run targeted tests, type checks, then the full repository check. Commit API and mini-program slices separately.

## Closure Verification — 2026-08-28

- Latest Figma screenshot for `521:339` was re-read at `375×812`; it shows the current month-calendar structure and one right-side month arrow.
- API date-only range regression: `12` test files / `115` tests passed, including Sunday inclusion, next-Monday exclusion, malformed, reversed, excessive, and guardian-projected responses.
- Mini-program regression run: `66` test files / `405` tests passed, including the shared live-date helper and P1 Month V2 grid/marker bindings.
- No business-code changes were needed in this audit. The old week-specific acceptance items are superseded by the archived P1 Month V2 task and are not reopened.

# Parent Schedule Live Date Implementation Plan

1. Add API regressions for full Sunday inclusion, next-Monday exclusion, malformed/reversed/overlong dates, and retained guardian participant redaction; run them red.
2. Centralize date parsing and validation in the parent calendar route. Use an exclusive next-day bound for a date-only `to`; run the API regressions green.
3. Add mini-program tests with a frozen August 10, 2026 clock for parent schedule/day defaults, a disabled-by-default explicit development fixture override, Monday–Sunday query generation, and previous/next week requests; run them red.
4. Replace parent-page fixture defaults with the shared current-local-date helper; add previous/next week handlers and WXML controls using precomputed view-model fields; run the mini-program tests green.
5. Run targeted tests, type checks, then the full repository check. Commit API and mini-program slices separately.

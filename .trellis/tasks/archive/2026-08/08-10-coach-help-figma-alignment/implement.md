# Implementation: C16.4 Coach Help

1. Add focused tests that fail against the hard-coded page: one guarded API request, API-only mapping, local search/category/expansion, loading/empty/error/stale states, neutral icon use, no sample support facts, template safety, and page-owned interaction boundary.
2. Implement the page-local FAQ presenter and request-token guard. Replace static topics and text icons with direct exported assets.
3. Run the focused test, mini-program typecheck, package test, `task.py validate`, and `git diff --check`. Report any unrelated failures separately and do not claim screenshot validation.

## Evidence

- RED: the new focused test failed `4/4` on the old hard-coded topic page because it made no FAQ request and lacked the loading, stale-request, local-back, and direct-asset behavior.
- GREEN: focused test passed `4/4`; mini-program typecheck and package test passed `45 files / 221 tests`; task context validation and `git diff --check` passed.
- Static Figma repair: the FAQ header has a bottom divider and every non-final FAQ row has a bottom divider; the focused test locks a three-row sequence of `true, true, false`. Quick-start cards use a fixed `280rpx` width with a `24rpx` gap rather than a calculated width.
- No DevTools/device screenshot was taken, so this task makes no visual-runtime acceptance claim.

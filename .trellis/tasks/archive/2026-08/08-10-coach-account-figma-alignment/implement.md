# Implementation: C16.3 Coach Account

1. Add focused regression tests that fail on the existing account page: session-only name, frozen 30-day range, real/empty/failing/stale team states, non-coach zero request, non-interactive account rows, no unsupported samples, and local top-bar structure.
2. Replace the account page's data and presentation with the constrained session/team model. Keep `role-tabbar`; remove the unsupported app header and all page-owned write/logout actions.
3. Add the exact exported back icon from Figma node `93:1262`; do not hand-author an SVG.
4. Run the focused test, mini-program typecheck, package test, `task.py validate`, and `git diff --check`. Report existing unrelated failures separately and do not claim visual screenshot validation.

## Evidence

- RED: the new focused test failed on the old page because it used no range, used `home.coachName`, exposed raw failures, accepted stale results, and had no local back handler.
- GREEN: focused test passed `5/5`; mini-program typecheck and package test passed `44 files / 217 tests`; task context validation and `git diff --check` passed.
- No DevTools/device screenshot was taken, so this task makes no visual-runtime acceptance claim.

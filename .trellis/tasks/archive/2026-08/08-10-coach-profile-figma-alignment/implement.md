# C16 implementation

1. Inspect C16, session/home APIs and Figma node.
2. Add RED tests for role, frozen `today-29..today` range, session identity precedence/fallback, empty/error, stale success/failure, the four menu routes, logout cancel/single-flight confirmation, direct assets and template constraints.
3. Implement page-local view model and Figma structure with direct assets.
4. Run focused, typecheck, package tests and scoped diff check; independent review then separate code/archive commits.

## 2026-08-10 execution evidence

- RED: the new C16 focused suite failed against the prior page because it used the implicit coach-home date, surfaced upstream errors, lacked stale-request protection and confirmed logout, and had no direct C16 assets.
- GREEN: the focused C16 suite passes with session-first identity, frozen local `today-29..today` range coverage, safe current failure, stale success/failure protection, four existing routes, and confirm-only one-shot logout.
- Static verification: miniprogram typecheck and package tests pass. No device or simulator screenshot was taken, so this batch does not claim visual-runtime acceptance.

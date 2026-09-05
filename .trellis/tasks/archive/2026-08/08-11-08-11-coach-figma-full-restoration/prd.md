# Coach Figma Full Restoration

## Goal

Restore every coach-facing mini-program page to the current online Figma design in small, independently verifiable batches.

## Requirements

- The online Figma file `zZ6wKyOHKcO4UYXDd9jGwv` is the sole visual authority.
- Preserve real API data, role gates, and existing navigation semantics; visual work must not introduce fixture data, fake roles, or fake session state.
- Capture a 375x812 runtime screenshot and retain the matching Figma export for every coach page and documented design state.
- Fix the implementation in logical batches. Each batch must have a focused diff, affected-page tests, `git diff --check`, the relevant mini-program checks, and its own commit.
- Do not stage or alter the pre-existing user files listed in `docs/current/agent-handover-2026-08-09.md`.
- Do not use JavaScript array-method expressions in WXML.

## Acceptance Criteria

- [ ] All 25 registered coach pages have a recorded runtime screenshot and online-Figma node mapping.
- [ ] All 28 coach design states have a recorded Figma export, including correction, autosave, and success states.
- [ ] Each page is classified as visual pass, repaired-and-rechecked, data-blocked, or intentionally out of scope with a precise reason.
- [ ] Every repaired batch passes focused tests and the full project check before its commit.
- [ ] The final audit distinguishes static/test success from credible runtime visual comparison.

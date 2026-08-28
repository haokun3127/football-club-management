# C7 tactical board current Figma sync

## Goal

Synchronize the coach tactical-board mini-program page with the current online Figma node `233:2` while preserving the existing real API-backed tactical-board behavior.

## Requirements

- Online Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `233:2`, is the visual authority.
- At logical 375px width, render the white rounded header card, centered title/subtitle, `MATCH TACTICS` context, event title and saved-state pill, formation card, 351×430 green pitch, red 40px player circles, bench card, and reset/save actions.
- Keep real roster filtering, formation selection, player movement, substitute swapping, reset, save serialization, loading, empty, read-only, and error behavior.
- Render all display fields through TypeScript view models; WXML must not call `.map()`, `.filter()`, `.slice()`, `.indexOf()`, or similar JavaScript methods.
- Do not add fake players, fake API data, fake sessions, or a second navigation system. The tactical-board flow is a full-screen work surface and must not show the global role tabbar over the bottom actions.

## Acceptance criteria

- [x] C7 WXML contains the Figma sections and no invalid `wx:else`/`wx:for` combination.
- [x] C7 styles match the current node geometry and colors at logical 375px width.
- [x] All existing API-backed interactions remain covered by focused tests.
- [x] Focused tests, mini-program TypeScript check, and `git diff --check` pass.
- [x] Only C7 implementation/task records and the progress entry are committed.

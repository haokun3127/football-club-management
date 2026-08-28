# C7 tactical board current Figma sync design

## Boundary

Only the C7 page presentation and its focused tests change. The API contracts and tactical-board persistence remain untouched.

## View model

The existing `starters` and `substitutes` arrays remain the only WXML player inputs. TypeScript continues to derive short names, pixel positions, selection classes, and save labels. The pitch measurement remains dynamic so normalized positions continue to work across simulator widths.

## Layout

The page uses a 12px horizontal gutter. The header is a 351px rounded white card. Content follows the Figma vertical order: context, event/status, formation, pitch, bench, and two bottom actions. The global role tabbar is omitted because the Figma node treats this as a full-screen tactical work surface and the bottom action row occupies the navigation region.

## Interaction compatibility

Editable mode keeps `movable-view` for starters and tap-to-select/tap-to-swap for substitutes. Read-only mode keeps absolutely positioned static markers. Reset re-applies the selected formation; save uses the existing API and only clears dirty state after the server response is accepted.

## Rollback

Revert only the C7 page, focused test, page config, and progress entry if the focused tests or runtime compile fail. Do not touch unrelated dirty paths.

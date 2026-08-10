# Design: C15.1 Coach Assessment Submit

## Source and Scope

The only design source is `zZ6wKyOHKcO4UYXDd9jGwv / 93:1163 / C15.1 Assessment Submit`. The page reads only its route query and the existing authenticated-role guard. It makes no API request.

## Data Boundary

`assessment-entry` redirects here only after every selected submission resolves as HTTP 201. C15.1 validates the received route values again: `title` must decode to non-empty text and `count` must be a positive base-10 integer. It cannot infer or retrieve server results, therefore it uses neutral submitted/current-result wording and a locally calculated relative date.

## Navigation and Safety

- `requireRole("coach")` runs before interpreting the route; a non-coach issues no request and renders no success content.
- Invalid route values render a fixed safe empty state.
- `viewResults` opens the existing `/pages/coach/team-ability/index`; `backToList` uses one-level `wx.navigateBack({ delta: 1 })`.
- The page does not expose arbitrary error strings, session data, result records, or Figma sample facts.

## Visual Translation

Adapt the 375px Figma layout to WXML/WXSS: 176rpx local pink navigation, 44rpx horizontal content inset, 80rpx success mark, 12rpx summary card, 52rpx primary and 48rpx secondary actions, and the existing coach training tab bar. The checked asset, if added, must be the direct export from node 93:1163.

## Rollback

The batch is page-owned. Revert its dedicated commit after review; do not reset or overwrite unrelated worktree changes.

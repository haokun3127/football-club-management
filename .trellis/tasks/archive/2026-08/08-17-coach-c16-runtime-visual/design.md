# C16 coach profile visual alignment — design

## Authority and observation

- Authority: Figma `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1182`.
- The online node defines a `TopBar` with a fixed 88px height. Its content begins immediately after the top bar.
- The current C16 runtime baseline shows all page content displaced downward. Source inspection identifies one cause: `.c16-bar` has `height: 176rpx`, while WXML also applies the runtime `navInset` as top padding.

## Change boundary

Only the page-level top-bar geometry changes:

```css
.c16-bar {
  height: 88rpx;
  box-sizing: content-box;
  padding-left: 32rpx;
}
```

`content-box` intentionally keeps native top inset separate from the Figma content height. `menuInset` remains an inline right-padding override because it reserves space for the WeChat capsule.

## Preserved contracts

- `getCoachHome()` remains the source of real names, teams and summary counts.
- `switchToParent()` remains visible only for a service-confirmed dual-role coach.
- Existing `/pages/coach/{account,permissions,private-interest,help}/index` navigation remains unchanged.
- `logout()` remains the sole session-clearing operation.
- `role-tabbar` remains the existing tabbar implementation.

## Validation and rollback

The targeted source test proves the height and left-gutter contracts, then a real 375×812 screenshot proves the layout result. If the screenshot shows a capsule collision, restore only the `.c16-bar` declaration in this task's commit; do not alter unrelated navigation or live-data code. Run one root quality gate at a time: overlapping SQLite test workers can turn a clean suite into artificial reopen timeouts.

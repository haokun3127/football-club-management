# Design: C16.3 Coach Account

## Source and Boundary

The sole design reference is `zZ6wKyOHKcO4UYXDd9jGwv / 93:1262 / C16.3 Coach Account`. Its visual samples for a masked phone, a bound WeChat account, verification, editable profile data, password, devices, and cache have no corresponding read/write contract. The page must render these as non-interactive, honest pending or unavailable information rather than copying the samples.

## Data Flow

1. `requireRole("coach")` returns the actual session or performs the existing role-safe route handling. A missing/non-coach session causes no API request.
2. `session.displayName?.trim()` is the exclusive name source. A missing value becomes `姓名待同步`; no coach-name fallback is used.
3. One request-token-scoped `getCoachHome({ from, to })` uses a local frozen `today - 29` through `today` range. Team names are de-duplicated and rendered only when supplied by that response.
4. Empty teams show an honest no-team state. A current request error leaves session-derived profile information available and marks the team section `团队信息待同步`; stale success or failure is ignored.

## Interaction and Presentation

- Replace `app-header` with the page-owned 176rpx soft-pink local top bar and direct exported C16.3 chevron-left asset.
- `role-tabbar` stays registered and unchanged because it is part of the application navigation and the Figma screen includes it. Apart from that shared navigation, only the local back action may bind an event.
- The body uses 44rpx horizontal padding, 32rpx section spacing, and 24rpx cards. There are no account edits, retry, logout, cache clearing, or write affordances.

## Rollback

This page-only change is isolated in one later commit. Revert that commit if necessary; do not reset, clean, or overwrite unrelated worktree changes.

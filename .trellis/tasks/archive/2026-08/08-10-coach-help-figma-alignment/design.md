# Design: C16.4 Coach Help

## Source and Contract

The sole design source is `zZ6wKyOHKcO4UYXDd9jGwv / 93:1286 / C16.4 Coach Help`. The API exposes `ContentFaq { id, q, a, category }` through `getContentFaqs()`. It has no support-contact, support-hours, public-account, or online-consultation contract.

## Data and State

1. `requireRole("coach")` runs before loading. A missing/non-coach session returns without a FAQ request.
2. One initial request loads the FAQ list. A request token prevents older success or failure from overwriting later state.
3. A local presenter preserves only `id`, `q`, `a`, `category`, and local `open`/visibility properties. Categories are stable de-duplicated values from non-empty response categories, with `全部` as a non-factual local filter label.
4. Search, category selection, and FAQ expansion operate only on already loaded presenter data. No local action fetches or writes.
5. Load errors use fixed safe copy and leave no response-derived FAQ data. Empty data uses an honest empty state. The support card says `支持方式待配置` and has no event binding.

## Presentation

- Replace `app-header` with the local 176rpx soft-pink top bar and direct Figma chevron-left asset; retain `role-tabbar` unchanged.
- Use direct Figma search, question, and chevron assets. Every dynamic category uses the same neutral question asset, not the design's six semantic sample-topic assets.
- Use a 44rpx horizontal content inset, 40rpx top-level section spacing, and 24rpx cards. All values used in WXML are precomputed.

## Rollback

The resulting page-only commit is the rollback boundary. Revert that commit if necessary; do not reset, clean, or overwrite unrelated worktree changes.

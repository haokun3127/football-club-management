# C15 design

## Source and scope

The sole visual reference is Figma `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1132`. The target is `apps/miniprogram-cq-talent/pages/coach/assessment-entry/`. The page has an existing production data flow: form + coach team → view model → local draft / per-student submit. That flow remains unchanged.

## Visual structure

1. Content-box top navigation has a 44px (88rpx) content height, Figma soft-pink background, back icon/title on the left, and draft action on the right. Safe-area inset may add space above it, but must not double the navigation height.
2. Content uses 22px horizontal spacing at a 375px viewport: horizontally scrollable assessment groups, white rounded student cards, and compact metric rows.
3. Student presentation is derived from real members and active real form fields. The component expresses real field ranges through slider values; it must not inject Figma example values.
4. The online frame is 375×1002 rather than the stale 812px offline specification: its save action and coach tab bar follow the student list. `role-tabbar` therefore keeps its existing fixed default, but C15 opts into its controlled flowing variant so no control obscures the first runtime viewport.

## Risk and rollback

- The largest visual risk is safe-area duplication (`176rpx` nav plus inline `navInset`) that shifts all subsequent content; verify this in a real capture before changing CSS.
- WeChat native slider chrome cannot match the Figma 6px rail. Keep the native slider as the transparent input layer and render only its already-precomputed view-model progress as the visible track; do not replace the underlying input contract.
- All work is page-scoped. Revert only the C15 commit if required; do not touch unrelated working-tree files.

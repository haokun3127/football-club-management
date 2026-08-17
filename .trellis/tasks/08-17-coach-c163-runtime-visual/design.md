# C16.3 coach account — technical design

## Geometry contract

Figma’s `TopNav` has 16px/100px left-right paddings, a 24px back control, a flexible centered title, and a 24px right balancing element inside its 88px content area. Map it to the Mini Program using `32rpx` left, `200rpx` right, `48rpx` controls, `flex: 1`, and `text-align: center`. The WXML-provided `navInset` stays separate through `box-sizing: content-box`.

## Preserved data contract

`requireRole("coach")` owns the display name. `getCoachHome(recentThirtyDayRange(now))` provides real team names guarded by a per-page request token. Account capability/action data does not exist in this contract. The page must not convert Figma’s visual examples into write operations or fabricated values.

## Change boundary and rollback

Modify only `index.wxml`, `index.wxss`, and `index.test.mjs` for the navigation structure. A screenshot validates geometry; data differences do not license client-side mock data. Rollback reverts the page-local navigation change only.

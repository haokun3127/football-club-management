# C16.2 private interest — technical design

## Authority and boundary

The live Figma node `93:1238` is the geometry reference. Its top navigation is an 88px content region with a 16px left gutter. The Mini Program’s WXML adds the native status-area inset as inline top padding, so the page CSS must keep `content-box` and must not encode the status inset a second time.

## Data flow

`requireRole("coach")` → `session.capabilities.features.private_lessons` → `featurePageData()` → WXML copy and non-interactive state marker. No API call, storage read, or mutation belongs in this page until a real contract exists. The Figma grid is a configured sample, not permission to fabricate availability.

## Change boundary

The expected production change is page-local CSS plus its source-contract test:

```css
.c162-nav {
  height: 88rpx;
  box-sizing: content-box;
}
```

Existing 32rpx horizontal gutters, card structure, truthful feature-state copy, and `role-tabbar` remain unchanged unless the runtime comparison reveals another concrete geometry defect supported by the live node.

## Verification and rollback

Confirm route `pages/coach/private-interest/index` through the active Automator session, then capture via `apps/miniprogram-cq-talent/scripts/devtools-simulator-capture.py`. Roll back only the C16.2 page/test change if the top bar regresses; never alter production data to make the sample state appear.

# C16.1 permission scope — technical design

## Authority and observed mismatch

The live reference is Figma `zZ6wKyOHKcO4UYXDd9jGwv / 93:1210`. Its `TopNav` is a fixed 88px content region with a 16px left inset. The Mini Program adds `navInset` in WXML to reserve the real WeChat status/capsule region. With an additional `176rpx` CSS height, the header content is rendered one design bar too tall and pushes the body down.

## Change boundary

The production change is page-local CSS only:

```css
.c161-nav {
  height: 88rpx;
  box-sizing: content-box;
  padding-left: 32rpx;
}
```

The 32rpx gutter maps to the 16px Figma gutter in the project’s 750rpx logical-width convention. Existing right padding, title, back action, background, WXML `navInset`, and `role-tabbar` remain untouched.

## Data and behavior contract

`requireRole("coach")` is still the only session source. Its server-confirmed `capabilities.client.roleEntrypoints.coach` list is projected into the page’s existing fixed, neutral display order. An empty or unrecognized list produces the honest empty state. The Figma configured example is not a permission grant, so no rows, toggles, save CTA handlers, API calls, or local-storage mutations are introduced.

## Runtime verification and rollback

Navigate the manually opened DevTools session to the route, capture it through `apps/miniprogram-cq-talent/scripts/devtools-simulator-capture.py`, and check both PNG dimensions and the top-bar/body landmark positions. If the native capsule collides or the body regresses, restore only the three navigation declarations in the scoped work commit. A screenshot can establish geometry but cannot make the real unconfigured permission state equivalent to Figma’s configured sample.

# C14 team ability current Figma sync design

The change is page-local. The existing BFF response remains the source for team name, season, student count, dimensions, overall score, and trend. No new API or persistence contract is introduced.

The header uses the shared mini-program safe-area convention: a design-height `88rpx` content row with `navInset` added through padding, a 16px left gutter, a 24×32px back control, a left-aligned title, and a dynamic right inset for the WeChat menu capsule. The export control remains present but inert because no real export API exists.

The body keeps the Figma order: team context, dark radar hero, dimension statistics, ranking placeholder, and coach role tabbar. Real-data gaps stay explicit rather than being filled with the sample values visible in the design.

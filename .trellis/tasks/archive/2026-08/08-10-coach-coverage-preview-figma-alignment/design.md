# C10.1 Design

The page makes one read-only request to the existing coach coverage projection after `requireRole("coach")`. The projection is the data authority: its student list and dimension list are presented directly, with a page-owned normalizer producing display labels, safe bar state, and class names.

`scorePercent` is optional. A finite 0 through 100 value sets the bar width; `null` renders a pending state without a fabricated score or minimum-width bar. `covered` only changes the coverage state styling and never supplies a made-up percentage.

A request token protects the page against late success or failure overwriting the most recent load. The page uses a local 176rpx pink navigation and the existing coach role tab bar. The Figma sample's bottom confirmation is omitted because C10.1 has no selection or mutation contract.

Rollback is limited to this page and its focused test. No server or shared-layer behavior changes.

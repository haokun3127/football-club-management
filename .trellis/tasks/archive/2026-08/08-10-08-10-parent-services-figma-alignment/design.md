# Technical design

The four page-owned presenters convert supported API payloads into WXML-safe view data. Visual structures follow the four online Figma nodes, but no Figma sample is treated as a backend fact. Empty and unavailable states replace unsupported design fields.

Navigation uses existing routes. Venue map navigation is conditional on API coordinates. No shared components, backend contracts, or fixtures are changed.

# C13 student radar design

The C13 route stays a read-only projection.  Its TS controller already turns
authorized member/radar responses into a view model, and `radar-canvas` owns
the real geometry.  This batch is limited to Figma layout geometry: the page
local header must use an 88px content-box height after the safe-area inset,
while the existing 220×180 canvas and score remain inside the 260px hero.

Figma's displayed coach name and recommendation are examples with no C13 BFF
field.  The page continues to render the truthful unsynchronized-feedback
state instead.  No new API, storage or fixture data is introduced.

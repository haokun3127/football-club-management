# C2 technical design

The workbench controller already derives all action availability from a real
`CoachWorkbench` response and contains an allowlisted `openCoachRoot` helper.
The visual change remains page-local: C2 will use the helper for a Figma
three-tab strip immediately below the top navigation and remove its fixed
`role-tabbar` instance. This does not change other coach pages, whose Figma
nodes use the shared bottom navigation.

The top header is a content-box 88px envelope with status/menu insets. Its
left back/title composition and the right-side end label remain visual only:
there is no finish-session API, so the Figma sample command is not rendered
as an interactive or invented control. The existing real event type/title,
time, status and team/venue remain in the dark session card.

Actions stay dynamic and action-specific. The view model adds only display
metadata for a verified local SVG and makes the old coloured tone classes
unnecessary. WXML consumes the precomputed `icon` field; no array methods are
introduced in WXML. The grid remains three columns at 100px high per tile so
four-to-six real actions wrap as rows instead of intersecting.

Rollback is page-local: revert the C2 page/test files and restore the fixed
role tabbar use. No data, API, session, or shared navigation component changes.

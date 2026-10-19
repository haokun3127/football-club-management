# Design: C8 training management

The C8 hero maps four real values to the four Figma card slots. `completedTrainingCount` is derived on the server from completed events owned by the authenticated coach (or all completed events for an authorised admin), not inferred from a date-windowed client response. Attendance and member count continue to use the rolling coach-team BFF, and current-month matches continue to use coach-home.

The page keeps its current read-only event list projection and navigation. The visual change is page-local: 20px hero padding, 64px grid cards with 12px gutters, 22px list side insets, and 114px cards. It does not alter role-tabbar, session state, API persistence, or C10 training-content flows.

# C15.1 design

The online 375×812 C15.1 frame is a compact terminal page: an 88px soft-pink top navigation, centered success state, data-derived summary card, two action buttons, and the standard fixed 70px coach tab bar. The page is route-only; it must not request or invent assessment processing data.

The dynamic `navInset` is part of the 88px navigation envelope, so the content portion is 88rpx with `box-sizing: content-box`. The left icon and title share the online Figma's compact geometry. The fixed tab bar remains the default shared component because C15.1 is a true 812px frame, unlike C15's 1002px online long page.

Rollback is a single C15.1 page commit; shared role-tabbar behavior is out of scope.

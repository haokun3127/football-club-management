# Technical design — Coach C10/C10.1 restoration

## Boundary

Only the mini-program presentation layer changes. `utils/api.ts`, server routes, and domain contracts remain untouched. The existing controllers already form WXML-safe view models; they will be extended only with presentation fields that can be derived from returned data.

## C10 presentation

The page keeps its two concurrent reads and safe save/readback sequence. Its navigation becomes a shared-Figma-style soft-pink, content-box 88px page header: the title stays left aligned beside the back affordance and uses the existing menu inset for native capsule clearance. The body becomes the neutral page surface with Figma 16px/22px padding. Project descriptions remain available for search but are not rendered in the compact Figma card row. Card icon surface, metadata pill, unselected/selected affordance, compact row height, and bottom bar are presentation-only changes.

The selected summary remains derived from canonicalized project IDs and known durations. The primary label presents the dynamic selected count; disabled and submitting states remain visually distinct without inventing completion.

## C10.1 presentation

The coverage view keeps its single real GET. The Figma footer renders a summary derived from the unique returned dimensions that are actually covered. Its “确认” action is deliberately local-only (`wx.navigateBack`) because there is no matching BFF write; it does not save, mutate, or claim an API confirmation. The page's primary target is the card list: real students and all real dimensions are retained, each dimension uses the Figma 6px track and derives its fill color/width solely from `covered` and `scorePercent`.

The Figma example contains three dimension rows. Production data can have more; the card is intentionally vertically dynamic so no genuine dimension is hidden or mislabeled.

## Compatibility and rollback

No response schema changes occur. A rollback is a single revert of the C10/C10.1 mini-program commit. Existing role/error behavior remains a guard against accidental unauthenticated rendering.

## Verification

Focused Vitest tests assert both interaction invariants and source-level structural constraints. The full gate, typecheck, and whitespace check run before commit. Runtime screenshots will be attempted through the current DevTools automation session, but screenshot availability is not treated as a prerequisite for this user-authorized restoration phase.

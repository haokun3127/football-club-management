# Design: C7 tactical board Figma restoration

## Data boundary

The presentation receives only the existing coach tactical-board response. The acceptance seed owns demo coverage: it will select sixteen existing synthetic students in a fixed order, attach them to the coach demo team and six existing demo events, and create only explicitly prefixed demo metric records. The two parent-guardian bindings are unchanged.

## View-model boundary

`index.ts` remains responsible for converting persisted normalized board coordinates to pitch pixels and deriving short marker labels. The marker offset is changed from the legacy 24px radius to the Figma 20px radius. Board mutations continue to be held only as an unsaved local edit until the existing save endpoint confirms the result.

## Visual mapping

At 375 logical pixels, the screen content is 351px wide with 12px horizontal insets. The formation field is 48px high; the pitch is 351px by 430px with a 16px radius; its boundary is inset 12px and its halfway line is centred. The legacy centre circle and both penalty boxes are removed because node 233:2 does not contain them. Starter markers are 40px circles with white outline and short real name centred inside; names/position labels are not rendered below the marker. The bench is a white 86px card with 34px gray circular substitute chips. Reset/save actions are 48px high.

## Risks and rollback

The 16-player demo expansion is opt-in and deterministic. Tests must prove that parent projections still contain two children and that rollback removes only `metric-record-cq-talent-demo-*` rows. C7 does not change the save API schema; reverting the C7 UI commit restores the prior presentation while persisted boards remain readable.
